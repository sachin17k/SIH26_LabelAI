import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X, Check, SwitchCamera, AlertCircle, Sparkles } from 'lucide-react';

interface LiveCameraScannerProps {
  onCapture: (file: File) => void;
  onClose?: () => void;
  autoCloseOnCapture?: boolean;
}

export const LiveCameraScanner: React.FC<LiveCameraScannerProps> = ({
  onCapture,
  onClose,
  autoCloseOnCapture = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [capturedCount, setCapturedCount] = useState<number>(0);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);

  // Play subtle synthesized camera shutter sound using Web Audio API
  const playShutterSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.09);
    } catch (e) {
      // AudioContext might be blocked or unsupported; safe to ignore
    }
  };

  // Enumerate video devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devs.filter((d) => d.kind === 'videoinput');
        setDevices(videoDevs);
        if (videoDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevs[0].deviceId);
        }
      } catch (err) {
        console.warn('Unable to enumerate camera devices:', err);
      }
    };
    getDevices();
  }, []);

  // Start video stream
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    const startCamera = async () => {
      setError(null);
      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API is not supported by your browser or environment.');
        }

        const constraints: MediaStreamConstraints = {
          video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId } }
            : {
                facingMode: facingMode,
                width: { ideal: 1920, min: 640 },
                height: { ideal: 1080, min: 480 },
              },
          audio: false,
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch((e) => console.error('Video play error:', e));
        }
      } catch (err: any) {
        console.error('Error opening camera:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera permission was denied. Please allow camera access in your browser settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera device found. Please connect a webcam or switch to file upload.');
        } else {
          setError(err.message || 'Unable to start camera. Please verify device permissions.');
        }
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedDeviceId, facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Capture frame
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);
    setFlashEffect(true);
    playShutterSound();

    setTimeout(() => {
      setFlashEffect(false);
    }, 150);

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const timestamp = Date.now().toString();
            const fileName = `label_scan_${timestamp}_side_${capturedCount + 1}.jpg`;
            const file = new File([blob], fileName, { type: 'image/jpeg' });
            
            setCapturedCount((prev) => prev + 1);
            onCapture(file);
            setIsCapturing(false);

            if (autoCloseOnCapture && onClose) {
              onClose();
            }
          }
        },
        'image/jpeg',
        0.92
      );
    } else {
      setIsCapturing(false);
    }
  };

  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex flex-col items-center">
      
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Controls Bar */}
      <div className="w-full absolute top-0 left-0 right-0 z-20 px-4 py-2.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between text-white text-xs">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold tracking-wide uppercase text-[10px] text-emerald-400">
            Live Label Scanner
          </span>
          {capturedCount > 0 && (
            <span className="bg-sky-500/80 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
              {capturedCount} Captured
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {devices.length > 1 && (
            <button
              type="button"
              onClick={handleToggleFacingMode}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition backdrop-blur-sm"
              title="Switch Camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition backdrop-blur-sm"
              title="Close Camera"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error ? (
        <div className="p-8 my-10 flex flex-col items-center text-center space-y-3 max-w-sm">
          <div className="p-3 bg-red-500/20 text-red-400 rounded-2xl border border-red-500/30">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Camera Unavailable</h5>
            <p className="text-xs text-slate-400">{error}</p>
          </div>
        </div>
      ) : (
        /* Video Viewfinder */
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Shutter White Flash Effect */}
          {flashEffect && (
            <div className="absolute inset-0 bg-white z-30 animate-out fade-out duration-150 pointer-events-none" />
          )}

          {/* Legal Metrology Label Viewfinder Target Overlay */}
          <div className="absolute inset-6 sm:inset-10 border border-sky-400/40 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
            {/* Corner Brackets */}
            <div className="flex justify-between">
              <div className="w-6 h-6 border-t-2 border-l-2 border-sky-400 rounded-tl-lg" />
              <div className="w-6 h-6 border-t-2 border-r-2 border-sky-400 rounded-tr-lg" />
            </div>

            {/* Radar / Scanning sweep line */}
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_8px_#38bdf8] animate-pulse" />

            {/* Corner Brackets Bottom */}
            <div className="flex justify-between">
              <div className="w-6 h-6 border-b-2 border-l-2 border-sky-400 rounded-bl-lg" />
              <div className="w-6 h-6 border-b-2 border-r-2 border-sky-400 rounded-br-lg" />
            </div>
          </div>

          {/* Helper Badge */}
          <div className="absolute bottom-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[11px] text-slate-300 font-medium pointer-events-none flex items-center space-x-1.5">
            <Sparkles className="w-3 h-3 text-sky-400" />
            <span>Position commodity label, MRP or Net Qty within frame</span>
          </div>
        </div>
      )}

      {/* Bottom Shutter Action Bar */}
      {!error && (
        <div className="w-full px-6 py-4 bg-slate-950 flex items-center justify-center border-t border-slate-800">
          <button
            type="button"
            onClick={handleSnapPhoto}
            disabled={isCapturing}
            className="group relative flex items-center justify-center p-1 rounded-full focus:outline-none focus:ring-4 focus:ring-sky-500/50 transition"
            title="Snap Product Label"
          >
            <div className="w-16 h-16 rounded-full border-4 border-white/80 group-hover:border-white flex items-center justify-center transition group-active:scale-95 bg-transparent">
              <div className="w-12 h-12 rounded-full bg-red-600 group-hover:bg-red-500 shadow-lg shadow-red-600/40 flex items-center justify-center transition">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="sr-only">Capture Photo</span>
          </button>
        </div>
      )}

    </div>
  );
};
