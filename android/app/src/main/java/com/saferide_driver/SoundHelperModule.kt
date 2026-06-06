package com.saferide_driver

import android.media.MediaPlayer
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SoundHelperModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    private var mediaPlayer: MediaPlayer? = null

    override fun getName(): String = "SoundHelper"

    @ReactMethod
    fun playNotificationSound() {
        stopNotificationSound()

        try {
            mediaPlayer = MediaPlayer.create(
                reactContext,
                R.raw.notification
            )?.apply {
                isLooping = true
                start()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun stopNotificationSound() {
        mediaPlayer?.apply {
            if (isPlaying) stop()
            release()
        }
        mediaPlayer = null
    }
}