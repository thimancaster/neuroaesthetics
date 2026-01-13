import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { 
  Camera, X, SwitchCamera, Loader2, CheckCircle2, AlertCircle, 
  ZoomIn, Sun, Info, Check, XCircle 
} from "lucide-react";

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

interface PhotoQuality {
  brightness: { value: number; status: "good" | "warning" | "error"; message: string };
  focus: { value: number; status: "good" | "warning" | "error"; message: string };
  framing: { value: number; status: "good" | "warning" | "error"; message: string };
  faceDetected: boolean;
  overallScore: number;
  canCapture: boolean;
}

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
function FramingOverlay({ frameType, photoType, faceDetected }: { frameType: FrameType; photoType: PhotoType; faceDetected: boolean }) {
  const guide = PHOTO_GUIDES[photoType];
  const borderColor = faceDetected ? "#22c55e" : "#ef4444";
  
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
          
          {/* Face oval frame - main positioning guide - changes color based on face detection */}
          <ellipse 
            cx="50" 
            cy="52" 
            rx="28" 
            ry="38" 
            fill="none" 
            stroke={borderColor}
            strokeWidth="0.8"
            strokeDasharray="4 2"
            className="transition-colors duration-300"
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
            stroke={borderColor}
            strokeWidth="0.8"
            strokeDasharray="4 2"
            className="transition-colors duration-300"
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
            stroke={borderColor}
            strokeWidth="0.8"
            strokeDasharray="4 2"
            className="transition-colors duration-300"
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

// Quality indicator component
function QualityIndicator({ quality }: { quality: PhotoQuality }) {
  const getStatusColor = (status: "good" | "warning" | "error") => {
    switch (status) {
      case "good": return "bg-green-500";
      case "warning": return "bg-yellow-500";
      case "error": return "bg-red-500";
    }
  };

  const getStatusIcon = (status: "good" | "warning" | "error") => {
    switch (status) {
      case "good": return <Check className="w-3 h-3" />;
      case "warning": return <AlertCircle className="w-3 h-3" />;
      case "error": return <XCircle className="w-3 h-3" />;
    }
  };

  return (
    <div className="absolute top-20 right-4 z-10">
      <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/70 text-[10px]">Qualidade</span>
          <span className={`text-xs font-bold ${quality.overallScore >= 70 ? 'text-green-400' : quality.overallScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            {quality.overallScore}%
          </span>
        </div>
        
        <div className="space-y-1">
          {/* Face Detection */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${quality.faceDetected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-white/60 text-[9px]">
              {quality.faceDetected ? 'Rosto detectado' : 'Rosto não detectado'}
            </span>
          </div>
          
          {/* Brightness */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full flex items-center justify-center text-white ${getStatusColor(quality.brightness.status)}`}>
              {getStatusIcon(quality.brightness.status)}
            </div>
            <span className="text-white/60 text-[9px]">{quality.brightness.message}</span>
          </div>
          
          {/* Focus */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full flex items-center justify-center text-white ${getStatusColor(quality.focus.status)}`}>
              {getStatusIcon(quality.focus.status)}
            </div>
            <span className="text-white/60 text-[9px]">{quality.focus.message}</span>
          </div>
          
          {/* Framing */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full flex items-center justify-center text-white ${getStatusColor(quality.framing.status)}`}>
              {getStatusIcon(quality.framing.status)}
            </div>
            <span className="text-white/60 text-[9px]">{quality.framing.message}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Camera controls panel
function CameraControls({ 
  zoom, 
  exposure, 
  onZoomChange, 
  onExposureChange,
  showControls,
  onToggleControls
}: { 
  zoom: number;
  exposure: number;
  onZoomChange: (value: number) => void;
  onExposureChange: (value: number) => void;
  showControls: boolean;
  onToggleControls: () => void;
}) {
  return (
    <>
      {/* Toggle button */}
      <div className="absolute top-36 left-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          className="bg-black/50 text-white hover:bg-black/70 h-8 px-2"
          onClick={onToggleControls}
        >
          <ZoomIn className="w-4 h-4 mr-1" />
          <Sun className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Controls panel */}
      {showControls && (
        <div className="absolute top-48 left-4 z-10 w-48">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 space-y-4">
            {/* Zoom control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ZoomIn className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-white/70 text-xs">Zoom</span>
                </div>
                <span className="text-white/90 text-xs font-medium">{zoom.toFixed(1)}x</span>
              </div>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(value) => onZoomChange(value[0])}
                className="w-full"
              />
            </div>
            
            {/* Exposure control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-white/70 text-xs">Exposição</span>
                </div>
                <span className="text-white/90 text-xs font-medium">
                  {exposure > 0 ? `+${exposure.toFixed(1)}` : exposure.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[exposure]}
                min={-2}
                max={2}
                step={0.1}
                onValueChange={(value) => onExposureChange(value[0])}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function CameraCapture({ isOpen, onClose, onCapture, photoLabel, photoType }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qualityCanvasRef = useRef<HTMLCanvasElement>(null);
  const faceDetectionRef = useRef<any>(null);
  const qualityCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [showTips, setShowTips] = useState(true);
  
  // New camera control states
  const [zoom, setZoom] = useState(1);
  const [exposure, setExposure] = useState(0);
  const [showControls, setShowControls] = useState(false);
  
  // Photo quality state
  const [photoQuality, setPhotoQuality] = useState<PhotoQuality>({
    brightness: { value: 0, status: "warning", message: "Analisando..." },
    focus: { value: 0, status: "warning", message: "Analisando..." },
    framing: { value: 0, status: "warning", message: "Analisando..." },
    faceDetected: false,
    overallScore: 0,
    canCapture: false
  });

  const guide = PHOTO_GUIDES[photoType];
  const frameType = getFrameType(photoType);

  // Analyze image quality from canvas
  const analyzeImageQuality = useCallback((imageData: ImageData): Omit<PhotoQuality, 'faceDetected' | 'overallScore' | 'canCapture'> => {
    const data = imageData.data;
    let totalBrightness = 0;
    let contrastSum = 0;
    let prevBrightness = 0;
    
    // Analyze brightness and contrast (simplified focus indicator)
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      totalBrightness += brightness;
      
      if (i > 0) {
        contrastSum += Math.abs(brightness - prevBrightness);
      }
      prevBrightness = brightness;
    }
    
    const avgBrightness = totalBrightness / (data.length / 4);
    const avgContrast = contrastSum / (data.length / 4);
    
    // Brightness analysis (ideal: 100-180)
    let brightnessStatus: "good" | "warning" | "error";
    let brightnessMessage: string;
    if (avgBrightness < 50) {
      brightnessStatus = "error";
      brightnessMessage = "Muito escuro";
    } else if (avgBrightness < 80) {
      brightnessStatus = "warning";
      brightnessMessage = "Pouca luz";
    } else if (avgBrightness > 220) {
      brightnessStatus = "error";
      brightnessMessage = "Muito claro";
    } else if (avgBrightness > 190) {
      brightnessStatus = "warning";
      brightnessMessage = "Luz excessiva";
    } else {
      brightnessStatus = "good";
      brightnessMessage = "Iluminação ideal";
    }
    
    // Focus analysis (using contrast as proxy)
    let focusStatus: "good" | "warning" | "error";
    let focusMessage: string;
    if (avgContrast < 5) {
      focusStatus = "error";
      focusMessage = "Fora de foco";
    } else if (avgContrast < 10) {
      focusStatus = "warning";
      focusMessage = "Foco ajustando";
    } else {
      focusStatus = "good";
      focusMessage = "Foco nítido";
    }
    
    // Framing (simplified - based on center brightness distribution)
    const centerX = imageData.width / 2;
    const centerY = imageData.height / 2;
    const frameRadius = Math.min(imageData.width, imageData.height) * 0.35;
    let centerBrightness = 0;
    let centerPixels = 0;
    
    for (let y = 0; y < imageData.height; y += 4) {
      for (let x = 0; x < imageData.width; x += 4) {
        const dx = x - centerX;
        const dy = y - centerY;
        if (Math.sqrt(dx * dx + dy * dy) < frameRadius) {
          const i = (y * imageData.width + x) * 4;
          centerBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
          centerPixels++;
        }
      }
    }
    
    const avgCenterBrightness = centerPixels > 0 ? centerBrightness / centerPixels : 0;
    const framingDiff = Math.abs(avgCenterBrightness - avgBrightness);
    
    let framingStatus: "good" | "warning" | "error";
    let framingMessage: string;
    if (framingDiff > 50) {
      framingStatus = "warning";
      framingMessage = "Ajuste posição";
    } else {
      framingStatus = "good";
      framingMessage = "Enquadramento OK";
    }
    
    return {
      brightness: { value: avgBrightness, status: brightnessStatus, message: brightnessMessage },
      focus: { value: avgContrast, status: focusStatus, message: focusMessage },
      framing: { value: framingDiff, status: framingStatus, message: framingMessage }
    };
  }, []);

  // Simple face detection using canvas analysis
  const detectFace = useCallback((imageData: ImageData): boolean => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Simple skin tone detection in center region
    const centerX = width / 2;
    const centerY = height * 0.4; // Face typically in upper-center
    const checkRadius = Math.min(width, height) * 0.25;
    
    let skinTonePixels = 0;
    let totalChecked = 0;
    
    for (let y = Math.floor(centerY - checkRadius); y < Math.floor(centerY + checkRadius); y += 4) {
      for (let x = Math.floor(centerX - checkRadius); x < Math.floor(centerX + checkRadius); x += 4) {
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        
        const dx = x - centerX;
        const dy = y - centerY;
        if (Math.sqrt(dx * dx + dy * dy) > checkRadius) continue;
        
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Simplified skin tone detection (works for various skin tones)
        const isSkinTone = (
          r > 60 && r < 255 &&
          g > 40 && g < 230 &&
          b > 20 && b < 200 &&
          r > g && g > b &&
          Math.abs(r - g) > 10 &&
          r - b > 15
        );
        
        if (isSkinTone) skinTonePixels++;
        totalChecked++;
      }
    }
    
    const skinRatio = totalChecked > 0 ? skinTonePixels / totalChecked : 0;
    return skinRatio > 0.2; // At least 20% skin tone in center region
  }, []);

  // Quality check loop
  const runQualityCheck = useCallback(() => {
    if (!videoRef.current || !qualityCanvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = qualityCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0) return;
    
    // Use smaller resolution for analysis
    const scale = 0.25;
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    const qualityMetrics = analyzeImageQuality(imageData);
    const faceDetected = detectFace(imageData);
    
    // Calculate overall score
    const scores = {
      brightness: qualityMetrics.brightness.status === "good" ? 30 : qualityMetrics.brightness.status === "warning" ? 15 : 0,
      focus: qualityMetrics.focus.status === "good" ? 30 : qualityMetrics.focus.status === "warning" ? 15 : 0,
      framing: qualityMetrics.framing.status === "good" ? 20 : qualityMetrics.framing.status === "warning" ? 10 : 0,
      face: faceDetected ? 20 : 0
    };
    
    const overallScore = scores.brightness + scores.focus + scores.framing + scores.face;
    const canCapture = overallScore >= 50 && faceDetected;
    
    setPhotoQuality({
      ...qualityMetrics,
      faceDetected,
      overallScore,
      canCapture
    });
  }, [analyzeImageQuality, detectFace]);

  // Apply camera settings
  const applyCameraSettings = useCallback(async () => {
    if (!stream) return;
    
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;
    
    const capabilities = videoTrack.getCapabilities?.() as Record<string, any> | undefined;
    const constraints: Record<string, any> = {};
    
    // Apply zoom if supported
    if (capabilities?.zoom) {
      const minZoom = capabilities.zoom.min || 1;
      const maxZoom = capabilities.zoom.max || 3;
      const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
      constraints.zoom = clampedZoom;
    }
    
    // Apply exposure compensation if supported
    if (capabilities?.exposureCompensation) {
      const minExp = capabilities.exposureCompensation.min || -2;
      const maxExp = capabilities.exposureCompensation.max || 2;
      const clampedExp = Math.max(minExp, Math.min(maxExp, exposure));
      constraints.exposureCompensation = clampedExp;
    }
    
    // Apply brightness as fallback
    if (capabilities?.brightness && !capabilities?.exposureCompensation) {
      const minBright = capabilities.brightness.min || 0;
      const maxBright = capabilities.brightness.max || 255;
      const normalizedExp = ((exposure + 2) / 4) * (maxBright - minBright) + minBright;
      constraints.brightness = normalizedExp;
    }
    
    try {
      await videoTrack.applyConstraints(constraints as MediaTrackConstraints);
    } catch (err) {
      console.log("Camera constraints not fully supported:", err);
    }
  }, [stream, zoom, exposure]);

  useEffect(() => {
    applyCameraSettings();
  }, [zoom, exposure, applyCameraSettings]);

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
      
      // Start quality check interval
      qualityCheckIntervalRef.current = setInterval(runQualityCheck, 500);
      
      return () => {
        clearTimeout(timer);
        if (qualityCheckIntervalRef.current) {
          clearInterval(qualityCheckIntervalRef.current);
        }
      };
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (qualityCheckIntervalRef.current) {
        clearInterval(qualityCheckIntervalRef.current);
      }
    };
  }, [isOpen, facingMode]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Check quality before capture
    if (!photoQuality.canCapture) {
      // Allow capture anyway but show warning
      console.log("Warning: Photo quality below optimal, but allowing capture");
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply zoom transform if needed
    if (zoom > 1) {
      const scale = zoom;
      const sx = (video.videoWidth - video.videoWidth / scale) / 2;
      const sy = (video.videoHeight - video.videoHeight / scale) / 2;
      const sw = video.videoWidth / scale;
      const sh = video.videoHeight / scale;
      context.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    } else {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // Apply exposure/brightness adjustment
    if (exposure !== 0) {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const factor = 1 + (exposure * 0.3); // Subtle adjustment
      
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] * factor));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor));
      }
      
      context.putImageData(imageData, 0, 0);
    }

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
    if (qualityCheckIntervalRef.current) {
      clearInterval(qualityCheckIntervalRef.current);
    }
    // Reset controls
    setZoom(1);
    setExposure(0);
    setShowControls(false);
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

          {/* Quality indicator */}
          {!isLoading && !error && !showTips && (
            <QualityIndicator quality={photoQuality} />
          )}

          {/* Camera controls */}
          {!isLoading && !error && (
            <CameraControls
              zoom={zoom}
              exposure={exposure}
              onZoomChange={setZoom}
              onExposureChange={setExposure}
              showControls={showControls}
              onToggleControls={() => setShowControls(!showControls)}
            />
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
            style={{ 
              transform: facingMode === "user" ? "scaleX(-1)" : "none",
              filter: `brightness(${1 + exposure * 0.15})`
            }}
          />

          {/* Flash effect overlay */}
          {flashActive && (
            <div className="absolute inset-0 bg-white z-30 animate-fade-out" />
          )}

          {/* Enhanced framing overlay with face detection feedback */}
          <FramingOverlay frameType={frameType} photoType={photoType} faceDetected={photoQuality.faceDetected} />

          {/* Face detection status bar */}
          {!isLoading && !error && (
            <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-10">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm ${
                photoQuality.faceDetected 
                  ? 'bg-green-500/30 border border-green-500/50' 
                  : 'bg-red-500/30 border border-red-500/50'
              }`}>
                {photoQuality.faceDetected ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-xs font-medium">Rosto posicionado</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-xs font-medium">Posicione o rosto no centro</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Instruction bar at bottom */}
          <div className="absolute bottom-24 left-0 right-0 flex justify-center px-4 z-10">
            <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                photoQuality.canCapture ? 'bg-green-400' : 'bg-yellow-400'
              }`} />
              <p className="text-white/90 text-sm font-medium">
                {guide.instruction}
              </p>
            </div>
          </div>

          {/* Hidden canvases for capturing and quality analysis */}
          <canvas ref={canvasRef} className="hidden" />
          <canvas ref={qualityCanvasRef} className="hidden" />

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
                className={`w-18 h-18 rounded-full border-4 hover:scale-105 active:scale-95 transition-all duration-150 disabled:opacity-50 shadow-lg shadow-black/30 ${
                  photoQuality.canCapture 
                    ? 'bg-white border-green-400/50' 
                    : 'bg-white/90 border-yellow-400/50'
                }`}
                style={{ width: '72px', height: '72px' }}
                aria-label="Capturar foto"
              >
                <div className={`w-full h-full rounded-full border-2 ${
                  photoQuality.canCapture ? 'border-green-300' : 'border-yellow-300'
                }`} />
              </button>

              {/* Info button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 w-12 h-12"
                onClick={() => setShowTips(!showTips)}
                disabled={isLoading || !!error}
              >
                <Info className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
