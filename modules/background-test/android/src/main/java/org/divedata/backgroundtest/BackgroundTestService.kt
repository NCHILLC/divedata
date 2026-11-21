// Throwaway: milestone 2 background test. Never merged.
// A foreground service with a partial wake lock and a native timer. Every tick is written to the
// log here, so the log shows the timer even if Android freezes the JavaScript side.
// The service also owns its own browser (a WebView with no window), so reads do not depend on the
// screen: React Native holds the screen browser's commands and events while the app is paused.
package org.divedata.backgroundtest

import android.annotation.SuppressLint
import android.app.Notification
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
import java.io.File

object TestLog {
  private fun file(context: Context) = File(context.filesDir, "background-test.log")

  @Synchronized
  fun append(context: Context, line: String) = file(context).appendText(line + "\n")

  @Synchronized
  fun read(context: Context): String = file(context).let { if (it.exists()) it.readText() else "" }

  @Synchronized
  fun clear(context: Context) {
    file(context).delete()
  }
}

class BackgroundTestService : Service() {
  companion object {
    const val CHANNEL_RUN = "background-test-run"
    const val CHANNEL_ALERT = "background-test-alerts"
    const val ACTION_STOP = "org.divedata.backgroundtest.STOP"
    const val EXTRA_INTERVAL = "intervalSeconds"
    const val EXTRA_MINUTES = "minutes"
    const val EXTRA_URL = "url"
    // Read only: the page's title and text. It changes nothing on the page.
    private const val READ_PAGE_JS =
      "JSON.stringify({title: document.title || '', text: document.body ? document.body.innerText : ''})"
    private const val RUN_NOTIFICATION_ID = 1

    var onTick: ((Int, Long) -> Unit)? = null
    var onFinished: ((String) -> Unit)? = null
    var onBrowserStep: ((String, String?) -> Unit)? = null
    var onBrowserPage: ((String) -> Unit)? = null
    var instance: BackgroundTestService? = null

    fun createChannels(context: Context) {
      if (Build.VERSION.SDK_INT < 26) return
      val manager = context.getSystemService(NotificationManager::class.java)
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_RUN, "Background test running", NotificationManager.IMPORTANCE_LOW)
      )
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ALERT, "Background test alerts", NotificationManager.IMPORTANCE_HIGH)
      )
    }

    fun openAppIntent(context: Context): PendingIntent? =
      context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
        PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE)
      }
  }

  private val handler = Handler(Looper.getMainLooper())
  private var wakeLock: PowerManager.WakeLock? = null
  private var running = false
  private var seq = 0
  private var intervalMs = 30_000L
  private var endAt = 0L
  private var browser: WebView? = null

  // Logged here too (parseLog drops this kind), so the shared log shows the browser even if events stall.
  private fun browserStep(step: String, detail: String? = null) {
    TestLog.append(
      this,
      JSONObject().put("kind", "native").put("at", System.currentTimeMillis()).put("step", step)
        .put("detail", detail ?: "").toString()
    )
    onBrowserStep?.invoke(step, detail)
  }

  @SuppressLint("SetJavaScriptEnabled")
  private fun openBrowser(url: String) {
    val web = WebView(this)
    web.settings.javaScriptEnabled = true
    web.settings.domStorageEnabled = true
    // The same cookie store as the screen's browser, so a check passed there counts here.
    CookieManager.getInstance().setAcceptCookie(true)
    CookieManager.getInstance().setAcceptThirdPartyCookies(web, true)
    // No window, so give it a phone-sized layout for the page's text.
    web.measure(
      View.MeasureSpec.makeMeasureSpec(1080, View.MeasureSpec.EXACTLY),
      View.MeasureSpec.makeMeasureSpec(1920, View.MeasureSpec.EXACTLY)
    )
    web.layout(0, 0, 1080, 1920)
    web.webViewClient = object : WebViewClient() {
      override fun onPageStarted(view: WebView, url: String?, favicon: android.graphics.Bitmap?) =
        browserStep("loadStart")

      override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, response: WebResourceResponse) {
        if (request.isForMainFrame) browserStep("httpError", response.statusCode.toString())
      }

      override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
        if (request.isForMainFrame) browserStep("error", error.description?.toString() ?: "code ${error.errorCode}")
      }

      override fun onPageFinished(view: WebView, url: String?) {
        browserStep("loadEnd")
        view.evaluateJavascript(READ_PAGE_JS) { result ->
          val data = (JSONTokener(result ?: "null").nextValue() as? String) ?: ""
          onBrowserPage?.invoke(data)
        }
      }
    }
    web.loadUrl(url)
    browser = web
  }

  fun reloadBrowser() {
    browserStep("reload")
    browser?.reload()
  }

  private fun closeBrowser() {
    browser?.destroy()
    browser = null
  }

  private val tick = object : Runnable {
    override fun run() {
      val now = System.currentTimeMillis()
      if (now >= endAt) {
        finish("done")
        return
      }
      seq++
      val screenOn = (getSystemService(Context.POWER_SERVICE) as PowerManager).isInteractive
      TestLog.append(
        this@BackgroundTestService,
        JSONObject().put("kind", "tick").put("seq", seq).put("nativeAt", now).put("screenOn", screenOn).toString()
      )
      onTick?.invoke(seq, now)
      handler.postDelayed(this, intervalMs)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      finish("stopped")
      return START_NOT_STICKY
    }
    if (running) return START_NOT_STICKY

    intervalMs = (intent?.getIntExtra(EXTRA_INTERVAL, 30) ?: 30) * 1000L
    val minutes = intent?.getIntExtra(EXTRA_MINUTES, 30) ?: 30
    val url = intent?.getStringExtra(EXTRA_URL) ?: ""

    createChannels(this)
    val stopIntent = PendingIntent.getService(
      this, 1, Intent(this, BackgroundTestService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE
    )
    val notification: Notification = NotificationCompat.Builder(this, CHANNEL_RUN)
      .setSmallIcon(android.R.drawable.stat_notify_sync)
      .setContentTitle("DiveData background test")
      .setContentText("Reading every ${intervalMs / 1000} seconds")
      .setOngoing(true)
      .setContentIntent(openAppIntent(this))
      .addAction(0, "Stop", stopIntent)
      .build()
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(RUN_NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(RUN_NOTIFICATION_ID, notification)
    }

    val power = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "divedata:backgroundtest").apply {
      acquire((minutes + 1) * 60_000L)
    }

    instance = this
    running = true
    seq = 0
    // Half an interval of slack so the last planned tick still fires despite small delays.
    endAt = System.currentTimeMillis() + minutes * 60_000L + intervalMs / 2
    openBrowser(url)
    handler.postDelayed(tick, intervalMs)
    return START_NOT_STICKY
  }

  fun finish(reason: String) {
    if (!running) return
    running = false
    handler.removeCallbacks(tick)
    closeBrowser()
    TestLog.append(
      this,
      JSONObject().put("kind", "stop").put("at", System.currentTimeMillis()).put("reason", reason).toString()
    )
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
    instance = null
    onFinished?.invoke(reason)
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  // These two lines are only in the shared log, so a run that ends early shows who ended it.
  private fun logApp(event: String) = TestLog.append(
    this, JSONObject().put("kind", "app").put("at", System.currentTimeMillis()).put("event", event).toString()
  )

  override fun onTaskRemoved(rootIntent: Intent?) {
    if (running) logApp("swipedAway")
    super.onTaskRemoved(rootIntent)
  }

  override fun onDestroy() {
    if (running) logApp("serviceDestroyed")
    handler.removeCallbacks(tick)
    closeBrowser()
    wakeLock?.let { if (it.isHeld) it.release() }
    instance = null
    super.onDestroy()
  }
}
