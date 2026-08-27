import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

export default function WebcamMonitor({ onSuspiciousActivity }) {
  const videoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [noiseWarningActive, setNoiseWarningActive] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setIsModelsLoaded(true);
        startMedia();
      } catch (err) {
        console.error('Error loading face-api models', err);
      }
    };
    loadModels();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startMedia = () => {
    navigator.mediaDevices.getUserMedia({ video: {}, audio: true })
      .then(stream => {
        // Video
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Audio
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        
        const microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);

        monitorAudio();
      })
      .catch(err => console.error('Error starting media', err));
  };

  const monitorAudio = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let consecutiveHighNoise = 0;

    const checkAudio = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;

      // Threshold for "talking or loud noise"
      if (average > 40) {
        consecutiveHighNoise++;
        if (consecutiveHighNoise > 15 && !noiseWarningActive) { // ~3 seconds if checking every 200ms
          onSuspiciousActivity('AUDIO_NOISE_DETECTED', 'HIGH');
          setNoiseWarningActive(true);
          setTimeout(() => setNoiseWarningActive(false), 5000); // Cool down
          consecutiveHighNoise = 0;
        }
      } else {
        consecutiveHighNoise = Math.max(0, consecutiveHighNoise - 1);
      }
    };

    setInterval(checkAudio, 200);
  };

  const captureScreenshot = () => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7); // Compress to save bandwidth/db space
  };

  const handleVideoPlay = () => {
    if (isDetecting) return;
    setIsDetecting(true);

    setInterval(async () => {
      if (videoRef.current && isModelsLoaded) {
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        );

        if (detections.length === 0) {
          onSuspiciousActivity('NO_FACE', 'HIGH', captureScreenshot());
        } else if (detections.length > 1) {
          onSuspiciousActivity('MULTIPLE_FACES', 'HIGH', captureScreenshot());
        }
      }
    }, 3000); // Check every 3 seconds
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card w-64 h-48 flex items-center justify-center">
      {!isModelsLoaded && (
        <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-semibold text-primary">Initializing AI Engine...</p>
          <p className="text-[10px] text-muted-foreground mt-1">Loading secure proctoring models</p>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        muted
        onPlay={handleVideoPlay}
        className={`w-full h-full object-cover transition-opacity duration-500 ${isModelsLoaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
