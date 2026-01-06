import { useRef, useState, Suspense, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Text, Billboard } from "@react-three/drei";
import * as THREE from "three";

export interface InjectionPoint {
  id: string;
  muscle: string;
  x: number;
  y: number;
  depth: "superficial" | "deep";
  dosage: number;
  notes?: string;
  confidence?: number; // 0.0-1.0 confidence score
  zone?: string; // Zone name for grouping
  relativeX?: number; // Original relative coordinate
  relativeY?: number;
}

export interface DangerZone {
  id: string;
  name: string;
  description: string;
  risk: string;
  vertices: [number, number, number][];
}

interface Face3DViewerProps {
  injectionPoints: InjectionPoint[];
  dangerZones?: DangerZone[];
  onPointClick?: (point: InjectionPoint) => void;
  onPointDosageChange?: (pointId: string, newDosage: number) => void;
  isLoading?: boolean;
  showLabels?: boolean;
  showMuscles?: boolean;
  showDangerZones?: boolean;
}

// Zone-specific 3D mapping configuration based on anatomical curvature
const ZONE_3D_CONFIG: Record<string, { baseZ: number; curveFactor: number; yOffset: number }> = {
  glabella: { baseZ: 1.35, curveFactor: 0.15, yOffset: 0.1 },
  frontalis: { baseZ: 1.0, curveFactor: 0.25, yOffset: 0.3 },
  periorbital: { baseZ: 1.25, curveFactor: 0.30, yOffset: 0 },
  nasal: { baseZ: 1.55, curveFactor: 0.10, yOffset: -0.1 },
  perioral: { baseZ: 1.40, curveFactor: 0.20, yOffset: -0.3 },
  mentalis: { baseZ: 1.20, curveFactor: 0.30, yOffset: -0.5 },
  masseter: { baseZ: 0.60, curveFactor: 0.40, yOffset: -0.2 }
};

// Determine zone from muscle name or coordinates
function determineZone(muscle: string, y: number): string {
  const muscleLower = muscle.toLowerCase();
  
  if (muscleLower.includes('prócero') || muscleLower.includes('procerus') || muscleLower.includes('corrugador') || muscleLower.includes('corrugator')) {
    return 'glabella';
  }
  if (muscleLower.includes('frontal') || muscleLower.includes('frontalis')) {
    return 'frontalis';
  }
  if (muscleLower.includes('orbicular') && (muscleLower.includes('olho') || muscleLower.includes('oculi') || muscleLower.includes('esquerdo') || muscleLower.includes('direito'))) {
    return 'periorbital';
  }
  if (muscleLower.includes('nasal') || muscleLower.includes('nasalis')) {
    return 'nasal';
  }
  if (muscleLower.includes('orbicular') && (muscleLower.includes('boca') || muscleLower.includes('oris'))) {
    return 'perioral';
  }
  if (muscleLower.includes('ment') || muscleLower.includes('queixo')) {
    return 'mentalis';
  }
  if (muscleLower.includes('masseter')) {
    return 'masseter';
  }
  
  // Fallback based on Y coordinate
  if (y < 25) return 'frontalis';
  if (y < 40) return 'glabella';
  if (y < 55) return 'periorbital';
  if (y < 70) return 'perioral';
  return 'mentalis';
}

// Muscle definitions with anatomical data
const MUSCLE_DATA: Record<string, { 
  color: string; 
  label: string;
  labelPosition: [number, number, number];
}> = {
  procerus: { 
    color: "#B85450", 
    label: "Prócero",
    labelPosition: [0, 0.9, 1.6]
  },
  corrugator_left: { 
    color: "#A04040", 
    label: "Corrugador Esq.",
    labelPosition: [-0.8, 0.7, 1.3]
  },
  corrugator_right: { 
    color: "#A04040", 
    label: "Corrugador Dir.",
    labelPosition: [0.8, 0.7, 1.3]
  },
  frontalis: { 
    color: "#C06060", 
    label: "Frontal",
    labelPosition: [0, 1.5, 1.0]
  },
  orbicularis_oculi_left: {
    color: "#9F5050",
    label: "Orbicular do Olho Esq.",
    labelPosition: [-1.0, 0.3, 1.2]
  },
  orbicularis_oculi_right: {
    color: "#9F5050",
    label: "Orbicular do Olho Dir.",
    labelPosition: [1.0, 0.3, 1.2]
  },
  nasalis: {
    color: "#B06060",
    label: "Nasal",
    labelPosition: [0, 0.1, 1.8]
  },
  levator_labii: {
    color: "#A85555",
    label: "Levantador do Lábio",
    labelPosition: [-0.5, -0.2, 1.5]
  },
  zygomaticus_major: {
    color: "#AA5858",
    label: "Zigomático Maior",
    labelPosition: [0.9, -0.3, 1.0]
  },
  zygomaticus_minor: {
    color: "#A55252",
    label: "Zigomático Menor",
    labelPosition: [-0.9, -0.1, 1.1]
  },
  orbicularis_oris: {
    color: "#B06565",
    label: "Orbicular da Boca",
    labelPosition: [0, -0.7, 1.5]
  },
  depressor_anguli: {
    color: "#9A4848",
    label: "Depressor do Ângulo",
    labelPosition: [0.7, -0.9, 1.1]
  },
  mentalis: {
    color: "#A55050",
    label: "Mentual",
    labelPosition: [0, -1.2, 1.3]
  },
  masseter: {
    color: "#8B4545",
    label: "Masseter",
    labelPosition: [1.1, -0.5, 0.6]
  }
};

// Point colors by muscle group
function getMuscleColor(muscle: string): string {
  return MUSCLE_DATA[muscle]?.color || "#B85450";
}

// Convert 2D percentage coordinates to 3D face positions with zone-aware curvature
function percentTo3D(x: number, y: number, muscle?: string): [number, number, number] {
  // Determine the zone based on muscle or y coordinate
  const zone = muscle ? determineZone(muscle, y) : (y < 25 ? 'frontalis' : y < 40 ? 'glabella' : y < 55 ? 'periorbital' : 'perioral');
  const config = ZONE_3D_CONFIG[zone] || { baseZ: 1.2, curveFactor: 0.25, yOffset: 0 };
  
  // Calculate 3D coordinates with anatomically-accurate curvature per zone
  const x3d = ((x - 50) / 50) * 1.4;
  const y3d = ((50 - y) / 50) * 1.8 + 0.2 + config.yOffset * 0.3;
  
  // Zone-specific Z depth with lateral fall-off
  const lateralFalloff = Math.pow(Math.abs(x3d) / 1.4, 2);
  const verticalFactor = Math.pow((y3d - 0.3) / 2, 2);
  const z3d = config.baseZ - lateralFalloff * config.curveFactor - verticalFactor * 0.15;
  
  return [x3d, y3d, Math.max(0.4, z3d)];
}

// Get confidence-based color (green = high, yellow = medium, red = low)
function getConfidenceColor(confidence?: number): string {
  if (!confidence) return "#DC2626"; // Default red
  if (confidence >= 0.8) return "#10B981"; // Green - high confidence
  if (confidence >= 0.6) return "#F59E0B"; // Amber - medium confidence
  return "#EF4444"; // Red - low confidence
}

// Get confidence ring size
function getConfidenceRingSize(confidence?: number): number {
  if (!confidence) return 0.10;
  return 0.08 + confidence * 0.08; // 0.08 to 0.16 based on confidence
}

// Anatomical muscle mesh component
function MuscleMesh({ 
  position, 
  scale, 
  rotation, 
  color,
  geometry = "ellipse"
}: { 
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  geometry?: "ellipse" | "curved" | "strip";
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  return (
    <mesh 
      ref={meshRef}
      position={position} 
      rotation={rotation || [0, 0, 0]}
      scale={scale}
    >
      {geometry === "strip" ? (
        <planeGeometry args={[1, 1, 8, 8]} />
      ) : (
        <sphereGeometry args={[1, 32, 32, 0, Math.PI * 2, 0, Math.PI]} />
      )}
      <meshStandardMaterial 
        color={color}
        roughness={0.7}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Detailed fiber texture for muscles
function MuscleWithFibers({
  position,
  scale,
  rotation,
  color,
  fiberDirection = "vertical"
}: {
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  fiberDirection?: "vertical" | "horizontal" | "diagonal";
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create a simple texture-like pattern using geometry
  const fibers = useMemo(() => {
    const lines: JSX.Element[] = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const offset = (i / count - 0.5) * 0.8;
      lines.push(
        <mesh key={i} position={[fiberDirection === "horizontal" ? 0 : offset, fiberDirection === "horizontal" ? offset : 0, 0.01]}>
          <planeGeometry args={[fiberDirection === "horizontal" ? 0.95 : 0.02, fiberDirection === "horizontal" ? 0.02 : 0.95]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.08} />
        </mesh>
      );
    }
    return lines;
  }, [fiberDirection]);

  return (
    <group position={position} rotation={rotation || [0, 0, 0]} scale={scale}>
      <mesh ref={meshRef}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial 
          color={color}
          roughness={0.65}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      {fibers}
    </group>
  );
}

// Injection point sphere component with confidence visualization
function InjectionPointMesh({ 
  point, 
  onClick,
  isSelected 
}: { 
  point: InjectionPoint; 
  onClick?: () => void;
  isSelected?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const confidenceRingRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Use zone-aware 3D mapping
  const position = percentTo3D(point.x, point.y, point.muscle);
  const muscleLabel = MUSCLE_DATA[point.muscle]?.label || point.muscle;
  
  // Confidence-based visualization
  const confidenceColor = getConfidenceColor(point.confidence);
  const confidenceRingSize = getConfidenceRingSize(point.confidence);
  const confidencePercent = point.confidence ? Math.round(point.confidence * 100) : null;

  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      meshRef.current.scale.setScalar(hovered || isSelected ? scale * 1.4 : scale);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
    if (confidenceRingRef.current && point.confidence) {
      // Subtle pulse based on confidence
      const pulse = 0.9 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      confidenceRingRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={position}>
      {/* Confidence indicator ring (outer) */}
      {point.confidence && (
        <mesh ref={confidenceRingRef}>
          <ringGeometry args={[confidenceRingSize, confidenceRingSize + 0.03, 32]} />
          <meshBasicMaterial 
            color={confidenceColor}
            transparent 
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Selection/hover ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.12, 0.16, 32]} />
        <meshBasicMaterial 
          color={isSelected ? "#FFD700" : "#FFFFFF"} 
          transparent 
          opacity={hovered || isSelected ? 0.9 : 0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner point - color based on depth */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshStandardMaterial 
          color="#DC2626"
          emissive="#DC2626"
          emissiveIntensity={hovered || isSelected ? 1.0 : 0.5}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
      
      {/* Depth indicator ring */}
      <mesh position={[0, 0, 0.01]}>
        <ringGeometry args={[0.08, 0.10, 32]} />
        <meshBasicMaterial 
          color={point.depth === "deep" ? "#7C3AED" : "#10B981"} 
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Enhanced tooltip on hover */}
      {hovered && (
        <Html distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div className="bg-slate-900/95 backdrop-blur-sm border border-amber-500/30 rounded-lg px-4 py-3 shadow-2xl whitespace-nowrap min-w-[200px]">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-amber-400 text-sm">{muscleLabel}</p>
              {confidencePercent !== null && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  confidencePercent >= 80 ? 'bg-emerald-500/20 text-emerald-300' :
                  confidencePercent >= 60 ? 'bg-amber-500/20 text-amber-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {confidencePercent}% conf.
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-white font-semibold text-lg">{point.dosage}U</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                point.depth === "deep" ? "bg-violet-500/20 text-violet-300" : "bg-emerald-500/20 text-emerald-300"
              }`}>
                {point.depth === "deep" ? "Profundo" : "Superficial"}
              </span>
            </div>
            {point.zone && (
              <p className="text-xs text-slate-400 mt-1">Zona: {point.zone}</p>
            )}
            {point.notes && (
              <p className="text-xs text-slate-400 mt-2 border-t border-slate-700 pt-2">{point.notes}</p>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// Anatomical face with visible muscles
function AnatomicalFaceModel({ showMuscles = true }: { showMuscles?: boolean }) {
  const muscleOpacity = showMuscles ? 1 : 0;
  
  return (
    <group>
      {/* Base skull/skin layer - slightly visible under muscles */}
      <mesh position={[0, 0, -0.1]}>
        <sphereGeometry args={[1.7, 64, 64]} />
        <meshStandardMaterial 
          color="#F5E6D3"
          roughness={0.8}
          metalness={0.0}
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* ===== FRONTAL MUSCLE (Forehead) ===== */}
      <group visible={showMuscles}>
        {/* Left frontalis */}
        <MuscleWithFibers
          position={[-0.5, 1.3, 0.9]}
          scale={[0.7, 0.9, 1]}
          rotation={[-0.3, 0.2, 0]}
          color="#C06060"
          fiberDirection="vertical"
        />
        {/* Right frontalis */}
        <MuscleWithFibers
          position={[0.5, 1.3, 0.9]}
          scale={[0.7, 0.9, 1]}
          rotation={[-0.3, -0.2, 0]}
          color="#C06060"
          fiberDirection="vertical"
        />
        {/* Center frontalis */}
        <MuscleWithFibers
          position={[0, 1.4, 1.0]}
          scale={[0.5, 0.7, 1]}
          rotation={[-0.2, 0, 0]}
          color="#B85555"
          fiberDirection="vertical"
        />
      </group>

      {/* ===== PROCERUS MUSCLE (Between eyebrows) ===== */}
      <group visible={showMuscles}>
        <MuscleWithFibers
          position={[0, 0.65, 1.25]}
          scale={[0.25, 0.45, 1]}
          rotation={[-0.1, 0, 0]}
          color="#B85450"
          fiberDirection="vertical"
        />
      </group>

      {/* ===== CORRUGATOR MUSCLES (Eyebrows) ===== */}
      <group visible={showMuscles}>
        {/* Left corrugator */}
        <MuscleWithFibers
          position={[-0.45, 0.6, 1.15]}
          scale={[0.5, 0.18, 1]}
          rotation={[0, 0.3, 0.15]}
          color="#A04040"
          fiberDirection="horizontal"
        />
        {/* Right corrugator */}
        <MuscleWithFibers
          position={[0.45, 0.6, 1.15]}
          scale={[0.5, 0.18, 1]}
          rotation={[0, -0.3, -0.15]}
          color="#A04040"
          fiberDirection="horizontal"
        />
      </group>

      {/* ===== ORBICULARIS OCULI (Around eyes) ===== */}
      <group visible={showMuscles}>
        {/* Left eye orbicularis */}
        <mesh position={[-0.55, 0.35, 1.05]}>
          <torusGeometry args={[0.32, 0.12, 16, 32]} />
          <meshStandardMaterial 
            color="#9F5050"
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
        {/* Right eye orbicularis */}
        <mesh position={[0.55, 0.35, 1.05]}>
          <torusGeometry args={[0.32, 0.12, 16, 32]} />
          <meshStandardMaterial 
            color="#9F5050"
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
      </group>

      {/* ===== NASALIS (Nose) ===== */}
      <group visible={showMuscles}>
        <MuscleWithFibers
          position={[-0.12, 0.05, 1.45]}
          scale={[0.15, 0.35, 1]}
          rotation={[0, 0.2, 0]}
          color="#B06060"
          fiberDirection="vertical"
        />
        <MuscleWithFibers
          position={[0.12, 0.05, 1.45]}
          scale={[0.15, 0.35, 1]}
          rotation={[0, -0.2, 0]}
          color="#B06060"
          fiberDirection="vertical"
        />
      </group>

      {/* ===== LEVATOR LABII (Upper lip lifter) ===== */}
      <group visible={showMuscles}>
        <MuscleWithFibers
          position={[-0.35, -0.15, 1.3]}
          scale={[0.2, 0.4, 1]}
          rotation={[0, 0.15, 0.1]}
          color="#A85555"
          fiberDirection="vertical"
        />
        <MuscleWithFibers
          position={[0.35, -0.15, 1.3]}
          scale={[0.2, 0.4, 1]}
          rotation={[0, -0.15, -0.1]}
          color="#A85555"
          fiberDirection="vertical"
        />
      </group>

      {/* ===== ZYGOMATICUS MAJOR (Smile muscle) ===== */}
      <group visible={showMuscles}>
        <MuscleWithFibers
          position={[-0.7, -0.2, 1.0]}
          scale={[0.55, 0.18, 1]}
          rotation={[0, 0.4, 0.5]}
          color="#AA5858"
          fiberDirection="horizontal"
        />
        <MuscleWithFibers
          position={[0.7, -0.2, 1.0]}
          scale={[0.55, 0.18, 1]}
          rotation={[0, -0.4, -0.5]}
          color="#AA5858"
          fiberDirection="horizontal"
        />
      </group>

      {/* ===== ZYGOMATICUS MINOR ===== */}
      <group visible={showMuscles}>
        <MuscleWithFibers
          position={[-0.55, -0.05, 1.15]}
          scale={[0.35, 0.12, 1]}
          rotation={[0, 0.3, 0.3]}
          color="#A55252"
          fiberDirection="horizontal"
        />
        <MuscleWithFibers
          position={[0.55, -0.05, 1.15]}
          scale={[0.35, 0.12, 1]}
          rotation={[0, -0.3, -0.3]}
          color="#A55252"
          fiberDirection="horizontal"
        />
      </group>

      {/* ===== ORBICULARIS ORIS (Around mouth) ===== */}
      <group visible={showMuscles}>
        <mesh position={[0, -0.55, 1.35]}>
          <torusGeometry args={[0.22, 0.1, 16, 32]} />
          <meshStandardMaterial 
            color="#B06565"
            roughness={0.65}
            metalness={0.1}
          />
        </mesh>
      </group>

      {/* ===== DEPRESSOR ANGULI ORIS ===== */}
      <group visible={showMuscles}>
        <MuscleWithFibers
          position={[-0.4, -0.75, 1.15]}
          scale={[0.2, 0.35, 1]}
          rotation={[0, 0.2, -0.2]}
          color="#9A4848"
          fiberDirection="vertical"
        />
        <MuscleWithFibers
          position={[0.4, -0.75, 1.15]}
          scale={[0.2, 0.35, 1]}
          rotation={[0, -0.2, 0.2]}
          color="#9A4848"
          fiberDirection="vertical"
        />
      </group>

      {/* ===== MENTALIS (Chin) ===== */}
      <group visible={showMuscles}>
        <MuscleWithFibers
          position={[0, -1.0, 1.1]}
          scale={[0.35, 0.35, 1]}
          rotation={[-0.2, 0, 0]}
          color="#A55050"
          fiberDirection="vertical"
        />
      </group>

      {/* ===== MASSETER (Jaw) ===== */}
      <group visible={showMuscles}>
        <MuscleWithFibers
          position={[-0.95, -0.4, 0.6]}
          scale={[0.4, 0.6, 1]}
          rotation={[0, 0.5, 0]}
          color="#8B4545"
          fiberDirection="vertical"
        />
        <MuscleWithFibers
          position={[0.95, -0.4, 0.6]}
          scale={[0.4, 0.6, 1]}
          rotation={[0, -0.5, 0]}
          color="#8B4545"
          fiberDirection="vertical"
        />
      </group>

      {/* ===== BUCCINATOR (Cheek) ===== */}
      <group visible={showMuscles}>
        <MuscleWithFibers
          position={[-0.75, -0.45, 0.9]}
          scale={[0.35, 0.5, 1]}
          rotation={[0, 0.4, 0]}
          color="#A35050"
          fiberDirection="horizontal"
        />
        <MuscleWithFibers
          position={[0.75, -0.45, 0.9]}
          scale={[0.35, 0.5, 1]}
          rotation={[0, -0.4, 0]}
          color="#A35050"
          fiberDirection="horizontal"
        />
      </group>

      {/* ===== RISORIUS ===== */}
      <group visible={showMuscles}>
        <MuscleWithFibers
          position={[-0.65, -0.55, 1.0]}
          scale={[0.4, 0.1, 1]}
          rotation={[0, 0.3, 0.1]}
          color="#9E4E4E"
          fiberDirection="horizontal"
        />
        <MuscleWithFibers
          position={[0.65, -0.55, 1.0]}
          scale={[0.4, 0.1, 1]}
          rotation={[0, -0.3, -0.1]}
          color="#9E4E4E"
          fiberDirection="horizontal"
        />
      </group>

      {/* ===== EYES (Realistic) ===== */}
      <group>
        {/* Left eye */}
        <mesh position={[-0.55, 0.35, 1.25]}>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshStandardMaterial color="#FAFAFA" roughness={0.1} metalness={0.1} />
        </mesh>
        <mesh position={[-0.55, 0.35, 1.38]}>
          <sphereGeometry args={[0.08, 32, 32]} />
          <meshStandardMaterial color="#4A3728" roughness={0.2} />
        </mesh>
        <mesh position={[-0.55, 0.35, 1.44]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="#1A1A1A" roughness={0.1} />
        </mesh>

        {/* Right eye */}
        <mesh position={[0.55, 0.35, 1.25]}>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshStandardMaterial color="#FAFAFA" roughness={0.1} metalness={0.1} />
        </mesh>
        <mesh position={[0.55, 0.35, 1.38]}>
          <sphereGeometry args={[0.08, 32, 32]} />
          <meshStandardMaterial color="#4A3728" roughness={0.2} />
        </mesh>
        <mesh position={[0.55, 0.35, 1.44]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="#1A1A1A" roughness={0.1} />
        </mesh>
      </group>

      {/* ===== NOSE TIP (Skin colored) ===== */}
      <mesh position={[0, -0.15, 1.55]}>
        <sphereGeometry args={[0.15, 24, 24]} />
        <meshStandardMaterial 
          color="#E8D0C0"
          roughness={0.7}
          metalness={0.0}
        />
      </mesh>

      {/* ===== LIPS (Skin colored) ===== */}
      <mesh position={[0, -0.55, 1.5]}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshStandardMaterial 
          color="#C9908A"
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>

      {/* ===== EARS (Simplified) ===== */}
      <mesh position={[-1.4, 0.1, 0]} rotation={[0, 0.3, 0]}>
        <torusGeometry args={[0.25, 0.08, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#E5D0C0" roughness={0.8} />
      </mesh>
      <mesh position={[1.4, 0.1, 0]} rotation={[0, -0.3, 0]}>
        <torusGeometry args={[0.25, 0.08, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#E5D0C0" roughness={0.8} />
      </mesh>

      {/* ===== CONNECTIVE TISSUE / FASCIA (Semi-transparent overlay) ===== */}
      <mesh position={[0, 0.2, 0.8]}>
        <sphereGeometry args={[1.65, 48, 48]} />
        <meshStandardMaterial 
          color="#F0E0D5"
          roughness={0.9}
          metalness={0.0}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

// Danger Zone polygon overlay component
function DangerZoneOverlay({ zone, visible }: { zone: DangerZone; visible: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (zone.vertices.length > 0) {
      s.moveTo(zone.vertices[0][0], zone.vertices[0][1]);
      for (let i = 1; i < zone.vertices.length; i++) {
        s.lineTo(zone.vertices[i][0], zone.vertices[i][1]);
      }
      s.closePath();
    }
    return s;
  }, [zone.vertices]);

  useFrame((state) => {
    if (meshRef.current && visible) {
      // Pulsing effect for danger zones
      const pulse = 0.2 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = hovered ? 0.5 : pulse;
    }
  });

  if (!visible) return null;

  return (
    <group position={[0, 0, 1.6]}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial
          color="#DC2626"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      
      {/* Danger zone border */}
      <lineLoop>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={zone.vertices.length}
            array={new Float32Array(zone.vertices.flat())}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#DC2626" linewidth={2} />
      </lineLoop>

      {/* Tooltip on hover */}
      {hovered && (
        <Html distanceFactor={8} style={{ pointerEvents: "none" }} position={[0, 0, 0.5]}>
          <div className="bg-red-900/95 backdrop-blur-sm border border-red-500/50 rounded-lg px-4 py-3 shadow-2xl whitespace-nowrap min-w-[200px]">
            <p className="font-bold text-red-300 text-sm flex items-center gap-2">
              ⚠️ {zone.name}
            </p>
            <p className="text-white text-xs mt-1">{zone.description}</p>
            <p className="text-red-400 text-xs mt-2 border-t border-red-700 pt-2">
              Risco: {zone.risk}
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}

// Muscle label component
function MuscleLabel({ 
  text, 
  position, 
  visible 
}: { 
  text: string; 
  position: [number, number, number];
  visible: boolean;
}) {
  if (!visible) return null;
  
  return (
    <Billboard position={position} follow={true}>
      <Text
        fontSize={0.12}
        color="#1F2937"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor="#FFFFFF"
        font="/fonts/inter-medium.woff"
      >
        {text}
      </Text>
    </Billboard>
  );
}

// Loading indicator
function LoadingIndicator() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 2;
    }
  });

  return (
    <group position={[0, 0, 2.5]}>
      <mesh ref={meshRef}>
        <torusGeometry args={[0.4, 0.06, 8, 32]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>
      <Html center style={{ pointerEvents: "none" }}>
        <div className="text-amber-500 font-medium text-sm whitespace-nowrap">
          Analisando...
        </div>
      </Html>
    </group>
  );
}

// Default anatomical danger zones based on medical literature
const DEFAULT_DANGER_ZONES: DangerZone[] = [
  {
    id: "orbital_margin_left",
    name: "Margem Orbital Esquerda",
    description: "Evitar injeções abaixo da borda óssea orbital",
    risk: "Ptose palpebral (queda da pálpebra)",
    vertices: [
      [-0.9, 0.15, 0],
      [-0.3, 0.15, 0],
      [-0.3, 0.05, 0],
      [-0.9, 0.05, 0],
    ]
  },
  {
    id: "orbital_margin_right",
    name: "Margem Orbital Direita",
    description: "Evitar injeções abaixo da borda óssea orbital",
    risk: "Ptose palpebral (queda da pálpebra)",
    vertices: [
      [0.3, 0.15, 0],
      [0.9, 0.15, 0],
      [0.9, 0.05, 0],
      [0.3, 0.05, 0],
    ]
  },
  {
    id: "infraorbital_left",
    name: "Área Infraorbital Esquerda",
    description: "Zona de risco para assimetria facial",
    risk: "Assimetria facial e diplopia",
    vertices: [
      [-0.8, 0.0, 0],
      [-0.4, 0.0, 0],
      [-0.4, -0.25, 0],
      [-0.8, -0.25, 0],
    ]
  },
  {
    id: "infraorbital_right",
    name: "Área Infraorbital Direita",
    description: "Zona de risco para assimetria facial",
    risk: "Assimetria facial e diplopia",
    vertices: [
      [0.4, 0.0, 0],
      [0.8, 0.0, 0],
      [0.8, -0.25, 0],
      [0.4, -0.25, 0],
    ]
  },
  {
    id: "labial_commissure_left",
    name: "Comissura Labial Esquerda",
    description: "Evitar aplicações próximas ao canto da boca",
    risk: "Queda do sorriso / assimetria labial",
    vertices: [
      [-0.55, -0.45, 0],
      [-0.35, -0.45, 0],
      [-0.35, -0.65, 0],
      [-0.55, -0.65, 0],
    ]
  },
  {
    id: "labial_commissure_right",
    name: "Comissura Labial Direita",
    description: "Evitar aplicações próximas ao canto da boca",
    risk: "Queda do sorriso / assimetria labial",
    vertices: [
      [0.35, -0.45, 0],
      [0.55, -0.45, 0],
      [0.55, -0.65, 0],
      [0.35, -0.65, 0],
    ]
  },
];

// Main component
export function Face3DViewer({ 
  injectionPoints, 
  dangerZones = DEFAULT_DANGER_ZONES,
  onPointClick,
  isLoading = false,
  showLabels = true,
  showMuscles = true,
  showDangerZones = true
}: Face3DViewerProps) {
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const handlePointClick = (point: InjectionPoint) => {
    setSelectedPointId(point.id);
    onPointClick?.(point);
  };

  return (
    <div className="w-full h-full min-h-[500px] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 rounded-xl overflow-hidden relative">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          {/* Premium lighting setup */}
          <ambientLight intensity={0.5} />
          <directionalLight 
            position={[3, 4, 5]} 
            intensity={0.9} 
            castShadow 
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-3, 2, 4]} intensity={0.5} />
          <directionalLight position={[0, -2, 3]} intensity={0.3} />
          
          {/* Rim lights for depth */}
          <pointLight position={[-3, 0, -1]} intensity={0.4} color="#FFE4C4" />
          <pointLight position={[3, 0, -1]} intensity={0.4} color="#FFE4C4" />
          
          {/* Top highlight */}
          <spotLight 
            position={[0, 5, 3]} 
            intensity={0.6} 
            angle={0.5} 
            penumbra={0.5}
            color="#FFFFFF"
          />

          {/* Anatomical face model */}
          <AnatomicalFaceModel showMuscles={showMuscles} />

          {/* Muscle labels */}
          {showLabels && Object.entries(MUSCLE_DATA).map(([key, data]) => (
            <MuscleLabel 
              key={key}
              text={data.label}
              position={data.labelPosition}
              visible={showMuscles}
            />
          ))}

          {/* Danger zones */}
          {dangerZones.map((zone) => (
            <DangerZoneOverlay
              key={zone.id}
              zone={zone}
              visible={showDangerZones}
            />
          ))}

          {/* Injection points */}
          {injectionPoints.map((point) => (
            <InjectionPointMesh
              key={point.id}
              point={point}
              onClick={() => handlePointClick(point)}
              isSelected={selectedPointId === point.id}
            />
          ))}

          {/* Loading indicator */}
          {isLoading && <LoadingIndicator />}

          {/* Controls */}
          <OrbitControls
            enablePan={true}
            panSpeed={0.5}
            minDistance={3}
            maxDistance={10}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI * 5 / 6}
            minAzimuthAngle={-Math.PI / 2}
            maxAzimuthAngle={Math.PI / 2}
            enableDamping
            dampingFactor={0.05}
            rotateSpeed={0.5}
          />
        </Suspense>
      </Canvas>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-slate-200">
        <h4 className="text-xs font-semibold text-slate-700 mb-2">Legenda</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600 ring-2 ring-white shadow"></div>
            <span className="text-xs text-slate-600">Ponto de Aplicação</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-xs text-slate-600">Superficial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-500"></div>
            <span className="text-xs text-slate-600">Profundo</span>
          </div>
          {showDangerZones && (
            <div className="flex items-center gap-2 pt-1 border-t border-slate-200 mt-1">
              <div className="w-3 h-3 bg-red-500/40 border border-red-500"></div>
              <span className="text-xs text-red-600 font-medium">Zona de Perigo</span>
            </div>
          )}
        </div>
      </div>

      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-slate-200">
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              Arraste para rotacionar
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              Scroll para zoom
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Clique nos pontos
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
