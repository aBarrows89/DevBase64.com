package com.ietires.scanneragent

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Device admin receiver for lock/wipe capabilities.
 * Must be activated during scanner setup via:
 * adb shell dpm set-active-admin com.ietires.scanneragent/.DeviceAdminReceiver
 */
class DeviceAdminReceiver : DeviceAdminReceiver() {
    override fun onEnabled(context: Context, intent: Intent) {
        Log.i(MqttService.TAG, "Device admin enabled")
    }

    override fun onDisabled(context: Context, intent: Intent) {
        Log.w(MqttService.TAG, "Device admin disabled")
    }
}
