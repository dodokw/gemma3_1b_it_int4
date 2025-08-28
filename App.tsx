import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';

const { ModelLoader, ModelInference } = NativeModules;

const App = () => {
  const [modelPath, setModelPath] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    prepareAndLoadModel();
  }, []);

  const prepareAndLoadModel = async () => {
    try {
      setIsLoading(true);
      console.log('모델 파일 합치기를 시작합니다...');

      // 1. 모델 파일 합치기
      // const path = await ModelLoader.combineModelFiles();
      // console.log('✅ 모델 파일 합치기 완료! 경로:', path);
      // setModelPath(path);
      // gemma3-1b-it-int4.task
      const modelFilename = 'gemma3-1b-it-int4.task';
      let modelPath: string;
      if (Platform.OS === 'android') {
        const modelDestPath = `${RNFS.DocumentDirectoryPath}/${modelFilename}`;
        if (!(await RNFS.existsAssets(modelFilename))) {
          throw new Error(
            `모델 파일(${modelFilename})이 Android assets 폴더에 없습니다.`,
          );
        }

        if (!(await RNFS.exists(modelDestPath))) {
          // setDebugText('모델을 assets에서 내부 저장소로 복사합니다...');
          console.log('모델 복사');
          await RNFS.copyFileAssets(modelFilename, modelDestPath);
          // setDebugText('모델 복사 완료.');
          console.log('모델 복사 완료');
        }
        modelPath = modelDestPath;
      } else {
        modelPath = `${RNFS.MainBundlePath}/${modelFilename}`;
      }

      // 2. 모델 로드
      if (modelPath) {
        console.log('모델 로딩을 시작합니다...');
        const loadResult = await ModelInference.loadModel(modelPath);
        console.log('✅ 모델 로딩 완료!', loadResult);
        setIsModelLoaded(true);
      } else {
        throw new Error('something going wrong');
      }
    } catch (e) {
      console.error('❌ 모델 준비/로딩 실패:', e);
      setError(
        '모델을 준비하는 데 실패했습니다. 저장 공간을 확인하고 앱을 다시 시작해주세요.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const generateText = async () => {
    if (!inputText.trim()) {
      Alert.alert('알림', '텍스트를 입력해주세요.');
      return;
    }

    try {
      setIsGenerating(true);
      setGeneratedText('');

      console.log('텍스트 생성 시작:', inputText);
      const result = await ModelInference.generateText(inputText); // 최대 100토큰

      console.log('✅ 텍스트 생성 완료:', result);

      if (result?.text) {
        setGeneratedText(result.text);

        // 히스토리에 추가
        const newEntry = {
          id: Date.now(),
          input: inputText,
          output: result.text,
          timestamp: new Date().toLocaleTimeString(),
        };
        setHistory(prev => [newEntry, ...prev]);

        setInputText(''); // 입력 필드 초기화
      } else {
        Alert.alert('오류', '텍스트 생성에 실패했습니다.');
      }
    } catch (e) {
      console.error('❌ 텍스트 생성 실패:', e);
      Alert.alert('오류', `텍스트 생성 실패: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const unloadModel = async () => {
    try {
      await ModelInference.unloadModel();
      setIsModelLoaded(false);
      console.log('모델 언로드 완료');
    } catch (e) {
      console.error('모델 언로드 실패:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Gemma 텍스트 생성</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.statusText}>
              모델을 준비 중입니다...
              {'\n'}
              (최초 실행 시 시간이 걸릴 수 있습니다)
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={prepareAndLoadModel}
            >
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : isModelLoaded ? (
          <View style={styles.mainContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>입력 텍스트:</Text>
              <TextInput
                style={styles.textInput}
                multiline
                placeholder="생성할 텍스트의 시작 부분을 입력하세요..."
                value={inputText}
                onChangeText={setInputText}
                editable={!isGenerating}
              />

              <TouchableOpacity
                style={[
                  styles.generateButton,
                  isGenerating && styles.generateButtonDisabled,
                ]}
                onPress={generateText}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.generateButtonText}>텍스트 생성</Text>
                )}
              </TouchableOpacity>
            </View>

            {generatedText ? (
              <View style={styles.outputContainer}>
                <Text style={styles.label}>생성된 텍스트:</Text>
                <View style={styles.outputBox}>
                  <Text style={styles.outputText}>{generatedText}</Text>
                </View>
              </View>
            ) : null}

            {history.length > 0 && (
              <View style={styles.historyContainer}>
                <Text style={styles.label}>생성 히스토리:</Text>
                {history.slice(0, 5).map(entry => (
                  <View key={entry.id} style={styles.historyEntry}>
                    <Text style={styles.historyTime}>{entry.timestamp}</Text>
                    <Text style={styles.historyInput}>입력: {entry.input}</Text>
                    <Text style={styles.historyOutput}>
                      출력: {entry.output}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.controlButtons}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={unloadModel}
              >
                <Text style={styles.controlButtonText}>모델 언로드</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.statusText}>모델 로딩 대기 중...</Text>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            모델 상태: {isModelLoaded ? '✅ 로드됨' : '❌ 로드되지 않음'}
            {modelPath && `\n경로: ${modelPath}`}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: 'red',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 12,
  },
  generateButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  generateButtonDisabled: {
    backgroundColor: '#999',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  outputContainer: {
    marginBottom: 20,
  },
  outputBox: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
  },
  outputText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  historyContainer: {
    marginBottom: 20,
  },
  historyEntry: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  historyTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  historyInput: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontWeight: '500',
  },
  historyOutput: {
    fontSize: 14,
    color: '#555',
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  controlButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
    marginBottom: 20,
  },
  infoContainer: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default App;
