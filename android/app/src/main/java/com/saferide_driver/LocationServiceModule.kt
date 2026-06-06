package com.saferide_driver

import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LocationServiceModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "LocationService"

    @ReactMethod
    fun saveToken(token: String) {
        reactContext
            .getSharedPreferences("DriverPrefs", Context.MODE_PRIVATE)
            .edit()
            .putString("driverToken", token)
            .apply()
    }

    @ReactMethod
    fun startLocationService() {
        val intent = Intent(reactContext, LocationForegroundService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent)
        } else {
            reactContext.startService(intent)
        }
    }

    @ReactMethod
    fun stopLocationService() {
        reactContext.stopService(
            Intent(reactContext, LocationForegroundService::class.java)
        )
    }
}
