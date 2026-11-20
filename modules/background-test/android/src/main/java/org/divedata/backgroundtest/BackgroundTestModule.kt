// Throwaway: milestone 2 background test. Never merged.
package org.divedata.backgroundtest

import android.content.Context
import android.content.Intent
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

class BackgroundTestModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var alertId = 100

  override fun definition() = ModuleDefinition {
    Name("BackgroundTest")

    Events("onTick", "onFinished")

    OnCreate {
      BackgroundTestService.onTick = { seq, at ->
        sendEvent("onTick", bundleOf("seq" to seq, "nativeAt" to at.toDouble()))
      }
      BackgroundTestService.onFinished = { reason ->
        sendEvent("onFinished", bundleOf("reason" to reason))
      }
    }

    OnDestroy {
      BackgroundTestService.onTick = null
      BackgroundTestService.onFinished = null
    }

    Function("start") { intervalSeconds: Int, minutes: Int ->
      val intent = Intent(context, BackgroundTestService::class.java)
        .putExtra(BackgroundTestService.EXTRA_INTERVAL, intervalSeconds)
        .putExtra(BackgroundTestService.EXTRA_MINUTES, minutes)
      ContextCompat.startForegroundService(context, intent)
    }

    Function("stop") { reason: String ->
      Handler(Looper.getMainLooper()).post { BackgroundTestService.instance?.finish(reason) }
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
