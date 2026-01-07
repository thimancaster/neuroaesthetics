import { useRef, useState, Suspense, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Text, Billboard, useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";

export interface InjectionPoint {
  id: string;
  muscle: string;
  x: number;
  y: number;
  depth: "superficial" | "deep";
  dosage: number;
  notes?: string;
  confidence?: number;
  zone?: string;
  relativeX?: number;
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

// ============================================================
// ANATOMICAL COORDINATE MAPPING SYSTEM
// Precision calibration for GLB model with muscle anatomy
// ============================================================

// GLB Model calibration constants - adjust based on actual model dimensions
const MODEL_CONFIG = {
  // Model scale and position offset
  scale: 0.025,
  positionOffset: { x: 0, y: -0.3, z: 0 },
  
  // Face bounding box in model space (after scaling)
  faceBounds: {
    minX: -1.2,
    maxX: 1.2,
    minY: -1.5,
    maxY: 1.8,
    minZ: 0.5,
    maxZ: 2.0
  },
  
  // Anatomical landmarks in normalized coordinates (0-100)
  landmarks: {
    glabella: { x: 50, y: 35, z: 1.45 },
    nasion: { x: 50, y: 40, z: 1.50 },
    pronasale: { x: 50, y: 55, z: 1.65 },
    subnasale: { x: 50, y: 62, z: 1.50 },
    stomion: { x: 50, y: 72, z: 1.45 },
    menton: { x: 50, y: 90, z: 1.20 },
    leftPupil: { x: 35, y: 38, z: 1.30 },
    rightPupil: { x: 65, y: 38, z: 1.30 },
    leftEarTragus: { x: 10, y: 45, z: 0.3 },
    rightEarTragus: { x: 90, y: 45, z: 0.3 }
  }
};

// Zone-specific 3D mapping with anatomically-accurate curvature
interface ZoneConfig {
  baseZ: number;
  curveFactor: number;
  yOffset: number;
  xScale: number;
  zCurveType: 'spherical' | 'cylindrical' | 'flat';
}

const ZONE_3D_CONFIG: Record<string, ZoneConfig> = {
  frontalis: { baseZ: 1.15, curveFactor: 0.35, yOffset: 0.45, xScale: 1.0, zCurveType: 'spherical' },
  glabella: { baseZ: 1.40, curveFactor: 0.12, yOffset: 0.20, xScale: 0.7, zCurveType: 'cylindrical' },
  procerus: { baseZ: 1.42, curveFactor: 0.10, yOffset: 0.15, xScale: 0.5, zCurveType: 'cylindrical' },
  corrugator: { baseZ: 1.30, curveFactor: 0.18, yOffset: 0.18, xScale: 0.8, zCurveType: 'cylindrical' },
  periorbital: { baseZ: 1.25, curveFactor: 0.30, yOffset: 0.05, xScale: 1.1, zCurveType: 'spherical' },
  orbicularis_oculi: { baseZ: 1.22, curveFactor: 0.28, yOffset: 0.08, xScale: 1.0, zCurveType: 'spherical' },
  nasal: { baseZ: 1.55, curveFactor: 0.08, yOffset: -0.12, xScale: 0.4, zCurveType: 'cylindrical' },
  perioral: { baseZ: 1.42, curveFactor: 0.15, yOffset: -0.35, xScale: 0.8, zCurveType: 'cylindrical' },
  orbicularis_oris: { baseZ: 1.45, curveFactor: 0.12, yOffset: -0.40, xScale: 0.7, zCurveType: 'cylindrical' },
  mentalis: { baseZ: 1.25, curveFactor: 0.25, yOffset: -0.60, xScale: 0.6, zCurveType: 'spherical' },
  masseter: { baseZ: 0.70, curveFactor: 0.35, yOffset: -0.25, xScale: 1.3, zCurveType: 'flat' },
  platysma: { baseZ: 1.10, curveFactor: 0.20, yOffset: -0.80, xScale: 1.0, zCurveType: 'cylindrical' }
};

// Determine anatomical zone from muscle name with high precision
function determineZone(muscle: string, y: number, x: number): string {
  const muscleLower = muscle.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Exact muscle matching
  if (muscleLower.includes('procero') || muscleLower === 'procerus') {
    return 'procerus';
  }
  if (muscleLower.includes('corrugador') || muscleLower.includes('corrugator')) {
    return 'corrugator';
  }
  if (muscleLower.includes('frontal') || muscleLower.includes('frontalis')) {
    return 'frontalis';
  }
  if (muscleLower.includes('orbicular') && (muscleLower.includes('olho') || muscleLower.includes('oculi'))) {
    return 'orbicularis_oculi';
  }
  if (muscleLower.includes('orbicular') && (muscleLower.includes('boca') || muscleLower.includes('oris'))) {
    return 'orbicularis_oris';
  }
  if (muscleLower.includes('nasal') || muscleLower.includes('nasalis')) {
    return 'nasal';
  }
  if (muscleLower.includes('ment') || muscleLower.includes('queixo')) {
    return 'mentalis';
  }
  if (muscleLower.includes('masseter')) {
    return 'masseter';
  }
  if (muscleLower.includes('platysma') || muscleLower.includes('platisma')) {
    return 'platysma';
  }
  
  // Zone inference from coordinates with anatomical boundaries
  const isLateral = Math.abs(x - 50) > 25;
  
  if (y < 22) return 'frontalis';
  if (y < 38) {
    if (Math.abs(x - 50) < 10) return 'procerus';
    if (Math.abs(x - 50) < 20) return 'corrugator';
    return 'frontalis';
  }
  if (y < 50) {
    if (isLateral) return 'orbicularis_oculi';
    return 'glabella';
  }
  if (y < 62) return 'nasal';
  if (y < 78) return isLateral ? 'perioral' : 'orbicularis_oris';
  if (y < 88) return 'mentalis';
  return 'platysma';
}

// Ultra-precise 2D to 3D coordinate transformation
function percentTo3D(x: number, y: number, muscle?: string): [number, number, number] {
  const zone = muscle ? determineZone(muscle, y, x) : determineZone('', y, x);
  const config = ZONE_3D_CONFIG[zone] || ZONE_3D_CONFIG.glabella;
  
  // Normalize coordinates to [-1, 1] range
  const normalizedX = (x - 50) / 50;
  const normalizedY = (50 - y) / 50;
  
  // Apply zone-specific scaling
  const x3d = normalizedX * 1.35 * config.xScale;
  const y3d = normalizedY * 1.75 + config.yOffset;
  
  // Calculate Z depth based on curve type
  let z3d: number;
  const lateralDistance = Math.abs(normalizedX);
  
  switch (config.zCurveType) {
    case 'spherical':
      // Spherical falloff (eye sockets, forehead, chin)
      z3d = config.baseZ - Math.pow(lateralDistance, 2) * config.curveFactor;
      break;
    case 'cylindrical':
      // Cylindrical (nose bridge, lips, glabella)
      z3d = config.baseZ - Math.pow(lateralDistance, 1.5) * config.curveFactor * 0.7;
      break;
    case 'flat':
      // Near-flat with slight falloff (masseter, jaw)
      z3d = config.baseZ - lateralDistance * config.curveFactor * 0.3;
      break;
    default:
      z3d = config.baseZ;
  }
  
  // Apply vertical curvature adjustment
  const verticalFactor = Math.pow(Math.abs(normalizedY - 0.2), 2) * 0.1;
  z3d -= verticalFactor;
  
  // Ensure minimum depth to stay on face surface
  z3d = Math.max(0.45, z3d);
  
  return [x3d, y3d, z3d];
}

// Confidence-based color coding (green = high, red = low)
function getConfidenceColor(confidence?: number): string {
  if (!confidence) return "#EF4444";
  if (confidence >= 0.85) return "#10B981";
  if (confidence >= 0.70) return "#22C55E";
  if (confidence >= 0.55) return "#F59E0B";
  if (confidence >= 0.40) return "#F97316";
  return "#EF4444";
}

function getConfidenceRingSize(confidence?: number): number {
  if (!confidence) return 0.08;
  return 0.06 + confidence * 0.10;
}

// Muscle data for labels
const MUSCLE_DATA: Record<string, { color: string; label: string; labelPosition: [number, number, number] }> = {
  procerus: { color: "#B85450", label: "Prócero", labelPosition: [0, 0.55, 1.6] },
  corrugator_left: { color: "#A04040", label: "Corrugador Esq.", labelPosition: [-0.65, 0.45, 1.45] },
  corrugator_right: { color: "#A04040", label: "Corrugador Dir.", labelPosition: [0.65, 0.45, 1.45] },
  frontalis: { color: "#C06060", label: "Frontal", labelPosition: [0, 1.25, 1.2] },
  orbicularis_oculi_left: { color: "#9F5050", label: "Orbicular Olho Esq.", labelPosition: [-0.85, 0.15, 1.35] },
  orbicularis_oculi_right: { color: "#9F5050", label: "Orbicular Olho Dir.", labelPosition: [0.85, 0.15, 1.35] },
  nasalis: { color: "#B06060", label: "Nasal", labelPosition: [0, -0.05, 1.7] },
  orbicularis_oris: { color: "#B06565", label: "Orbicular Boca", labelPosition: [0, -0.55, 1.55] },
  mentalis: { color: "#A55050", label: "Mentual", labelPosition: [0, -0.85, 1.35] },
  masseter_left: { color: "#8B4545", label: "Masseter Esq.", labelPosition: [-1.0, -0.30, 0.85] },
  masseter_right: { color: "#8B4545", label: "Masseter Dir.", labelPosition: [1.0, -0.30, 0.85] }
};

// ============================================================
// GLB MODEL COMPONENT
// ============================================================

function AnatomicalGLBModel({ showMuscles = true }: { showMuscles?: boolean }) {
  const { scene } = useGLTF('/models/anatomical-face.glb');
  const modelRef = useRef<THREE.Group>(null);
  
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Ensure materials are properly configured
          if (child.material) {
            const material = child.material as THREE.MeshStandardMaterial;
            material.roughness = 0.6;
            material.metalness = 0.1;
            material.needsUpdate = true;
          }
        }
      });
    }
  }, [scene]);
  
  return (
    <group ref={modelRef}>
      <Center>
        <primitive 
          object={scene} 
          scale={MODEL_CONFIG.scale}
          position={[
            MODEL_CONFIG.positionOffset.x,
            MODEL_CONFIG.positionOffset.y,
            MODEL_CONFIG.positionOffset.z
          ]}
          rotation={[0, 0, 0]}
        />
      </Center>
    </group>
  );
}

// Preload the GLB model
useGLTF.preload('/models/anatomical-face.glb');

// ============================================================
// INJECTION POINT VISUALIZATION
// ============================================================

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
  
  const position = percentTo3D(point.x, point.y, point.muscle);
  const confidenceColor = getConfidenceColor(point.confidence);
  const confidenceRingSize = getConfidenceRingSize(point.confidence);
  const confidencePercent = point.confidence ? Math.round(point.confidence * 100) : null;
  
  // Get readable muscle name
  const muscleLabel = useMemo(() => {
    const muscleLower = point.muscle.toLowerCase();
    if (muscleLower.includes('procero')) return 'Prócero';
    if (muscleLower.includes('corrugador') || muscleLower.includes('corrugator')) {
      if (muscleLower.includes('esq') || muscleLower.includes('left')) return 'Corrugador Esq.';
      if (muscleLower.includes('dir') || muscleLower.includes('right')) return 'Corrugador Dir.';
      return point.x < 50 ? 'Corrugador Esq.' : 'Corrugador Dir.';
    }
    if (muscleLower.includes('frontal')) return 'Frontal';
    if (muscleLower.includes('orbicular') && muscleLower.includes('olho')) {
      return point.x < 50 ? 'Orbicular Olho Esq.' : 'Orbicular Olho Dir.';
    }
    if (muscleLower.includes('orbicular') && muscleLower.includes('oculi')) {
      return point.x < 50 ? 'Orbicular Olho Esq.' : 'Orbicular Olho Dir.';
    }
    if (muscleLower.includes('nasal')) return 'Nasal';
    if (muscleLower.includes('ment')) return 'Mentual';
    if (muscleLower.includes('masseter')) {
      return point.x < 50 ? 'Masseter Esq.' : 'Masseter Dir.';
    }
    return point.muscle;
  }, [point.muscle, point.x]);

  useFrame((state) => {
    if (meshRef.current) {
      const baseScale = hovered || isSelected ? 1.5 : 1;
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.12;
      meshRef.current.scale.setScalar(baseScale * pulse);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.4;
    }
    if (confidenceRingRef.current && point.confidence) {
      const pulse = 0.92 + Math.sin(state.clock.elapsedTime * 1.8) * 0.08;
      confidenceRingRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={position}>
      {/* Confidence indicator ring */}
      {point.confidence && (
        <mesh ref={confidenceRingRef} rotation={[0, 0, 0]}>
          <ringGeometry args={[confidenceRingSize, confidenceRingSize + 0.025, 32]} />
          <meshBasicMaterial 
            color={confidenceColor}
            transparent 
            opacity={0.75}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Selection ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.10, 0.14, 32]} />
        <meshBasicMaterial 
          color={isSelected ? "#FFD700" : "#FFFFFF"} 
          transparent 
          opacity={hovered || isSelected ? 0.9 : 0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Main injection point sphere */}
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
        <sphereGeometry args={[0.055, 24, 24]} />
        <meshStandardMaterial 
          color="#DC2626"
          emissive="#DC2626"
          emissiveIntensity={hovered || isSelected ? 1.2 : 0.6}
          metalness={0.4}
          roughness={0.25}
        />
      </mesh>
      
      {/* Depth indicator */}
      <mesh position={[0, 0, 0.008]}>
        <ringGeometry args={[0.065, 0.085, 32]} />
        <meshBasicMaterial 
          color={point.depth === "deep" ? "#7C3AED" : "#10B981"} 
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Enhanced tooltip */}
      {hovered && (
        <Html distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div className="bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-xl px-4 py-3 shadow-2xl whitespace-nowrap min-w-[220px]">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-amber-400 text-sm">{muscleLabel}</p>
              {confidencePercent !== null && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  confidencePercent >= 85 ? 'bg-emerald-500/25 text-emerald-300' :
                  confidencePercent >= 70 ? 'bg-green-500/25 text-green-300' :
                  confidencePercent >= 55 ? 'bg-amber-500/25 text-amber-300' :
                  'bg-red-500/25 text-red-300'
                }`}>
                  {confidencePercent}% confiança
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-white font-bold text-xl">{point.dosage}U</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                point.depth === "deep" 
                  ? "bg-violet-500/25 text-violet-300 border border-violet-500/30" 
                  : "bg-emerald-500/25 text-emerald-300 border border-emerald-500/30"
              }`}>
                {point.depth === "deep" ? "Profundo (intramuscular)" : "Superficial (subdérmico)"}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-700/50">
              <p>Coordenadas: X={point.x.toFixed(1)}% Y={point.y.toFixed(1)}%</p>
              {point.zone && <p>Zona: {point.zone}</p>}
            </div>
            {point.notes && (
              <p className="text-xs text-slate-300 mt-2 pt-2 border-t border-slate-700/50 italic">
                {point.notes}
              </p>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// ============================================================
// DANGER ZONE VISUALIZATION
// ============================================================

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
      const pulse = 0.18 + Math.sin(state.clock.elapsedTime * 2) * 0.08;
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = hovered ? 0.45 : pulse;
    }
  });

  if (!visible) return null;

  return (
    <group position={[0, 0, 1.55]}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial
          color="#DC2626"
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      
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

      {hovered && (
        <Html distanceFactor={8} style={{ pointerEvents: "none" }} position={[0, 0, 0.4]}>
          <div className="bg-red-900/95 backdrop-blur-md border border-red-500/50 rounded-xl px-4 py-3 shadow-2xl whitespace-nowrap min-w-[220px]">
            <p className="font-bold text-red-300 text-sm flex items-center gap-2">
              ⚠️ {zone.name}
            </p>
            <p className="text-white text-xs mt-1">{zone.description}</p>
            <p className="text-red-400 text-xs mt-2 pt-2 border-t border-red-700/50">
              Risco: {zone.risk}
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}

// ============================================================
// MUSCLE LABELS
// ============================================================

function MuscleLabel({ text, position, visible }: { text: string; position: [number, number, number]; visible: boolean }) {
  if (!visible) return null;
  
  return (
    <Billboard position={position} follow={true}>
      <Text
        fontSize={0.10}
        color="#1F2937"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor="#FFFFFF"
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
        <torusGeometry args={[0.35, 0.05, 8, 32]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>
      <Html center style={{ pointerEvents: "none" }}>
        <div className="text-amber-500 font-medium text-sm whitespace-nowrap">
          Analisando com precisão...
        </div>
      </Html>
    </group>
  );
}

// Default danger zones based on medical literature
const DEFAULT_DANGER_ZONES: DangerZone[] = [
  {
    id: "orbital_margin_left",
    name: "Margem Orbital Esquerda",
    description: "Evitar injeções abaixo da borda óssea orbital",
    risk: "Ptose palpebral (queda da pálpebra)",
    vertices: [[-0.85, 0.12, 0], [-0.28, 0.12, 0], [-0.28, 0.02, 0], [-0.85, 0.02, 0]]
  },
  {
    id: "orbital_margin_right",
    name: "Margem Orbital Direita",
    description: "Evitar injeções abaixo da borda óssea orbital",
    risk: "Ptose palpebral (queda da pálpebra)",
    vertices: [[0.28, 0.12, 0], [0.85, 0.12, 0], [0.85, 0.02, 0], [0.28, 0.02, 0]]
  },
  {
    id: "infraorbital_left",
    name: "Área Infraorbital Esquerda",
    description: "Zona de risco para assimetria facial",
    risk: "Assimetria facial e diplopia",
    vertices: [[-0.75, -0.02, 0], [-0.38, -0.02, 0], [-0.38, -0.22, 0], [-0.75, -0.22, 0]]
  },
  {
    id: "infraorbital_right",
    name: "Área Infraorbital Direita",
    description: "Zona de risco para assimetria facial",
    risk: "Assimetria facial e diplopia",
    vertices: [[0.38, -0.02, 0], [0.75, -0.02, 0], [0.75, -0.22, 0], [0.38, -0.22, 0]]
  },
  {
    id: "labial_commissure_left",
    name: "Comissura Labial Esquerda",
    description: "Evitar aplicações próximas ao canto da boca",
    risk: "Queda do sorriso / assimetria labial",
    vertices: [[-0.52, -0.42, 0], [-0.32, -0.42, 0], [-0.32, -0.62, 0], [-0.52, -0.62, 0]]
  },
  {
    id: "labial_commissure_right",
    name: "Comissura Labial Direita",
    description: "Evitar aplicações próximas ao canto da boca",
    risk: "Queda do sorriso / assimetria labial",
    vertices: [[0.32, -0.42, 0], [0.52, -0.42, 0], [0.52, -0.62, 0], [0.32, -0.62, 0]]
  }
];

// ============================================================
// MAIN COMPONENT
// ============================================================

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

  // Calculate overall confidence
  const overallConfidence = useMemo(() => {
    if (injectionPoints.length === 0) return null;
    const validConfidences = injectionPoints.filter(p => p.confidence !== undefined);
    if (validConfidences.length === 0) return null;
    const avg = validConfidences.reduce((sum, p) => sum + (p.confidence || 0), 0) / validConfidences.length;
    return Math.round(avg * 100);
  }, [injectionPoints]);

  return (
    <div className="w-full h-full min-h-[500px] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 rounded-xl overflow-hidden relative">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
        shadows
      >
        <Suspense fallback={<LoadingIndicator />}>
          {/* Premium lighting */}
          <ambientLight intensity={0.55} />
          <directionalLight 
            position={[3, 4, 5]} 
            intensity={0.85} 
            castShadow 
            shadow-mapSize={[2048, 2048]}
          />
          <directionalLight position={[-3, 2, 4]} intensity={0.45} />
          <directionalLight position={[0, -2, 3]} intensity={0.25} />
          
          {/* Rim lights */}
          <pointLight position={[-3.5, 0, -1]} intensity={0.35} color="#FFE4C4" />
          <pointLight position={[3.5, 0, -1]} intensity={0.35} color="#FFE4C4" />
          
          {/* Top highlight */}
          <spotLight 
            position={[0, 5, 3]} 
            intensity={0.55} 
            angle={0.5} 
            penumbra={0.5}
            castShadow
          />

          {/* GLB Anatomical Model */}
          <AnatomicalGLBModel showMuscles={showMuscles} />

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

          {/* Loading */}
          {isLoading && <LoadingIndicator />}

          {/* Controls */}
          <OrbitControls
            enablePan={true}
            panSpeed={0.4}
            minDistance={2.5}
            maxDistance={9}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI * 5 / 6}
            minAzimuthAngle={-Math.PI / 2}
            maxAzimuthAngle={Math.PI / 2}
            enableDamping
            dampingFactor={0.05}
            rotateSpeed={0.45}
          />
        </Suspense>
      </Canvas>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-lg border border-slate-200">
        <h4 className="text-xs font-semibold text-slate-700 mb-3">Legenda</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></span>
            <span className="text-slate-600">Ponto de Injeção</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-violet-500 bg-transparent"></span>
            <span className="text-slate-600">Profundo (intramuscular)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-emerald-500 bg-transparent"></span>
            <span className="text-slate-600">Superficial (subdérmico)</span>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600">Alta Confiança (≥85%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-slate-600">Média Confiança (55-84%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-slate-600">Baixa Confiança (&lt;55%)</span>
          </div>
          {showDangerZones && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <span className="w-3 h-3 rounded bg-red-500/30 border border-red-500"></span>
              <span className="text-slate-600">Zona de Risco</span>
            </div>
          )}
        </div>
      </div>

      {/* Overall confidence badge */}
      {overallConfidence !== null && (
        <div className={`absolute top-4 right-4 px-4 py-2 rounded-xl shadow-lg border backdrop-blur-md ${
          overallConfidence >= 85 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700' :
          overallConfidence >= 70 ? 'bg-green-500/15 border-green-500/30 text-green-700' :
          overallConfidence >= 55 ? 'bg-amber-500/15 border-amber-500/30 text-amber-700' :
          'bg-red-500/15 border-red-500/30 text-red-700'
        }`}>
          <div className="text-xs font-medium opacity-75">Confiança Geral</div>
          <div className="text-2xl font-bold">{overallConfidence}%</div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow text-xs text-slate-500">
        🖱️ Arraste para rotacionar • Scroll para zoom • Clique nos pontos para detalhes
      </div>

      {/* Model quality indicator */}
      <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-300">
        <span className="text-emerald-400">●</span> Modelo Anatômico GLB de Alta Fidelidade
      </div>
    </div>
  );
}
