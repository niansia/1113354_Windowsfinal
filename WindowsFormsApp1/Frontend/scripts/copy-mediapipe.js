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

console.log('MediaPipe assets copy complete.');
