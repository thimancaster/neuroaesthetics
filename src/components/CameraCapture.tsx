import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, X, SwitchCamera, Loader2 } from "lucide-react";

export type PhotoType = "resting" | "glabellar" | "frontal";

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  photoLabel: string;
  photoType: PhotoType;
}

const PHOTO_GUIDES: Record<PhotoType, { title: string; instruction: string; icon: React.ReactNode }> = {
  resting: {
    title: "Face em Repouso",
    instruction: "Mantenha expressão neutra, olhe diretamente para a câmera",
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="50" cy="50" rx="35" ry="42" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <circle cx="35" cy="42" r="4" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="65" cy="42" r="4" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M40 62 Q50 66 60 62" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  glabellar: {
    title: "Contração Glabelar",
    instruction: "Faça expressão de 'Bravo' — franza a testa",
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="50" cy="50" rx="35" ry="42" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <path d="M30 40 L40 44" stroke="currentColor" strokeWidth="1.5" />
        <path d="M70 40 L60 44" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="35" cy="45" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="65" cy="45" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M45 35 Q50 32 55 35" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M42 65 Q50 62 58 65" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  frontal: {
    title: "Contração Frontal",
    instruction: "Faça expressão de 'Surpresa' — levante as sobrancelhas",
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="50" cy="50" rx="35" ry="42" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <path d="M28 35 Q35 30 42 35" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M58 35 Q65 30 72 35" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="35" cy="44" r="5" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="65" cy="44" r="5" fill="none" stroke="currentColor" strokeWidth="1" />
        <ellipse cx="50" cy="68" rx="8" ry="6" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
};

export function CameraCapture({ isOpen, onClose, onCapture, photoLabel, photoType }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState(false);

  const guide = PHOTO_GUIDES[photoType];

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        setError("Permissão de câmera negada. Por favor, permita o acesso à câmera.");
      } else if (err.name === "NotFoundError") {
        setError("Nenhuma câmera encontrada no dispositivo.");
      } else {
        setError("Erro ao acessar a câmera. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, stream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, facingMode]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Flash effect
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 150);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${photoLabel.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCapture(file);
        handleClose();
      }
    }, "image/jpeg", 0.9);
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    onClose();
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-black border-none">
        <div className="relative aspect-[3/4] w-full">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium text-sm">{photoLabel}</span>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Camera View */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 p-6 text-center">
              <Camera className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-white mb-4">{error}</p>
              <Button variant="secondary" onClick={startCamera}>
                Tentar novamente
              </Button>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => setIsLoading(false)}
            className="w-full h-full object-cover"
            style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
          />

          {/* Flash effect overlay */}
          {flashActive && (
            <div className="absolute inset-0 bg-white z-30 animate-fade-out" />
          )}

          {/* Face guide overlay with specific instructions */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-48 h-64 text-white/50">
              {guide.icon}
            </div>
            <div className="absolute bottom-28 left-0 right-0 text-center px-4">
              <p className="text-white/80 text-sm font-medium bg-black/40 rounded-lg px-3 py-2 inline-block">
                {guide.instruction}
              </p>
            </div>
          </div>

          {/* Hidden canvas for capturing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex items-center justify-center gap-6">
              {/* Switch camera button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 w-12 h-12"
                onClick={toggleCamera}
                disabled={isLoading || !!error}
              >
                <SwitchCamera className="w-6 h-6" />
              </Button>

              {/* Capture button */}
              <button
                onClick={handleCapture}
                disabled={isLoading || !!error}
                className="w-16 h-16 rounded-full bg-white border-4 border-white/30 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                aria-label="Capturar foto"
              />

              {/* Spacer for alignment */}
              <div className="w-12 h-12" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
