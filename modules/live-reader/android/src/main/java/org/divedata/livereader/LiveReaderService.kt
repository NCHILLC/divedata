// Live mode's reader: a foreground service with a partial wake lock, a 30-second timer and a browser of its
// own. The browser belongs to the service, not the screen, because React Native holds the screen browser's
// commands and events while the app is off screen (docs/decisions/2026-11-21-background-reading.md).
package org.divedata.livereader

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import org.json.JSONTokener

class LiveReaderService : Service() {
  companion object {
    private const val CHANNEL = "live-meet"
    private const val NOTIFICATION_ID = 1
    private const val ACTION_STOP = "org.divedata.livereader.STOP"
    const val EXTRA_URL = "url"
    const val EXTRA_INTERVAL = "intervalSeconds"
    // docs/divemeets.md "Polite use": never faster than every 30 seconds in live mode.
    private const val MIN_INTERVAL_MS = 30_000L
    // A whole meet session fits; past it the service stops so a forgotten follow can't drain the battery.
    private const val MAX_RUN_MS = 4 * 60 * 60_000L
    // Read only: the page's title and HTML. It changes nothing on the page.
    private const val READ_PAGE_JS =
      "JSON.stringify({title: document.title || '', html: document.documentElement.outerHTML})"

    var onTick: (() -> Unit)? = null
    var onPage: ((String, String, Int) -> Unit)? = null
    var onFailed: ((String) -> Unit)? = null
    var onStopped: (() -> Unit)? = null
    var instance: LiveReaderService? = null
  }

  private val handler = Handler(Looper.getMainLooper())
  private var wakeLock: PowerManager.WakeLock? = null
  private var browser: WebView? = null
  private var intervalMs = MIN_INTERVAL_MS
  private var status = 200

  private val tick = object : Runnable {
    override fun run() {
      onTick?.invoke()
      handler.postDelayed(this, intervalMs)
    }
  }
  private val timeUp = Runnable { finish() }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      finish()
      return START_NOT_STICKY
    }
    val url = intent?.getStringExtra(EXTRA_URL) ?: return START_NOT_STICKY
    intervalMs = maxOf(MIN_INTERVAL_MS, (intent?.getIntExtra(EXTRA_INTERVAL, 30) ?: 30) * 1000L)

    // Every startForegroundService call must be answered with startForeground, even when already running.
    goForeground()
    if (instance == null) {
      wakeLock = (getSystemService(Context.POWER_SERVICE) as PowerManager)
        .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "divedata:livereader")
        .apply { acquire(MAX_RUN_MS) }
      handler.postDelayed(timeUp, MAX_RUN_MS)
      instance = this
    }
    // Following a new page restarts the timer, so the new page also waits a full interval between reads.
    handler.removeCallbacks(tick)
    (browser ?: openBrowser()).loadUrl(url)
    handler.postDelayed(tick, intervalMs)
    return START_NOT_STICKY
  }

  private fun goForeground() {
    if (Build.VERSION.SDK_INT >= 26) {
      getSystemService(NotificationManager::class.java).createNotificationChannel(
        NotificationChannel(CHANNEL, "Following a live event", NotificationManager.IMPORTANCE_LOW)
      )
    }
    val openApp = packageManager.getLaunchIntentForPackage(packageName)?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE)
    }
    val stop = PendingIntent.getService(
      this, 1, Intent(this, LiveReaderService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE
    )
    val notification = NotificationCompat.Builder(this, CHANNEL)
      .setSmallIcon(android.R.drawable.stat_notify_sync)
      .setContentTitle("Following a live event")
      .setContentText("DiveData checks the results every 30 seconds")
      .setOngoing(true)
      .setContentIntent(openApp)
      .addAction(0, "Stop", stop)
      .build()
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  @SuppressLint("SetJavaScriptEnabled")
  private fun openBrowser(): WebView {
    val web = WebView(this)
    web.settings.javaScriptEnabled = true
    web.settings.domStorageEnabled = true
    // The same cookie store as the screen's browser, so a check passed there counts here.
    CookieManager.getInstance().setAcceptCookie(true)
    CookieManager.getInstance().setAcceptThirdPartyCookies(web, true)
    // No window, so give it a phone-sized layout.
    web.measure(
      View.MeasureSpec.makeMeasureSpec(1080, View.MeasureSpec.EXACTLY),
      View.MeasureSpec.makeMeasureSpec(1920, View.MeasureSpec.EXACTLY)
    )
    web.layout(0, 0, 1080, 1920)
    web.webViewClient = object : WebViewClient() {
      override fun onPageStarted(view: WebView, url: String?, favicon: android.graphics.Bitmap?) {
        status = 200
      }

      override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, response: WebResourceResponse) {
        if (request.isForMainFrame) status = response.statusCode
      }

      override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
        if (request.isForMainFrame) onFailed?.invoke(error.description?.toString() ?: "code ${error.errorCode}")
      }

      override fun onPageFinished(view: WebView, url: String?) {
        val pageStatus = status
        view.evaluateJavascript(READ_PAGE_JS) { result ->
          val page = (JSONTokener(result ?: "null").nextValue() as? String)?.let { JSONObject(it) } ?: return@evaluateJavascript
          onPage?.invoke(page.optString("title"), page.optString("html"), pageStatus)
        }
      }
    }
    browser = web
    return web
  }

  fun reload() {
    browser?.reload()
  }

  /** Stops everything. Tells JavaScript, which ignores it when it asked for the stop itself. */
  fun finish() {
    if (instance == null) return
    instance = null
    handler.removeCallbacks(tick)
    handler.removeCallbacks(timeUp)
    browser?.destroy()
    browser = null
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
    onStopped?.invoke()
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  // Swiping the app away ends the follow: nothing is left to show the pages.
  override fun onTaskRemoved(rootIntent: Intent?) {
    finish()
    super.onTaskRemoved(rootIntent)
  }

  override fun onDestroy() {
    finish()
    super.onDestroy()
  }
}
