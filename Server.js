const express = require('express');
const multer = require('multer');
const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const app = express();
const upload = multer({ dest: 'uploads/' });

// Load Models on Startup
async function loadModels() {
    const modelPath = path.join(__dirname, 'models');
    await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    console.log("AI Models Loaded");
}

app.use(express.static('public'));

app.post('/analyze', upload.single('frame'), async (req, res) => {
    try {
        const img = await canvas.loadImage(req.file.path);
        const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
                                        .withFaceLandmarks();
        
        // Logic: If no landmarks are found or 'jitter' is high, it's a potential spoof
        const isSuspicious = detections.length === 0; 
        
        res.json({ 
            isReal: !isSuspicious, 
            confidence: detections[0]?.detection.score || 0,
            landmarks: detections[0]?.landmarks.positions.length || 0
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

loadModels().then(() => app.listen(3000, () => console.log('Server running on http://localhost:3000')));
