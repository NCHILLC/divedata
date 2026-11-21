// Throwaway: milestone 2 background test. Never merged.
package org.divedata.backgroundtest

import android.app.ActivityManager
import android.app.ApplicationExitInfo
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private fun exitReasonName(reason: Int): String = when (reason) {
  ApplicationExitInfo.REASON_LOW_MEMORY -> "low memory"
  ApplicationExitInfo.REASON_FREEZER -> "frozen by Android"
  ApplicationExitInfo.REASON_EXCESSIVE_RESOURCE_USAGE -> "used too much battery or processor"
  ApplicationExitInfo.REASON_USER_REQUESTED -> "closed by the person (swiped away or force stopped)"
  ApplicationExitInfo.REASON_USER_STOPPED -> "stopped by the person"
  ApplicationExitInfo.REASON_SIGNALED -> "killed by Android"
  ApplicationExitInfo.REASON_OTHER -> "closed by Android (other)"
  ApplicationExitInfo.REASON_CRASH, ApplicationExitInfo.REASON_CRASH_NATIVE -> "crashed"
  ApplicationExitInfo.REASON_ANR -> "stopped responding"
  ApplicationExitInfo.REASON_EXIT_SELF -> "closed itself"
  ApplicationExitInfo.REASON_PACKAGE_UPDATED -> "app updated"
  else -> "reason code $reason"
}

class BackgroundTestModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var alertId = 100

  override fun definition() = ModuleDefinition {
    Name("BackgroundTest")

    Events("onTick", "onFinished", "onBrowserStep", "onBrowserPage")

    OnCreate {
      BackgroundTestService.onTick = { seq, at ->
        sendEvent("onTick", bundleOf("seq" to seq, "nativeAt" to at.toDouble()))
      }
      BackgroundTestService.onFinished = { reason ->
        sendEvent("onFinished", bundleOf("reason" to reason))
      }
      BackgroundTestService.onBrowserStep = { step, detail ->
        sendEvent("onBrowserStep", if (detail == null) bundleOf("step" to step) else bundleOf("step" to step, "detail" to detail))
      }
      BackgroundTestService.onBrowserPage = { data ->
        sendEvent("onBrowserPage", bundleOf("data" to data))
      }
    }

    OnDestroy {
      BackgroundTestService.onTick = null
      BackgroundTestService.onFinished = null
      BackgroundTestService.onBrowserStep = null
      BackgroundTestService.onBrowserPage = null
    }

    Function("start") { intervalSeconds: Int, minutes: Int, url: String ->
      val intent = Intent(context, BackgroundTestService::class.java)
        .putExtra(BackgroundTestService.EXTRA_INTERVAL, intervalSeconds)
        .putExtra(BackgroundTestService.EXTRA_MINUTES, minutes)
        .putExtra(BackgroundTestService.EXTRA_URL, url)
      ContextCompat.startForegroundService(context, intent)
    }

    Function("stop") { reason: String ->
      Handler(Looper.getMainLooper()).post { BackgroundTestService.instance?.finish(reason) }
    }

    // A plain main-thread post, not React Native's view queue, so it runs with the screen off.
    Function("browserReload") {
      Handler(Looper.getMainLooper()).post { BackgroundTestService.instance?.reloadBrowser() }
    }

    Function("isRunning") {
      BackgroundTestService.instance != null
    }

    Function("appendLog") { line: String ->
      TestLog.append(context, line)
    }

    AsyncFunction("readLog") {
      TestLog.read(context)
    }

    Function("clearLog") {
      TestLog.clear(context)
    }

    Function("notify") { title: String, body: String ->
      BackgroundTestService.createChannels(context)
      val notification = NotificationCompat.Builder(context, BackgroundTestService.CHANNEL_ALERT)
        .setSmallIcon(android.R.drawable.stat_notify_more)
        .setContentTitle(title)
        .setContentText(body)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setAutoCancel(true)
        .setContentIntent(BackgroundTestService.openAppIntent(context))
        .build()
      val manager = NotificationManagerCompat.from(context)
      if (manager.areNotificationsEnabled()) {
        try {
          manager.notify(alertId++, notification)
        } catch (_: SecurityException) {
          // Permission was taken away mid-run; the log already records alerts as off at the start.
        }
      }
    }

    Function("exitReasons") {
      if (Build.VERSION.SDK_INT < 30) {
        emptyList<Map<String, Any>>()
      } else {
        val activities = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        activities.getHistoricalProcessExitReasons(context.packageName, 0, 5).map {
          mapOf<String, Any>(
            "at" to it.timestamp.toDouble(),
            "reason" to exitReasonName(it.reason),
            "description" to (it.description ?: "")
          )
        }
      }
    }

    Function("phoneState") {
      val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      mapOf(
        "batteryOptimized" to !power.isIgnoringBatteryOptimizations(context.packageName),
        "powerSave" to power.isPowerSaveMode,
        "alertsOn" to NotificationManagerCompat.from(context).areNotificationsEnabled()
      )
    }
  }
}
