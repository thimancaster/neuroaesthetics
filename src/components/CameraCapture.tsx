import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, X, SwitchCamera, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

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

// Enhanced frame type for different positioning needs
type FrameType = "frontal" | "profile_left" | "profile_right";

const getFrameType = (photoType: PhotoType): FrameType => {
  if (photoType === "profile_left") return "profile_left";
  if (photoType === "profile_right") return "profile_right";
  return "frontal";
};

const PHOTO_GUIDES: Record<PhotoType, { title: string; instruction: string; tips: string[]; icon: React.ReactNode }> = {
  resting: {
    title: "Face em Repouso",
    instruction: "Mantenha expressão neutra, olhe diretamente para a câmera",
    tips: ["Relaxe músculos faciais", "Olhar na linha do horizonte", "Sem sorrir"],
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
    tips: ["Franza bem forte", "Mantenha olhar fixo", "Contraia região da glabela"],
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
    tips: ["Sobrancelhas bem elevadas", "Olhos bem abertos", "Rugas na testa visíveis"],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="50" cy="50" rx="35" ry="42" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <path d="M28 35 Q35 30 42 35" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M58 35 Q65 30 72 35" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="35" cy="44" r="5" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="65" cy="44" r="5" fill="none" stroke="currentColor" strokeWidth="1" />
        <ellipse cx="50" cy="68" rx="8" ry="6" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M30 20 Q50 18 70 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
        <path d="M32 24 Q50 22 68 24" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
        <path d="M34 28 Q50 26 66 28" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
      </svg>
    ),
  },
  smile: {
    title: "Sorriso Forçado",
    instruction: "Sorria intensamente, mostrando os dentes — ativa pés de galinha",
    tips: ["Sorriso amplo com dentes", "Observe os pés de galinha", "Mantenha por 2 segundos"],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="50" cy="50" rx="35" ry="42" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <circle cx="35" cy="42" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="65" cy="42" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M20 40 L26 42" stroke="currentColor" strokeWidth="0.8" />
        <path d="M20 44 L26 44" stroke="currentColor" strokeWidth="0.8" />
        <path d="M20 48 L26 46" stroke="currentColor" strokeWidth="0.8" />
        <path d="M80 40 L74 42" stroke="currentColor" strokeWidth="0.8" />
        <path d="M80 44 L74 44" stroke="currentColor" strokeWidth="0.8" />
        <path d="M80 48 L74 46" stroke="currentColor" strokeWidth="0.8" />
        <path d="M35 62 Q50 75 65 62" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M38 64 L62 64" fill="none" stroke="currentColor" strokeWidth="0.5" />
      </svg>
    ),
  },
  nasal: {
    title: "Contração Nasal",
    instruction: "Franza o nariz como se sentisse cheiro ruim — 'Bunny Lines'",
    tips: ["Franza o nariz com força", "Observe linhas no dorso nasal", "Mantenha a contração"],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="50" cy="50" rx="35" ry="42" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <circle cx="35" cy="42" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="65" cy="42" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M50 42 L50 55" stroke="currentColor" strokeWidth="1" />
        <path d="M44 56 Q50 62 56 56" fill="none" stroke="currentColor" strokeWidth="1" />
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
    tips: ["Projete os lábios à frente", "Contraia músculos periorais", "Linhas verticais visíveis"],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="50" cy="50" rx="35" ry="42" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <circle cx="35" cy="42" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="65" cy="42" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M50 48 L50 56" stroke="currentColor" strokeWidth="0.8" />
        <ellipse cx="50" cy="65" rx="6" ry="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
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
    tips: ["Gire 90° para a direita", "Mantenha postura ereta", "Olhar para frente"],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="55" cy="50" rx="28" ry="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <path d="M50 15 Q65 15 70 30 L72 45 Q74 55 68 60 L62 68 Q58 72 55 75 L50 80 Q48 82 45 80" 
              fill="none" stroke="currentColor" strokeWidth="1" />
        <ellipse cx="62" cy="42" rx="4" ry="2" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M72 45 L75 52 L70 55" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M68 62 L72 64 L68 66" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M25 50 L35 50 M32 45 L35 50 L32 55" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  profile_right: {
    title: "Perfil Direito",
    instruction: "Vire o rosto para a esquerda — mostre o lado direito do rosto",
    tips: ["Gire 90° para a esquerda", "Mantenha postura ereta", "Olhar para frente"],
    icon: (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="45" cy="50" rx="28" ry="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <path d="M50 15 Q35 15 30 30 L28 45 Q26 55 32 60 L38 68 Q42 72 45 75 L50 80 Q52 82 55 80" 
              fill="none" stroke="currentColor" strokeWidth="1" />
        <ellipse cx="38" cy="42" rx="4" ry="2" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M28 45 L25 52 L30 55" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M32 62 L28 64 L32 66" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M75 50 L65 50 M68 45 L65 50 L68 55" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
};

// Enhanced framing overlay component
function FramingOverlay({ frameType, photoType }: { frameType: FrameType; photoType: PhotoType }) {
  const guide = PHOTO_GUIDES[photoType];
  
  if (frameType === "frontal") {
    return (
      <div className="absolute inset-0 pointer-events-none">
        {/* Main face oval frame */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 133" preserveAspectRatio="xMidYMid meet">
          {/* Outer boundary guides */}
          <rect x="5" y="5" width="90" height="123" fill="none" stroke="white" strokeWidth="0.15" strokeDasharray="2 2" opacity="0.3" />
          
          {/* Center lines for alignment */}
          <line x1="50" y1="0" x2="50" y2="133" stroke="white" strokeWidth="0.1" strokeDasharray="3 3" opacity="0.4" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeWidth="0.1" strokeDasharray="3 3" opacity="0.4" />
          
          {/* Face oval frame - main positioning guide */}
          <ellipse 
            cx="50" 
            cy="52" 
            rx="28" 
            ry="38" 
            fill="none" 
            stroke="url(#faceGradient)" 
            strokeWidth="0.6"
            strokeDasharray="4 2"
          />
          
          {/* Inner face area */}
          <ellipse 
            cx="50" 
            cy="52" 
            rx="24" 
            ry="32" 
            fill="none" 
            stroke="white" 
            strokeWidth="0.2"
            opacity="0.3"
          />
          
          {/* Eye level line */}
          <line x1="22" y1="45" x2="78" y2="45" stroke="#22c55e" strokeWidth="0.3" opacity="0.6" />
          <circle cx="35" cy="45" r="5" fill="none" stroke="#22c55e" strokeWidth="0.3" opacity="0.5" />
          <circle cx="65" cy="45" r="5" fill="none" stroke="#22c55e" strokeWidth="0.3" opacity="0.5" />
          
          {/* Nose line */}
          <line x1="50" y1="38" x2="50" y2="62" stroke="white" strokeWidth="0.15" opacity="0.3" />
          
          {/* Mouth level line */}
          <line x1="35" y1="70" x2="65" y2="70" stroke="#22c55e" strokeWidth="0.2" opacity="0.4" />
          
          {/* Chin marker */}
          <path d="M42 85 Q50 92 58 85" fill="none" stroke="white" strokeWidth="0.2" opacity="0.4" />
          
          {/* Forehead top marker */}
          <line x1="30" y1="18" x2="70" y2="18" stroke="white" strokeWidth="0.2" opacity="0.4" />
          
          {/* Corner markers for framing reference */}
          <path d="M8 8 L8 20 M8 8 L20 8" stroke="white" strokeWidth="0.4" opacity="0.6" />
          <path d="M92 8 L92 20 M92 8 L80 8" stroke="white" strokeWidth="0.4" opacity="0.6" />
          <path d="M8 125 L8 113 M8 125 L20 125" stroke="white" strokeWidth="0.4" opacity="0.6" />
          <path d="M92 125 L92 113 M92 125 L80 125" stroke="white" strokeWidth="0.4" opacity="0.6" />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="faceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Expression icon overlay */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-52 opacity-25">
          {guide.icon}
        </div>
        
        {/* Level indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 rounded-lg px-2 py-1">
          <div className="w-8 h-0.5 bg-white/60 rounded" />
          <span className="text-white/80 text-[10px] font-medium">NÍVEL</span>
        </div>
        
        {/* Distance indicator */}
        <div className="absolute top-4 right-4 flex flex-col items-center bg-black/40 rounded-lg px-2 py-1">
          <span className="text-white/80 text-[10px] font-medium">40-60cm</span>
          <span className="text-white/50 text-[8px]">distância ideal</span>
        </div>
      </div>
    );
  }
  
  if (frameType === "profile_left") {
    return (
      <div className="absolute inset-0 pointer-events-none">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 133" preserveAspectRatio="xMidYMid meet">
          {/* Corner markers */}
          <path d="M8 8 L8 20 M8 8 L20 8" stroke="white" strokeWidth="0.4" opacity="0.6" />
          <path d="M92 8 L92 20 M92 8 L80 8" stroke="white" strokeWidth="0.4" opacity="0.6" />
          <path d="M8 125 L8 113 M8 125 L20 125" stroke="white" strokeWidth="0.4" opacity="0.6" />
          <path d="M92 125 L92 113 M92 125 L80 125" stroke="white" strokeWidth="0.4" opacity="0.6" />
          
          {/* Profile silhouette guide - left profile (face looking right) */}
          <path 
            d="M55 18 
               Q70 20 72 35 
               L74 50 
               Q76 58 72 65 
               L68 75 
               Q64 82 60 88 
               L55 95 
               Q52 98 48 95
               L48 90
               Q48 85 50 80
               L45 75
               Q40 70 38 60
               L38 45
               Q38 30 45 22
               Q50 18 55 18" 
            fill="none" 
            stroke="url(#profileGradient)" 
            strokeWidth="0.6"
            strokeDasharray="4 2"
          />
          
          {/* Eye level */}
          <line x1="20" y1="42" x2="80" y2="42" stroke="#22c55e" strokeWidth="0.2" opacity="0.4" />
          
          {/* Nose tip marker */}
          <circle cx="76" cy="52" r="3" fill="none" stroke="#3b82f6" strokeWidth="0.3" opacity="0.6" />
          
          {/* Chin marker */}
          <circle cx="60" cy="88" r="3" fill="none" stroke="white" strokeWidth="0.2" opacity="0.4" />
          
          {/* Direction arrow */}
          <path d="M15 66 L25 66 M22 61 L25 66 L22 71" stroke="#22c55e" strokeWidth="0.5" opacity="0.8" />
          <text x="15" y="80" fill="white" fontSize="4" opacity="0.6">GIRAR</text>
          
          <defs>
            <linearGradient id="profileGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Expression icon overlay */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-52 opacity-20">
          {guide.icon}
        </div>
      </div>
    );
  }
  
  if (frameType === "profile_right") {
    return (
      <div className="absolute inset-0 pointer-events-none">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 133" preserveAspectRatio="xMidYMid meet">
          {/* Corner markers */}
          <path d="M8 8 L8 20 M8 8 L20 8" stroke="white" strokeWidth="0.4" opacity="0.6" />
          <path d="M92 8 L92 20 M92 8 L80 8" stroke="white" strokeWidth="0.4" opacity="0.6" />
          <path d="M8 125 L8 113 M8 125 L20 125" stroke="white" strokeWidth="0.4" opacity="0.6" />
          <path d="M92 125 L92 113 M92 125 L80 125" stroke="white" strokeWidth="0.4" opacity="0.6" />
          
          {/* Profile silhouette guide - right profile (face looking left) */}
          <path 
            d="M45 18 
               Q30 20 28 35 
               L26 50 
               Q24 58 28 65 
               L32 75 
               Q36 82 40 88 
               L45 95 
               Q48 98 52 95
               L52 90
               Q52 85 50 80
               L55 75
               Q60 70 62 60
               L62 45
               Q62 30 55 22
               Q50 18 45 18" 
            fill="none" 
            stroke="url(#profileGradientR)" 
            strokeWidth="0.6"
            strokeDasharray="4 2"
          />
          
          {/* Eye level */}
          <line x1="20" y1="42" x2="80" y2="42" stroke="#22c55e" strokeWidth="0.2" opacity="0.4" />
          
          {/* Nose tip marker */}
          <circle cx="24" cy="52" r="3" fill="none" stroke="#3b82f6" strokeWidth="0.3" opacity="0.6" />
          
          {/* Chin marker */}
          <circle cx="40" cy="88" r="3" fill="none" stroke="white" strokeWidth="0.2" opacity="0.4" />
          
          {/* Direction arrow */}
          <path d="M85 66 L75 66 M78 61 L75 66 L78 71" stroke="#22c55e" strokeWidth="0.5" opacity="0.8" />
          <text x="72" y="80" fill="white" fontSize="4" opacity="0.6">GIRAR</text>
          
          <defs>
            <linearGradient id="profileGradientR" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Expression icon overlay */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-52 opacity-20">
          {guide.icon}
        </div>
      </div>
    );
  }
  
  return null;
}

// Tips panel component
function TipsPanel({ tips }: { tips: string[] }) {
  return (
    <div className="absolute top-20 left-4 right-4 z-10">
      <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-white/90 text-xs font-medium">Dicas para foto ideal:</span>
        </div>
        <ul className="space-y-1">
          {tips.map((tip, index) => (
            <li key={index} className="flex items-center gap-2 text-white/70 text-xs">
              <span className="w-1 h-1 bg-green-400 rounded-full" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function CameraCapture({ isOpen, onClose, onCapture, photoLabel, photoType }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [showTips, setShowTips] = useState(true);

  const guide = PHOTO_GUIDES[photoType];
  const frameType = getFrameType(photoType);

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
          height: { ideal: 1920 },
          aspectRatio: { ideal: 3/4 }
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
      // Hide tips after 5 seconds
      const timer = setTimeout(() => setShowTips(false), 5000);
      return () => clearTimeout(timer);
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
    }, "image/jpeg", 0.92);
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
          <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/70 to-transparent">
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

          {/* Tips panel */}
          {showTips && !isLoading && !error && (
            <TipsPanel tips={guide.tips} />
          )}

          {/* Camera View */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
                <span className="text-white/70 text-sm">Iniciando câmera...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 p-6 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mb-4" />
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

          {/* Enhanced framing overlay */}
          <FramingOverlay frameType={frameType} photoType={photoType} />

          {/* Instruction bar at bottom */}
          <div className="absolute bottom-24 left-0 right-0 flex justify-center px-4 z-10">
            <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <p className="text-white/90 text-sm font-medium">
                {guide.instruction}
              </p>
            </div>
          </div>

          {/* Hidden canvas for capturing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black/70 to-transparent">
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
                className="w-18 h-18 rounded-full bg-white border-4 border-white/30 hover:scale-105 active:scale-95 transition-all duration-150 disabled:opacity-50 shadow-lg shadow-black/30"
                style={{ width: '72px', height: '72px' }}
                aria-label="Capturar foto"
              >
                <div className="w-full h-full rounded-full border-2 border-gray-200" />
              </button>

              {/* Info button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 w-12 h-12"
                onClick={() => setShowTips(!showTips)}
                disabled={isLoading || !!error}
              >
                <AlertCircle className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
