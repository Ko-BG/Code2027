const express = require('express');
const multer = require('multer');
const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');
const fs = require('fs');

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const app = express();
const upload = multer({ dest: 'temp/' });

// Load AI Models from the root /models folder
async function loadModels() {
    const modelPath = path.join(__dirname, 'models');
    await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    console.log("✅ AI Models Loaded from root/models");
}

// Serve the index.html from the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint to analyze frames for "jitter" or missing landmarks
app.post('/analyze', upload.single('frame'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No frame received" });

        const img = await canvas.loadImage(req.file.path);
        const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
                                        .withFaceLandmarks();
        
        // Cleanup temp file
        fs.unlinkSync(req.file.path);

        // Anti-fraud logic:
        // 1. If no face is detected, it might be a poor injection attempt.
        // 2. We check the 'score' (confidence). Deepfakes often have lower scores 
        // in high-motion frames due to blurring artifacts.
        const isReal = detections.length > 0 && detections[0].detection.score > 0.8;
        
        res.json({ 
            status: isReal ? "VERIFIED" : "SUSPICIOUS",
            confidence: detections[0]?.detection.score || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

loadModels().then(() => {
    app.listen(3000, () => console.log('🚀 Server: http://localhost:3000'));
});
