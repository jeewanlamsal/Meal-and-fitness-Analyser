# CV Fitness Analyzer

An AI-powered fitness and nutrition analysis application that uses 
computer vision to analyze food images and exercise form.

## Features

- **Nutrition Scanner** — Upload a food photo and get instant macro 
  breakdown (calories, protein, carbs, fats, estimated weight)
- **Biomechanics Analyzer** — Upload a workout video and get 
  form analysis using pose detection
- Supports global and Nepali food brands
- MongoDB logging of all analysis sessions

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS, Vite |
| Backend | Node.js, Express |
| AI Engine | Python, Google Gemini Vision API |
| Pose Detection | MediaPipe, YOLOv8 |
| Database | MongoDB Atlas |
| Infrastructure | Docker, Docker Compose |

## Architecture

Frontend (React) → Backend API (Node/Express) → Python AI Engine
→ MongoDB Atlas


The backend spawns Python as a child process. The AI engine 
receives the image path, calls Gemini Vision API, and returns 
structured JSON with nutrition data.

## Setup

**Prerequisites:** Docker Desktop installed and running.

**1. Clone the repo**
```bash
git clone https://github.com/YOUR_USERNAME/cv-fitness-analyzer.git
cd cv-fitness-analyzer
```

**2. Create environment file**

Create `.env` in the project root:

GEMINI_API_KEY=your_gemini_api_key_here
MONGO_URI=your_mongodb_connection_string
PORT=5000


Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com)

**3. Run with Docker**
```bash
docker-compose up --build
```

**4. Open the app**

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## How the AI Engine Works

1. Image uploaded through React UI
2. Express backend saves it to `uploads/`
3. Backend spawns `python3 nutrition_engine.py <image_path>`
4. Python opens the image, sends it to Gemini Vision API
5. Gemini identifies food items and estimates macros
6. Python returns JSON to Node via stdout
7. Node parses JSON, saves to MongoDB, returns to frontend
8. React displays the nutrition dashboard