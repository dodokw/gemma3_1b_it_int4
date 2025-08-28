package com.yoloposeapp

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
// BaseOptions import는 이제 필요 없습니다.
// import com.google.mediapipe.tasks.core.BaseOptions 
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import com.google.mediapipe.tasks.genai.llminference.LlmInference.LlmInferenceOptions
import java.io.File
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class ModelInferenceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    // companion object를 사용하여 TAG와 MODULE_NAME을 정적 멤버처럼 관리합니다.
    companion object {
        private const val TAG = "ModelInferenceModule"
        private const val MODULE_NAME = "ModelInference"
    }

    // var?는 null이 될 수 있는 변수를 의미합니다.
    private var llmInference: LlmInference? = null
    private val executorService: ExecutorService = Executors.newSingleThreadExecutor()

    override fun getName(): String {
        return MODULE_NAME
    }

    @ReactMethod
    fun loadModel(modelPath: String, promise: Promise) {
        executorService.execute {
            try {
                Log.d(TAG, "모델 로딩 시작: $modelPath")
                val modelFile = File(modelPath)
                if (!modelFile.exists()) {
                    promise.reject("MODEL_NOT_FOUND", "모델 파일을 찾을 수 없습니다: $modelPath")
                    return@execute
                }

                // LlmInference 옵션 설정 (수정된 부분)
                val options = LlmInferenceOptions.builder()
                    .setModelPath(modelPath) // setBaseOptions 대신 setModelPath를 직접 사용합니다.
                    .setMaxTokens(1024) // 최대 생성 토큰 수
                    .build()

                // LlmInference 인스턴스 생성
                llmInference = LlmInference.createFromOptions(reactApplicationContext, options)

                Log.d(TAG, "모델 로딩 완료")
                promise.resolve("모델이 성공적으로 로드되었습니다.")

            } catch (e: Exception) {
                Log.e(TAG, "모델 로딩 실패", e)
                promise.reject("MODEL_LOAD_ERROR", "모델 로딩 실패: ${e.message}")
            }
        }
    }

    @ReactMethod
    fun generateText(inputText: String, promise: Promise) {
        // llmInference가 null일 경우를 안전하게 처리합니다.
        val inferenceInstance = llmInference
        if (inferenceInstance == null) {
            promise.reject("MODEL_NOT_LOADED", "모델이 로드되지 않았습니다")
            return
        }

        executorService.execute {
            try {
                Log.d(TAG, "텍스트 생성 시작: $inputText")
                val startTime = System.currentTimeMillis()

                // 텍스트 생성
                val generatedText = inferenceInstance.generateResponse(inputText)

                val endTime = System.currentTimeMillis()
                Log.d(TAG, "텍스트 생성 완료. 소요 시간: ${endTime - startTime}ms")

                val result = Arguments.createMap().apply {
                    putString("text", generatedText)
                    putInt("inferenceTimeMs", (endTime - startTime).toInt())
                }
                promise.resolve(result)

            } catch (e: Exception) {
                Log.e(TAG, "텍스트 생성 실패", e)
                promise.reject("GENERATION_ERROR", "텍스트 생성 실패: ${e.message}")
            }
        }
    }

    @ReactMethod
    fun unloadModel(promise: Promise) {
        executorService.execute {
            try {
                // let을 사용하여 null-safe하게 close를 호출합니다.
                llmInference?.close()
                llmInference = null
                Log.d(TAG, "모델 언로드 완료")
                promise.resolve("모델이 성공적으로 언로드되었습니다.")
            } catch (e: Exception) {
                Log.e(TAG, "모델 언로드 실패", e)
                promise.reject("UNLOAD_ERROR", "모델 언로드 실패: ${e.message}")
            }
        }
    }

    override fun invalidate() {
        super.invalidate()
        if (!executorService.isShutdown) {
            executorService.shutdown()
        }
        llmInference?.close()
        llmInference = null
    }
}