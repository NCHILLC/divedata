// Live mode's reader, seen from JavaScript: start, reload, stop, and the service's events.
package org.divedata.livereader

import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LiveReaderModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  // A plain main-thread post, not React Native's view queue, so it runs with the screen off.
  private val main = Handler(Looper.getMainLooper())

  override fun definition() = ModuleDefinition {
    Name("LiveReader")

    Events("onTick", "onPage", "onFailed", "onStopped")

    OnCreate {
      LiveReaderService.onTick = { sendEvent("onTick", bundleOf()) }
      LiveReaderService.onPage = { title, html, status ->
        sendEvent("onPage", bundleOf("title" to title, "html" to html, "status" to status))
      }
      LiveReaderService.onFailed = { reason -> sendEvent("onFailed", bundleOf("reason" to reason)) }
      LiveReaderService.onStopped = { sendEvent("onStopped", bundleOf()) }
    }

    OnDestroy {
      LiveReaderService.onTick = null
      LiveReaderService.onPage = null
      LiveReaderService.onFailed = null
      LiveReaderService.onStopped = null
      // JavaScript is gone, so nothing would read the pages.
      main.post { LiveReaderService.instance?.finish() }
    }

    // Starts the service, or points it at a new page. Android refuses while the app is off screen; that throws.
    Function("start") { url: String, intervalSeconds: Int ->
      val intent = Intent(context, LiveReaderService::class.java)
        .putExtra(LiveReaderService.EXTRA_URL, url)
        .putExtra(LiveReaderService.EXTRA_INTERVAL, intervalSeconds)
      ContextCompat.startForegroundService(context, intent)
    }

    Function("reload") {
      main.post { LiveReaderService.instance?.reload() }
    }

    Function("stop") {
      main.post { LiveReaderService.instance?.finish() }
    }
  }
}
