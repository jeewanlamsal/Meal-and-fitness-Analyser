require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const fs = require('fs');

// Create uploads folder if it doesn't exist
// This runs on every server start — safe to always have
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
    console.log('✅ uploads/ directory created');
}

// Import the Mongoose Model you built earlier
const Log = require('./models/Log');

const app = express();
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, curl)
        if (!origin) return callback(null, true);
        
        const allowed = [
            'http://localhost:5173',
            'https://meal-and-fitness-analyser-c926.vercel.app',
            process.env.FRONTEND_URL
        ].filter(Boolean);
        
        if (allowed.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());

// Configure Multer for Media Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Define paths to the AI Engine
// Critical: We must use the Python executable inside your virtual environment
// Use the Docker environment variable if it exists, otherwise fall back to your local Windows path
const PYTHON_EXEC = process.env.PYTHON_EXEC || path.join(__dirname, '../ai-engine/.venv/Scripts/python.exe');
const NUTRITION_SCRIPT = path.join(__dirname, '../ai-engine/nutrition_engine.py');
const POSE_SCRIPT = path.join(__dirname, '../ai-engine/pose_engine.py');

// --- ENDPOINT 1: Nutrition Scanner ---
app.post('/api/analyze/nutrition', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const imagePath = req.file.path;
    const command = `"${PYTHON_EXEC}" "${NUTRITION_SCRIPT}" "${imagePath}"`;

    exec(command, async (error, stdout, stderr) => {
        // Clean up the file after processing to save disk space
        fs.unlinkSync(imagePath);

            // Better logging — shows everything Python outputs
        console.log('Python stdout:', stdout);
        console.log('Python stderr:', stderr);
        console.log('Python exit code:', error?.code);

        if (error) {
            console.error(`AI Engine Error: ${stderr}`);
            return res.status(500).json({ error: 'Failed to process image' });
        }

        try {
            // Extract ONLY the JSON object from the terminal output
            const jsonStartIndex = stdout.indexOf('{');
            const jsonEndIndex = stdout.lastIndexOf('}');

            if (jsonStartIndex === -1 || jsonEndIndex === -1) {
               throw new Error("No valid JSON found in Python output");
               }

           const cleanJsonString = stdout.substring(jsonStartIndex, jsonEndIndex + 1);
           const aiData = JSON.parse(cleanJsonString);
            
            if (aiData.error) return res.status(400).json(aiData);

            // Save result to MongoDB
            const newLog = new Log({
                logType: 'nutrition',
                nutritionData: aiData
            });
            await newLog.save();

            res.json(aiData);
        } catch (parseError) {
            console.error("Failed to parse JSON from Python:", stdout);
            res.status(500).json({ error: 'Invalid output from AI Engine' });
        }
    });
});

// --- ENDPOINT 2: Biomechanics Form Analyzer ---
app.post('/api/analyze/biomechanics', upload.single('video'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No video uploaded' });

    const videoPath = req.file.path;
    const command = `"${PYTHON_EXEC}" "${POSE_SCRIPT}" "${videoPath}"`;

    exec(command, async (error, stdout, stderr) => {
        fs.unlinkSync(videoPath);

        if (error) {
            console.error(`AI Engine Error: ${stderr}`);
            return res.status(500).json({ error: 'Failed to process video' });
        }

        try {
            // Extract ONLY the JSON object from the terminal output
            const jsonStartIndex = stdout.indexOf('{');
            const jsonEndIndex = stdout.lastIndexOf('}');

            if (jsonStartIndex === -1 || jsonEndIndex === -1) {
            throw new Error("No valid JSON found in Python output");
            }

           const cleanJsonString = stdout.substring(jsonStartIndex, jsonEndIndex + 1);
           const aiData = JSON.parse(cleanJsonString);
            
            if (aiData.error) return res.status(400).json(aiData);

            // Save result to MongoDB
            const newLog = new Log({
                logType: 'biomechanics',
                biomechanicsData: aiData
            });
            await newLog.save();

            res.json(aiData);
        } catch (parseError) {
            console.error("Failed to parse JSON from Python:", stdout);
            res.status(500).json({ error: 'Invalid output from AI Engine' });
        }
    });
});

// Database Connection & Server Boot
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Atlas connected successfully'))
    .catch(err => {
        console.error('🚨 MongoDB connection error:');
        console.error(err);
        process.exit(1); // Kill the server if the database fails to connect
    });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 CV Fitness API Gateway running on http://localhost:${PORT}`));