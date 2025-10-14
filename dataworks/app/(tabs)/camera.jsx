import React, { useRef, useState } from 'react';
import { View, Text, Button, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function AppCamera() {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState(null);
  const [facing, setFacing] = useState('back');

  if (!permission) return <Centered><Text>Requesting camera permission…</Text></Centered>;
  if (!permission.granted) {
    return (
      <Centered>
        <Text style={{ marginBottom: 12 }}>We need your permission to use the camera</Text>
        <Button title="Grant permission" onPress={requestPermission} />
      </Centered>
    );
  }

  const capture = async () => {
    const cam = cameraRef.current;
    if (!cam) {
      Alert.alert('Camera not ready');
      return;
    }
    try {
      // Try all known method names across versions
      const fn =
        cam.takePictureAsync ??
        cam.takePhotoAsync ??
        cam.takePhoto; // some internal builds use takePhoto()

      if (!fn) {
        Alert.alert('Capture method not available on this SDK');
        return;
      }

      const result = await fn.call(cam, { quality: 1, skipProcessing: true });
      const uri = result?.uri ?? result?.path; // some return {path}
      if (uri) setPhotoUri(uri);
      else Alert.alert('Capture returned no URI');
    } catch (e) {
      console.warn(e);
      Alert.alert('Capture failed');
    }
  };

  if (photoUri) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <Image source={{ uri: photoUri }} style={{ flex: 1, resizeMode: 'contain' }} />
        <View style={styles.previewActions}>
          <Button title="Retake" onPress={() => setPhotoUri(null)} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} />
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.flipBtn}
          onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
        >
          <Text style={styles.btnText}>Flip</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={capture}>
          <View style={styles.innerCircle} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Centered({ children }) {
  return <View style={styles.center}>{children}</View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  controls: { position: 'absolute', bottom: 40, width: '100%', flexDirection: 'row', justifyContent: 'center' },
  captureButton: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'white',
    alignItems: 'center', justifyContent: 'center',
  },
  innerCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'white' },
  flipBtn: {
    position: 'absolute', left: 30, bottom: 50, padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10,
  },
  btnText: { color: 'white', fontWeight: '600' },
  previewActions: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
});

