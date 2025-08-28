package com.yoloposeapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

class ModelLoaderModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    // JavaScript에서 이 모듈을 부를 때 사용할 이름
    override fun getName() = "ModelLoader"

    // JavaScript에서 호출할 함수. Promise를 통해 비동기적으로 결과를 전달.
    @ReactMethod
    fun combineModelFiles(promise: Promise) {
        // 네이티브 코드는 UI를 멈추게 할 수 있으므로 반드시 별도 스레드에서 실행
        CoroutineScope(Dispatchers.IO).launch {
            val modelName = "gemma-3n-E2B-it-int4.task"
            val finalModelFile = File(reactApplicationContext.filesDir, modelName)

            // 1. 이미 파일이 존재하면 경로 바로 반환
            if (finalModelFile.exists()) {
                promise.resolve(finalModelFile.absolutePath)
                return@launch
            }

            // 2. 파일 합치기
            try {
                val outputStream = FileOutputStream(finalModelFile)
                outputStream.use { out ->
                    // 분할된 파일들을 순서대로 읽기 (part1 ~ part3)
                    for (i in 1..3) {
                        val partFileName = "$modelName.part$i"
                        val inputStream: InputStream = reactApplicationContext.assets.open(partFileName)
                        inputStream.use { input ->
                            input.copyTo(out)
                        }
                    }
                }
                // 성공 시, 합쳐진 파일의 절대 경로를 JS로 전달
                promise.resolve(finalModelFile.absolutePath)
            } catch (e: Exception) {
                e.printStackTrace()
                // 실패 시, 만들어지던 파일 삭제
                if (finalModelFile.exists()) {
                    finalModelFile.delete()
                }
                // 실패 시, 에러를 JS로 전달
                promise.reject("MODEL_COMBINE_ERROR", e)
            }
        }
    }
}