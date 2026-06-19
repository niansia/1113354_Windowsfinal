const fs = require('fs');
const path = require('path');

const handsSrcDir = path.join(__dirname, '..', 'node_modules', '@mediapipe', 'hands');
const cameraSrcDir = path.join(__dirname, '..', 'node_modules', '@mediapipe', 'camera_utils');
const destDir = path.join(__dirname, '..', 'public', 'mediapipe', 'hands');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const handsFiles = [
  'hand_landmark_full.tflite',
  'hand_landmark_lite.tflite',
  'hands_solution_packed_assets_loader.js',
  'hands_solution_packed_assets.data',
  'hands_solution_simd_wasm_bin.js',
  'hands_solution_simd_wasm_bin.wasm',
  'hands_solution_wasm_bin.js',
  'hands_solution_wasm_bin.wasm',
  'hands.binarypb',
  'hands.js'
];

const cameraFiles = [
  'camera_utils.js'
];

console.log(`Copying MediaPipe assets to ${destDir}...`);

handsFiles.forEach(file => {
  const src = path.join(handsSrcDir, file);
  const dest = path.join(destDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied Hands: ${file}`);
  }
});

cameraFiles.forEach(file => {
  const src = path.join(cameraSrcDir, file);
  const dest = path.join(destDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied CameraUtils: ${file}`);
  }
});

// Tasks-Vision WASM (FaceLandmarker / PoseLandmarker for the Style Studio).
const tasksWasmSrc = path.join(__dirname, '..', 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const tasksWasmDest = path.join(__dirname, '..', 'public', 'mediapipe', 'tasks-vision', 'wasm');
if (fs.existsSync(tasksWasmSrc)) {
  if (!fs.existsSync(tasksWasmDest)) {
    fs.mkdirSync(tasksWasmDest, { recursive: true });
  }
  fs.readdirSync(tasksWasmSrc).forEach(file => {
    fs.copyFileSync(path.join(tasksWasmSrc, file), path.join(tasksWasmDest, file));
  });
  console.log('Copied Tasks-Vision WASM.');
}

// The .task model files live in public/mediapipe/models (committed); warn if missing.
const faceModel = path.join(__dirname, '..', 'public', 'mediapipe', 'models', 'face_landmarker.task');
if (!fs.existsSync(faceModel)) {
  console.warn('WARNING: public/mediapipe/models/face_landmarker.task is missing — download it from https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task');
}

console.log('MediaPipe assets copy complete.');
