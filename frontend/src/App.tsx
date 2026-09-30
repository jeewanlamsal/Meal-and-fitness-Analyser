import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Utensils, Activity, Upload, Loader2, CheckCircle, AlertTriangle, Camera, Video, StopCircle, X, Settings2 } from 'lucide-react';
import type { NutritionResult, BiomechanicsResult } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'nutrition' | 'biomechanics'>('nutrition');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // States for API Results
  const [nutritionData, setNutritionData] = useState<NutritionResult | null>(null);
  const [biomechanicsData, setBiomechanicsData] = useState<BiomechanicsResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Webcam States & Refs
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // --- API SUBMISSION LOGIC ---
  const processNutrition = async (file: File) => {
    setImagePreview(URL.createObjectURL(file));
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await axios.post<NutritionResult>(
        'http://localhost:5000/api/analyze/nutrition',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setNutritionData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to analyze meal image.');
    } finally {
      setLoading(false);
    }
  };

  const processBiomechanics = async (file: File) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await axios.post<BiomechanicsResult>(
        'http://localhost:5000/api/analyze/biomechanics',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setBiomechanicsData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to analyze movement video.');
    } finally {
      setLoading(false);
    }
  };

  // --- FILE INPUT HANDLERS ---
  const handleNutritionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processNutrition(file);
  };

  const handleBiomechanicsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processBiomechanics(file);
  };

  // --- WEBCAM LOGIC WITH DEVICE SWITCHING ---
  const startCamera = async (deviceId?: string) => {
    setError(null);
    try {
      const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraActive(true);
      
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);

      // Once stream is active and permissions granted, fetch all devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      setVideoDevices(videoInputs);
      
      if (deviceId) {
        setSelectedDeviceId(deviceId);
      } else if (videoInputs.length > 0) {
        // If no device ID was provided, grab the ID of the active track
        const activeTrack = stream.getVideoTracks()[0];
        const activeDevice = videoInputs.find(d => d.label === activeTrack.label);
        setSelectedDeviceId(activeDevice?.deviceId || videoInputs[0].deviceId);
      }

    } catch (err) {
      setError('Failed to access camera. Please check browser permissions.');
    }
  };

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeviceId = e.target.value;
    
    // Stop current stream completely before switching
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    // Start new stream
    startCamera(newDeviceId);
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
    setIsRecording(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "webcam-capture.jpg", { type: "image/jpeg" });
          stopCamera();
          processNutrition(file);
        }
      }, 'image/jpeg');
    }
  };

  const startRecording = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const file = new File([blob], "workout-capture.webm", { type: "video/webm" });
        stopCamera();
        processBiomechanics(file);
      };
      
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-10 px-4">
      
      {/* Fullscreen Camera Overlay */}
      {cameraActive && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
          
          {/* CAMERA SWITCHER DROPDOWN */}
          <div className="absolute top-6 left-6 flex items-center gap-3 bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-xl z-50">
            <Settings2 className="w-5 h-5 text-emerald-400" />
            <select 
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              className="bg-slate-900 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-emerald-500 min-w-[200px]"
            >
              {videoDevices.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>

          <button onClick={stopCamera} className="absolute top-6 right-6 text-slate-400 p-2 bg-slate-800 rounded-full hover:bg-slate-700 hover:text-white transition-colors z-50">
            <X className="w-6 h-6" />
          </button>
          
          <div className="relative rounded-2xl overflow-hidden border-4 border-slate-700 shadow-2xl mb-8">
            <video ref={videoRef} autoPlay playsInline muted className="max-h-[60vh] max-w-full object-cover" />
            
            {isRecording && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded-full border border-red-500/50">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-500 text-sm font-bold tracking-wider">REC</span>
              </div>
            )}
          </div>
          
          <canvas ref={canvasRef} className="hidden" />

          {activeTab === 'nutrition' ? (
            <button onClick={() => capturePhoto()} className="flex items-center gap-3 bg-emerald-500 text-slate-950 px-8 py-4 rounded-full font-bold text-lg hover:bg-emerald-400 transition-transform active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Camera className="w-6 h-6" /> Capture Plate
            </button>
          ) : (
            <button 
              onClick={isRecording ? stopRecording : () => startRecording()} 
              className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg transition-all active:scale-95 shadow-lg ${
                isRecording 
                  ? 'bg-slate-800 text-white hover:bg-slate-700 border-2 border-red-500/50' 
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
              }`}
            >
              {isRecording ? (
                <><StopCircle className="w-6 h-6 text-red-400" /> Finish Set</>
              ) : (
                <><Video className="w-6 h-6" /> Record Workout</>
              )}
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <header className="max-w-4xl w-full text-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
          CV Fitness & Nutrition <span className="text-emerald-400">AI</span>
        </h1>
        <p className="text-slate-400">
          Computer Vision Engine powered by YOLOv8, MediaPipe, Express & MongoDB
        </p>
      </header>

      {/* Tab Navigation */}
      <div className="flex bg-slate-800 p-1 rounded-xl mb-8 max-w-md w-full border border-slate-700">
        <button
          onClick={() => { setActiveTab('nutrition'); setError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'nutrition' ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Utensils className="w-5 h-5" /> Nutrition Scanner
        </button>
        <button
          onClick={() => { setActiveTab('biomechanics'); setError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'biomechanics' ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-5 h-5" /> Form Analyzer
        </button>
      </div>

      {error && (
        <div className="max-w-xl w-full bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-3 mb-6">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Main Card */}
      <main className="max-w-2xl w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
        {activeTab === 'nutrition' ? (
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
              <Utensils className="text-emerald-400" /> Meal Image Scanner
            </h2>
            
            <div className="flex gap-4 mb-6">
              <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-600 hover:border-emerald-400 bg-slate-900/50 rounded-xl p-6 cursor-pointer transition-colors group relative overflow-hidden min-h-[160px]">
                {imagePreview ? (
                  <div className="flex flex-col items-center w-full">
                    <img src={imagePreview} alt="Preview" className="max-h-40 w-auto object-contain rounded-lg shadow-md" />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="flex items-center gap-2 text-emerald-400 font-medium bg-slate-800 px-4 py-2 rounded-full shadow-lg border border-emerald-500/30">
                        <Upload className="w-4 h-4" /> Change Image
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-500 group-hover:text-emerald-400 mb-2 transition-colors" />
                    <span className="text-slate-300 font-medium">Upload Image</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleNutritionUpload} disabled={loading} className="hidden" />
              </label>

              <button onClick={() => startCamera()} className="flex-1 flex flex-col items-center justify-center border-2 border-slate-600 rounded-xl p-6 bg-slate-900/30 hover:bg-slate-700/50 hover:border-emerald-400 transition-colors group min-h-[160px]">
                <Camera className="w-8 h-8 text-slate-500 group-hover:text-emerald-400 mb-2 transition-colors" />
                <span className="text-slate-300 font-medium">Use Live Camera</span>
              </button>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center gap-3 text-emerald-400 py-6">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="font-medium">Analyzing meal with Vision AI...</span>
              </div>
            )}

            {nutritionData && !loading && (
              <div className="bg-slate-900 rounded-xl p-5 border border-slate-700 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <span className="text-slate-400">Detected Items</span>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {nutritionData.detectedItems.map((item, idx) => (
                      <span key={idx} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full capitalize">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700/50">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Calories</span>
                    <p className="text-2xl font-bold text-white mt-1">{nutritionData.totalCalories} kcal</p>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700/50">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Protein</span>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{nutritionData.totalProtein} g</p>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700/50">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Carbohydrates</span>
                    <p className="text-2xl font-bold text-blue-400 mt-1">{nutritionData.totalCarbs} g</p>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700/50">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Fats</span>
                    <p className="text-2xl font-bold text-amber-400 mt-1">{nutritionData.totalFats} g</p>
                  </div>
                </div>

                {/* Estimated Weight Display */}
                {nutritionData.estimatedWeight && (
                  <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/50 flex items-center justify-between mt-2">
                    <span className="text-sm text-slate-400 font-medium">AI Estimated Total Weight:</span>
                    <span className="text-lg font-bold text-emerald-400">{nutritionData.estimatedWeight}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
              <Activity className="text-emerald-400" /> Form Analyzer
            </h2>

            {/* Educational Tooltip for Rep Counting */}
            <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl mb-6 text-sm text-slate-300">
              <h3 className="text-emerald-400 font-bold mb-1 flex items-center gap-2">
                <Activity className="w-4 h-4" /> How Valid Reps Are Calculated
              </h3>
              <p className="leading-relaxed">
                The MediaPipe AI tracks your skeletal joint angles in real-time. A rep is only counted when you complete a <strong>full range of motion</strong>. For example, a bicep curl requires full extension (angle &gt; 160°) followed by full contraction (angle &lt; 50°). 
                <span className="text-amber-400 ml-1">Half-reps and partial movements are intentionally ignored to ensure proper form.</span>
              </p>
            </div>

            <div className="flex gap-4 mb-6">
              <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-600 hover:border-emerald-400 bg-slate-900/50 rounded-xl p-6 cursor-pointer transition-colors group min-h-[160px]">
                <Upload className="w-8 h-8 text-slate-500 group-hover:text-emerald-400 mb-2 transition-colors" />
                <span className="text-slate-300 font-medium text-center">Upload Video</span>
                <input type="file" accept="video/*" onChange={handleBiomechanicsUpload} disabled={loading} className="hidden" />
              </label>

              <button onClick={() => startCamera()} className="flex-1 flex flex-col items-center justify-center border-2 border-slate-600 rounded-xl p-6 bg-slate-900/30 hover:bg-slate-700/50 hover:border-emerald-400 transition-colors group min-h-[160px]">
                <Video className="w-8 h-8 text-slate-500 group-hover:text-emerald-400 mb-2 transition-colors" />
                <span className="text-slate-300 font-medium text-center">Record Camera</span>
              </button>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center gap-3 text-emerald-400 py-8">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="font-medium">Running MediaPipe Kinematic Pose Estimation...</span>
              </div>
            )}

            {biomechanicsData && !loading && (
              <div className="bg-slate-900 rounded-xl p-5 border border-slate-700 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <span className="text-slate-400">Exercise Type</span>
                  <span className="text-white font-semibold">{biomechanicsData.exercise}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700/50">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Valid Reps</span>
                    <p className="text-3xl font-bold text-emerald-400 mt-1">{biomechanicsData.repsCounted}</p>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700/50">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Avg Joint Angle</span>
                    <p className="text-3xl font-bold text-blue-400 mt-1">{biomechanicsData.averageAngle}°</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}