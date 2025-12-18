import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, X, SwitchCamera, Loader2 } from "lucide-react";

export type PhotoType = 
  | "resting" 
  | "glabellar" 
  | "frontal" 
  | "smile" 
  | "nasal" 
  | "perioral" 
  | "profile_left" 
  | "profile_right";

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
    instruction: "Faça expressão de 'Bravo' — franza a testa entre as sobrancelhas",
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
    instruction: "Faça expressão de 'Surpresa' — levante as sobrancelhas bem alto",
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="50" cy="50" rx="35" ry="42" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <path d="M28 35 Q35 30 42 35" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M58 35 Q65 30 72 35" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="35" cy="44" r="5" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="65" cy="44" r="5" fill="none" stroke="currentColor" strokeWidth="1" />
        <ellipse cx="50" cy="68" rx="8" ry="6" fill="none" stroke="currentColor" strokeWidth="1" />
        {/* Forehead lines */}
        <path d="M30 20 Q50 18 70 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
        <path d="M32 24 Q50 22 68 24" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
        <path d="M34 28 Q50 26 66 28" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
      </svg>
    ),
  },
  smile: {
    title: "Sorriso Forçado",
    instruction: "Sorria intensamente, mostrando os dentes — ativa pés de galinha",
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="50" cy="50" rx="35" ry="42" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <circle cx="35" cy="42" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="65" cy="42" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
        {/* Crow's feet lines */}
        <path d="M20 40 L26 42" stroke="currentColor" strokeWidth="0.8" />
        <path d="M20 44 L26 44" stroke="currentColor" strokeWidth="0.8" />
        <path d="M20 48 L26 46" stroke="currentColor" strokeWidth="0.8" />
        <path d="M80 40 L74 42" stroke="currentColor" strokeWidth="0.8" />
        <path d="M80 44 L74 44" stroke="currentColor" strokeWidth="0.8" />
        <path d="M80 48 L74 46" stroke="currentColor" strokeWidth="0.8" />
        {/* Big smile */}
        <path d="M35 62 Q50 75 65 62" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M38 64 L62 64" fill="none" stroke="currentColor" strokeWidth="0.5" />
      </svg>
    ),
  },
  nasal: {
    title: "Contração Nasal",
    instruction: "Franza o nariz como se sentisse cheiro ruim — 'Bunny Lines'",
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="50" cy="50" rx="35" ry="42" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <circle cx="35" cy="42" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="65" cy="42" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
        {/* Nose with bunny lines */}
        <path d="M50 42 L50 55" stroke="currentColor" strokeWidth="1" />
        <path d="M44 56 Q50 62 56 56" fill="none" stroke="currentColor" strokeWidth="1" />
        {/* Bunny lines */}
        <path d="M42 48 L46 50" stroke="currentColor" strokeWidth="1" />
        <path d="M41 51 L45 52" stroke="currentColor" strokeWidth="1" />
        <path d="M58 48 L54 50" stroke="currentColor" strokeWidth="1" />
        <path d="M59 51 L55 52" stroke="currentColor" strokeWidth="1" />
        <path d="M42 65 Q50 68 58 65" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  perioral: {
    title: "Contração Perioral",
    instruction: "Franza os lábios como se fosse dar um beijo — 'Código de Barras'",
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="50" cy="50" rx="35" ry="42" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <circle cx="35" cy="42" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="65" cy="42" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M50 48 L50 56" stroke="currentColor" strokeWidth="0.8" />
        {/* Pursed lips */}
        <ellipse cx="50" cy="65" rx="6" ry="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        {/* Barcode lines above lips */}
        <path d="M44 58 L44 62" stroke="currentColor" strokeWidth="0.6" />
        <path d="M47 57 L47 62" stroke="currentColor" strokeWidth="0.6" />
        <path d="M50 56 L50 61" stroke="currentColor" strokeWidth="0.6" />
        <path d="M53 57 L53 62" stroke="currentColor" strokeWidth="0.6" />
        <path d="M56 58 L56 62" stroke="currentColor" strokeWidth="0.6" />
      </svg>
    ),
  },
  profile_left: {
    title: "Perfil Esquerdo",
    instruction: "Vire o rosto para a direita — mostre o lado esquerdo do rosto",
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="55" cy="50" rx="28" ry="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        {/* Profile face outline */}
        <path d="M50 15 Q65 15 70 30 L72 45 Q74 55 68 60 L62 68 Q58 72 55 75 L50 80 Q48 82 45 80" 
              fill="none" stroke="currentColor" strokeWidth="1" />
        {/* Eye */}
        <ellipse cx="62" cy="42" rx="4" ry="2" fill="none" stroke="currentColor" strokeWidth="1" />
        {/* Nose */}
        <path d="M72 45 L75 52 L70 55" fill="none" stroke="currentColor" strokeWidth="1" />
        {/* Lips */}
        <path d="M68 62 L72 64 L68 66" fill="none" stroke="currentColor" strokeWidth="1" />
        {/* Arrow indicating direction */}
        <path d="M25 50 L35 50 M32 45 L35 50 L32 55" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  profile_right: {
    title: "Perfil Direito",
    instruction: "Vire o rosto para a esquerda — mostre o lado direito do rosto",
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="45" cy="50" rx="28" ry="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        {/* Profile face outline - mirrored */}
        <path d="M50 15 Q35 15 30 30 L28 45 Q26 55 32 60 L38 68 Q42 72 45 75 L50 80 Q52 82 55 80" 
              fill="none" stroke="currentColor" strokeWidth="1" />
        {/* Eye */}
        <ellipse cx="38" cy="42" rx="4" ry="2" fill="none" stroke="currentColor" strokeWidth="1" />
        {/* Nose */}
        <path d="M28 45 L25 52 L30 55" fill="none" stroke="currentColor" strokeWidth="1" />
        {/* Lips */}
        <path d="M32 62 L28 64 L32 66" fill="none" stroke="currentColor" strokeWidth="1" />
        {/* Arrow indicating direction */}
        <path d="M75 50 L65 50 M68 45 L65 50 L68 55" stroke="currentColor" strokeWidth="1.5" />
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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 150);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${photoType}-${Date.now()}.jpg`, {
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
              <div>
                <span className="text-white font-medium text-sm block">{photoLabel}</span>
                <span className="text-white/70 text-xs">{guide.title}</span>
              </div>
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
