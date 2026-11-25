import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, AlertCircle, Video, SwitchCamera, Loader2 } from 'lucide-react';

export default function WebcamCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  // 1. Detect available cameras and start camera
  useEffect(() => {
    let active = true;

    async function initCamera() {
      try {
        setLoading(true);
        setCameraError('');

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API is not supported in this environment.');
        }

        // Enumerate video devices
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        
        if (active) {
          setDevices(videoDevices);
          if (videoDevices.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(videoDevices[0].deviceId);
          }
        }

        await startStream(selectedDeviceId);
      } catch (err) {
        if (active) {
          handleCameraError(err);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initCamera();

    return () => {
      active = false;
      stopStream();
    };
  }, [selectedDeviceId]);

  // 2. Start MediaStream with robust constraints
  const startStream = async (deviceId) => {
    stopStream();

    const constraints = {
      audio: false,
      video: deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
    };

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => console.warn('Play interrupted:', e));
        };
      }
      setCameraError('');
    } catch (err) {
      console.warn('HD camera constraint failed, retrying with basic constraint:', err.message);
      try {
        // Fallback to basic video constraint
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.muted = true;
          videoRef.current.play().catch(e => console.warn('Fallback play failed:', e));
        }
        setCameraError('');
      } catch (fallbackErr) {
        handleCameraError(fallbackErr);
      }
    }
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
  };

  const handleCameraError = (err) => {
    console.error('[Webcam Error]:', err.name, err.message);
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      setCameraError('Camera access denied. Please allow camera permissions in Windows Settings (Settings > Privacy > Camera).');
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      setCameraError('No webcam hardware detected on this PC. Please plug in a USB webcam.');
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      setCameraError('Camera is already in use by another application (e.g. Zoom, MS Teams, Skype). Please close them and retry.');
    } else if (err.name === 'OverconstrainedError') {
      setCameraError('Camera does not support requested resolution. Trying fallback mode...');
    } else {
      setCameraError(`Camera error: ${err.message || 'Unable to access video feed'}`);
    }
  };

  // 3. Take Photo Capture
  const takePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    // Mirror image horizontally for intuitive selfie perspective
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
    setCapturedImage(dataUrl);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.warn(e));
    }
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      stopStream();
      if (onClose) onClose();
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-4">
      {/* Device Selector Toolbar (if multiple cameras available) */}
      {devices.length > 1 && !capturedImage && (
        <div className="w-full flex items-center justify-between text-xs px-1">
          <span className="font-bold text-slate-600 flex items-center gap-1.5">
            <SwitchCamera className="w-3.5 h-3.5 text-brand-600" />
            <span>Switch Camera:</span>
          </span>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
          >
            {devices.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>
                {d.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Camera Viewfinder Box */}
      <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden shadow-lg border-2 border-slate-800 flex items-center justify-center">
        {loading && !cameraError && (
          <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            <span>Connecting to camera hardware...</span>
          </div>
        )}

        {cameraError ? (
          <div className="p-6 text-center text-red-400 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
            <p className="font-bold text-xs">{cameraError}</p>
            <button
              type="button"
              onClick={() => startStream(selectedDeviceId)}
              className="mt-3 px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-700 text-red-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Camera</span>
            </button>
          </div>
        ) : !capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            {/* Viewfinder Target Guidelines */}
            <div className="absolute inset-4 border border-dashed border-white/30 rounded-xl pointer-events-none flex items-center justify-center">
              <span className="text-[10px] text-white/50 bg-black/40 px-2 py-0.5 rounded-full font-semibold">
                Align Visitor Face in Frame
              </span>
            </div>
          </>
        ) : (
          <img
            src={capturedImage}
            alt="Captured Visitor"
            className="w-full h-full object-cover"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls / Action Buttons */}
      <div className="flex items-center justify-center gap-3 w-full pt-1">
        {!capturedImage ? (
          <button
            type="button"
            onClick={takePhoto}
            disabled={!!cameraError || loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-brand-600/30 disabled:opacity-40 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Capture Snapshot</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={retakePhoto}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retake</span>
            </button>
            <button
              type="button"
              onClick={confirmPhoto}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Use This Photo</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
