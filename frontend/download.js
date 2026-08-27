import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const models = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

const baseURL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const dir = path.join(__dirname, 'public', 'models');

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

models.forEach(model => {
  const file = fs.createWriteStream(path.join(dir, model));
  https.get(baseURL + model, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close();
      console.log(`Downloaded ${model}`);
    });
  }).on('error', function(err) {
    console.error(`Error downloading ${model}: ${err.message}`);
  });
});
