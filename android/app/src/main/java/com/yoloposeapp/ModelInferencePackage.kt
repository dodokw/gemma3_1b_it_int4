// 파일 경로: android/app/src/main/java/com/yoloposeapp/ModelInferencePackage.kt
package com.yoloposeapp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ModelInferencePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        // listOf()를 사용하여 더 간결하게 리스트를 생성합니다.
        return listOf(ModelInferenceModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        // 빈 리스트를 반환합니다.
        return emptyList()
    }
}
