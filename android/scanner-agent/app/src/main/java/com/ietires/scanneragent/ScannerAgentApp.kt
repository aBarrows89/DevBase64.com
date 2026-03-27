package com.ietires.scanneragent

import android.app.Application
import android.content.Intent
import android.os.Build
import android.util.Log

class ScannerAgentApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Log.i(MqttService.TAG, "Scanner Agent app started")

        // Start the MQTT service
        val intent = Intent(this, MqttService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }
}
