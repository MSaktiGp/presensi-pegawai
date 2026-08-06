'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { HiCamera, HiExclamationTriangle, HiCheckCircle, HiArrowPath } from 'react-icons/hi2';

interface CameraCaptureProps {
  onCapture: (photoBase64: string) => void;
  capturedPhoto: string | null;
  onRetake: () => void;
}

export default function CameraCapture({ onCapture, capturedPhoto, onRetake }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Get the media stream and trigger render of video element
  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Stop any existing stream first
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      // Set state first — this will cause React to render the <video> element
      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (err: any) {
      let message = 'Gagal mengakses kamera.';
      if (err.name === 'NotAllowedError') {
        message = 'Izin kamera ditolak. Silakan aktifkan izin kamera di pengaturan browser.';
      } else if (err.name === 'NotFoundError') {
        message = 'Kamera tidak ditemukan pada perangkat ini.';
      } else if (err.name === 'NotReadableError') {
        message = 'Kamera sedang digunakan oleh aplikasi lain.';
      } else if (err.name === 'AbortError') {
        message = 'Kamera dibatalkan. Silakan coba lagi.';
      }
      setError(message);
    }
    setIsLoading(false);
  }, [stream]);

  // Step 2: Once video element is rendered AND stream is available, attach and play
  useEffect(() => {
    if (!stream || !isCameraActive || !videoRef.current) return;

    const video = videoRef.current;
    video.srcObject = stream;

    const playVideo = async () => {
      try {
        await video.play();
      } catch (e) {
        console.error('Video play failed:', e);
      }
    };

    if (video.readyState >= 2) {
      // Video data is already available
      playVideo();
    } else {
      // Wait for enough data to start playing
      const onCanPlay = () => {
        video.removeEventListener('canplay', onCanPlay);
        playVideo();
      };
      video.addEventListener('canplay', onCanPlay);
      return () => {
        video.removeEventListener('canplay', onCanPlay);
      };
    }
  }, [stream, isCameraActive]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Use videoWidth/videoHeight, fall back to element dimensions or defaults
    const width = video.videoWidth || video.clientWidth || 640;
    const height = video.videoHeight || video.clientHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror the image for selfie camera
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    // Compress to JPEG
    const photoBase64 = canvas.toDataURL('image/jpeg', 0.7);
    onCapture(photoBase64);
    stopCamera();
  }, [onCapture, stopCamera]);

  const handleRetake = () => {
    onRetake();
    startCamera();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
        <HiCamera className="text-lg" />
        Foto Presensi
      </label>

      {/* Error state */}
      {error && (
        <div className="bg-accent-red-light border border-accent-red/20 rounded-xl p-4 text-sm text-accent-red">
          <p className="font-medium flex items-center gap-1"><HiExclamationTriangle /> {error}</p>
          <button onClick={startCamera} className="btn btn-outline text-xs mt-2 py-1.5 px-3">
            Coba Lagi
          </button>
        </div>
      )}

      {/* No photo yet, camera not active */}
      {!capturedPhoto && !isCameraActive && !error && (
        <button
          onClick={startCamera}
          disabled={isLoading}
          className="btn btn-gold w-full py-4 text-base"
          id="btn-open-camera"
        >
          {isLoading ? (
            <>
              <div className="spinner !w-5 !h-5 !border-[var(--primary-dark)] !border-t-transparent" />
              Membuka Kamera...
            </>
          ) : (
            <><HiCamera className="inline" /> Ambil Foto Presensi</>
          )}
        </button>
      )}

      {/* Camera active - show video */}
      {isCameraActive && !capturedPhoto && (
        <div className="animate-fade-in space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {/* Camera overlay guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-white/40 rounded-full" />
            </div>
            <div className="absolute bottom-2 left-0 right-0 text-center text-white/70 text-xs">
              Posisikan wajah di dalam lingkaran
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={capturePhoto}
              className="btn btn-primary flex-1 py-3"
              id="btn-capture"
            >
              <HiCamera className="inline" /> Ambil Foto
            </button>
            <button
              onClick={stopCamera}
              className="btn btn-outline px-4"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Photo captured - show preview */}
      {capturedPhoto && (
        <div className="animate-fade-in space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-black">
            <img
              src={capturedPhoto}
              alt="Foto presensi"
              className="w-full aspect-[4/3] object-cover"
            />
            <div className="absolute top-2 right-2">
              <span className="badge badge-success text-xs">
                <HiCheckCircle className="inline" /> Foto Siap
              </span>
            </div>
          </div>
          <button
            onClick={handleRetake}
            className="btn btn-outline w-full"
            id="btn-retake"
          >
            <HiArrowPath className="inline" /> Ambil Ulang
          </button>
        </div>
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
