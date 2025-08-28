# Tugboat-Sample

사용자의 전면 카메라를 통해 실시간으로 얼굴 및 신체 데이터를 수집하고, 모델을 통해 **학습, 주의 산만, 멍때림, 조는 상태** 등 4가지 행동을 예측하고 분류하는 React Native 모바일 애플리케이션입니다.

---

## 💻 주요 기술 스택

- **프레임워크**: `React Native`
- **카메라**: `React Native VisionCamera`
- **AI 모델 실행**: `onnxruntime-react-native`
- **데이터 전처리**: `MediaPipe` (네이티브 모듈 연동)
- **AI 모델**:
  - `fsanet_ens.onnx`: 머리 자세 추정 (Head Pose Estimation)
  - `xgboost_50frame_250818.onnx`: 최종 행동 분류

---

## 🛠️ 설치 및 실행 방법

### 1. 소스 코드 클론

```bash
git clone https://github.com/daekyocnslab/tugboat-sample.git
cd tugboat-sample
```

### 2. JavaScript 라이브러리 설치

`package.json` 파일에 명시된 모든 종속성을 설치합니다.

```bash
yarn
```

### 3. 네이티브 소스 코드 복사

> **⚠️ 중요: 네이티브 코드 수동 복사**
>
> 이 프로젝트는 `react-native-mediapipe`의 커스텀 네이티브 코드를 사용하므로, 아래 절차에 따라 수동으로 파일을 복사해야 정상적으로 빌드됩니다.
>
> 1.  별도의 위치에 `react-native-mediapipe` 저장소를 클론합니다.
> 2.  해당 저장소의 아래 두 폴더에 있는 모든 `.java` 파일들을 복사합니다.
>     - `android/src/main/java/com/reactnativemediapipe/facelandmarkdetection/`
>     - `android/src/main/java/com/reactnativemediapipe/posedetection/`
> 3.  현재 `tugboat-sample` 프로젝트 내의 동일한 경로에 붙여넣기하여 기존 파일들을 덮어씁니다.
>     - **대상 경로**: `[tugboat-sample]/node_modules/react-native-mediapipe/android/src/main/java/com/reactnativemediapipe/...`

### 4. 애플리케이션 실행

먼저 React Native 개발 서버인 Metro를 실행합니다.

```bash
yarn start
```

그 다음, 새 터미널을 열어 안드로이드 앱을 빌드하고 실행합니다.

```bash
yarn android
```

---

## ⚙️ 프로그램 상세 실행 순서

### 1단계: 초기화 및 설정

앱이 시작되면, 실시간 분석에 필요한 모든 구성 요소를 초기화합니다.

- **권한 요청**: `useCameraPermission` 훅을 사용하여 사용자에게 카메라 사용 권한을 요청합니다.
- **카메라 활성화**: `useCameraDevice('front')`를 통해 전면 카메라를 선택하고, `<Camera>` 컴포넌트를 활성화합니다.
- **AI 모델 로딩**: `onnxruntime-react-native`를 사용하여 `fsanet_ens.onnx`와 `xgboost_50frame_250818.onnx` 모델을 비동기적으로 로드합니다.
- **MediaPipe 감지기 생성**: 네이티브 함수를 호출하여 얼굴 및 포즈 감지기를 생성하고, 이벤트 리스너를 등록합니다.

### 2단계: 실시간 프레임 처리 및 데이터 수집

초기화가 완료되면, 카메라는 **50개 프레임(약 10초)** 단위로 데이터를 수집하는 사이클을 반복합니다.

- **프레임 프로세서**:
  - 카메라 프레임은 UI 멈춤 현상을 방지하기 위해 별도의 **고성능 스레드(Worklet)** 에서 처리됩니다.
  - `200ms` 간격으로 프레임을 네이티브 MediaPipe 모듈로 전송하여 1차 데이터를 추출합니다.
- **데이터 수신 및 축적**:
  - **핵심 로직**: 프레임마다 예측하는 대신, **50개**의 프레임 데이터를 모아 한 번에 처리하는 **일괄 처리(Batch Processing)** 방식을 사용합니다.
  - `onFaceResults` 함수가 얼굴 랜드마크, EAR/MAR 값, Base64 인코딩 이미지 데이터를 `collectedData` 배열에 순차적으로 저장합니다.
  - `onPoseResults` 함수는 마지막 프레임 데이터에 포즈 정보를 업데이트합니다.
  - UI에는 `데이터 수집 중: N/50` 형태로 진행 상황이 표시됩니다.

### 3단계: 일괄 처리(Batch Processing) 및 최종 예측

50개 프레임 데이터 수집이 완료되면, 프레임 처리를 잠시 멈추고 본격적인 분석을 시작합니다.

- **머리 자세 추정 (FSANet)**:
  - 수집된 50개의 Base64 이미지 데이터를 디코딩하여 `Float32Array` 텐서로 변환합니다.
  - FSANet 모델을 실행하여 각 프레임의 `yaw`, `pitch`, `roll` 값을 계산하고 `collectedData`에 업데이트합니다.
- **특징 공학 (Feature Engineering)**:
  - 50프레임 동안의 모든 시계열 데이터를 바탕으로 통계적 특징을 요약하여 **단 하나의 특징 벡터(22개 숫자 배열)** 를 생성합니다.
  - **주요 특징 예시**:
    - `yaw_minmax`: 머리 좌우 움직임의 최대 변화량
    - `pitch_mean`: 머리 상하 움직임의 평균 각도
    - `mar_yawn_count`: 입 벌림(MAR) 기반 하품 횟수
    - `face_dist_mean_abs_diff`: 얼굴 중심점의 평균 이동 거리
- **최종 행동 예측 (XGBoost)**:
  - 생성된 특징 벡터를 XGBoost 모델에 입력하여 최종적으로 **'Study', 'Distraction', 'Spacing out', 'Sleep'** 중 하나로 분류하고 확률을 출력합니다.
- **초기화**:
  - 예측 완료 후 모든 데이터 배열을 비우고, 다음 데이터 수집 사이클을 시작합니다.

### 4단계: UI 및 상태 관리

- `processingState`: '데이터 수집 중', '추론 중' 등 현재 앱의 상태를 관리하여 사용자에게 시각적 피드백을 제공합니다.
- `currentPrediction`: 최종 예측 결과를 저장하고 화면에 렌더링합니다.
- `debugText`, `errorText`: 처리 과정에서 발생하는 오류나 디버깅 정보를 표시합니다.
