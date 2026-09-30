import sys
import json
import os
import cv2
import numpy as np
import mediapipe as mp
from collections import deque

def calculate_angle(a, b, c):
    """Calculates 2D joint angle between shoulder (a), elbow (b), and wrist (c)."""
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    
    if angle > 180.0:
        angle = 360.0 - angle
        
    return angle

def analyze_video(video_path):
    if not os.path.exists(video_path):
        print(json.dumps({"error": f"Video not found at {video_path}"}))
        return

    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )

    cap = cv2.VideoCapture(video_path)
    
    reps_counted = 0
    stage = None # States: None, 'extended', 'contracted'
    
    angle_buffer = deque(maxlen=5) # 5-frame moving average to destroy noise
    all_angles = []
    total_frames = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        total_frames += 1

        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(image_rgb)

        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark

            # Calculate visibility for both arms
            r_vis = (landmarks[12].visibility + landmarks[14].visibility + landmarks[16].visibility) / 3.0
            l_vis = (landmarks[11].visibility + landmarks[13].visibility + landmarks[15].visibility) / 3.0

            # Lock onto the arm with the best visibility
            if r_vis >= l_vis and r_vis > 0.4:
                s = [landmarks[12].x, landmarks[12].y]
                e = [landmarks[14].x, landmarks[14].y]
                w = [landmarks[16].x, landmarks[16].y]
            elif l_vis > 0.4:
                s = [landmarks[11].x, landmarks[11].y]
                e = [landmarks[13].x, landmarks[13].y]
                w = [landmarks[15].x, landmarks[15].y]
            else:
                continue # Skip frame if heavily blocked

            # Calculate and smooth the angle
            raw_angle = calculate_angle(s, e, w)
            angle_buffer.append(raw_angle)
            smoothed_angle = float(np.mean(angle_buffer))
            all_angles.append(smoothed_angle)

            # --- SPATIAL STATE MACHINE (No Timers) ---
            
            # 1. Arm drops down (Extension Phase)
            if smoothed_angle > 140:
                stage = "extended"

            # 2. Arm curls up (Contraction Phase)
            if smoothed_angle < 60 and stage == "extended":
                stage = "contracted"
                reps_counted += 1

    cap.release()
    pose.close()

    avg_angle = round(float(np.mean(all_angles)), 1) if all_angles else 0.0

    output = {
        "exercise": "Bicep Curls",
        "repsCounted": reps_counted,
        "averageAngle": avg_angle,
        "totalFramesAnalyzed": total_frames
    }

    print(json.dumps(output))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        analyze_video(sys.argv[1])
    else:
        print(json.dumps({"error": "No video input provided"}))