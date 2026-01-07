import { useRef, useState, Suspense, useMemo, useEffect, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Text, Billboard, useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, Columns, Eye, EyeOff, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

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

interface ValidationResult {
  pointId: string;
  isValid: boolean;
  message: string;
  distanceFromCenter: number;
  expectedZone: string;
}

interface OverallValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  pointValidations: ValidationResult[];
  symmetryScore: number;
}

interface Face3DViewerProps {
  injectionPoints: InjectionPoint[];
  dangerZones?: DangerZone[];
  onPointClick?: (point: InjectionPoint) => void;
  onPointDosageChange?: (pointId: string, newDosage: number) => void;
  onValidationResult?: (result: OverallValidation) => void;
  isLoading?: boolean;
  showLabels?: boolean;
  showMuscles?: boolean;
  showDangerZones?: boolean;
  patientPhoto?: string;
}

// ============================================================
// GLB MODEL CALIBRATION - PRECISION TUNING
// These values are calibrated for the Meshy AI anatomical model
// ============================================================

const MODEL_CONFIG = {
  // Scale to fit face in view (calibrated for Meshy AI model)
  scale: 0.022,
  
  // Position offset to center the face
  positionOffset: { x: 0, y: -0.35, z: 0 },
  
  // Rotation offset (if model is not facing forward)
  rotationOffset: { x: 0, y: 0, z: 0 },
  
  // Face bounding box in 3D space (after transformations)
  faceBounds: {
    minX: -1.3,
    maxX: 1.3,
    minY: -1.6,
    maxY: 1.9,
    minZ: 0.4,
    maxZ: 2.1
  },
  
  // Anatomical landmarks for validation (normalized 0-100 coordinates)
  landmarks: {
    glabella: { x: 50, y: 35, z: 1.45 },
    nasion: { x: 50, y: 40, z: 1.50 },
    pronasale: { x: 50, y: 55, z: 1.65 },
    leftPupil: { x: 35, y: 38, z: 1.30 },
    rightPupil: { x: 65, y: 38, z: 1.30 },
    menton: { x: 50, y: 90, z: 1.20 }
  }
};

// ============================================================
// ZONE-SPECIFIC 3D MAPPING WITH ANATOMICAL ACCURACY
// Each zone has precise curvature and positioning parameters
// ============================================================

interface ZoneConfig {
  baseZ: number;
  curveFactor: number;
  yOffset: number;
  xScale: number;
  yScale: number;
  zCurveType: 'spherical' | 'cylindrical' | 'flat';
  anatomicalCenter: { x: number; y: number };
  validRadius: number; // Maximum valid distance from center
  depthAdjustment: number; // Additional Z adjustment for this zone
}

const ZONE_3D_CONFIG: Record<string, ZoneConfig> = {
  frontalis: { 
    baseZ: 1.18, 
    curveFactor: 0.32, 
    yOffset: 0.48, 
    xScale: 1.0, 
    yScale: 1.0,
    zCurveType: 'spherical',
    anatomicalCenter: { x: 50, y: 15 },
    validRadius: 35,
    depthAdjustment: 0
  },
  glabella: { 
    baseZ: 1.42, 
    curveFactor: 0.10, 
    yOffset: 0.22, 
    xScale: 0.65, 
    yScale: 1.0,
    zCurveType: 'cylindrical',
    anatomicalCenter: { x: 50, y: 32 },
    validRadius: 12,
    depthAdjustment: 0.02
  },
  procerus: { 
    baseZ: 1.44, 
    curveFactor: 0.08, 
    yOffset: 0.16, 
    xScale: 0.45, 
    yScale: 1.0,
    zCurveType: 'cylindrical',
    anatomicalCenter: { x: 50, y: 36 },
    validRadius: 8,
    depthAdjustment: 0.03
  },
  corrugator: { 
    baseZ: 1.32, 
    curveFactor: 0.16, 
    yOffset: 0.20, 
    xScale: 0.75, 
    yScale: 1.0,
    zCurveType: 'cylindrical',
    anatomicalCenter: { x: 50, y: 30 },
    validRadius: 18,
    depthAdjustment: 0
  },
  periorbital: { 
    baseZ: 1.26, 
    curveFactor: 0.28, 
    yOffset: 0.06, 
    xScale: 1.05, 
    yScale: 1.0,
    zCurveType: 'spherical',
    anatomicalCenter: { x: 50, y: 40 },
    validRadius: 22,
    depthAdjustment: -0.02
  },
  orbicularis_oculi: { 
    baseZ: 1.24, 
    curveFactor: 0.26, 
    yOffset: 0.10, 
    xScale: 0.98, 
    yScale: 1.0,
    zCurveType: 'spherical',
    anatomicalCenter: { x: 50, y: 42 },
    validRadius: 20,
    depthAdjustment: -0.01
  },
  nasal: { 
    baseZ: 1.58, 
    curveFactor: 0.06, 
    yOffset: -0.10, 
    xScale: 0.38, 
    yScale: 1.0,
    zCurveType: 'cylindrical',
    anatomicalCenter: { x: 50, y: 48 },
    validRadius: 10,
    depthAdjustment: 0.05
  },
  perioral: { 
    baseZ: 1.44, 
    curveFactor: 0.14, 
    yOffset: -0.32, 
    xScale: 0.75, 
    yScale: 1.0,
    zCurveType: 'cylindrical',
    anatomicalCenter: { x: 50, y: 68 },
    validRadius: 15,
    depthAdjustment: 0
  },
  orbicularis_oris: { 
    baseZ: 1.48, 
    curveFactor: 0.10, 
    yOffset: -0.38, 
    xScale: 0.65, 
    yScale: 1.0,
    zCurveType: 'cylindrical',
    anatomicalCenter: { x: 50, y: 72 },
    validRadius: 12,
    depthAdjustment: 0.02
  },
  mentalis: { 
    baseZ: 1.28, 
    curveFactor: 0.22, 
    yOffset: -0.58, 
    xScale: 0.55, 
    yScale: 1.0,
    zCurveType: 'spherical',
    anatomicalCenter: { x: 50, y: 85 },
    validRadius: 12,
    depthAdjustment: -0.02
  },
  masseter: { 
    baseZ: 0.72, 
    curveFactor: 0.32, 
    yOffset: -0.22, 
    xScale: 1.25, 
    yScale: 1.0,
    zCurveType: 'flat',
    anatomicalCenter: { x: 50, y: 58 },
    validRadius: 20,
    depthAdjustment: -0.1
  },
  platysma: { 
    baseZ: 1.12, 
    curveFactor: 0.18, 
    yOffset: -0.78, 
    xScale: 0.95, 
    yScale: 1.0,
    zCurveType: 'cylindrical',
    anatomicalCenter: { x: 50, y: 95 },
    validRadius: 25,
    depthAdjustment: -0.05
  }
};

// Muscle to zone mapping for precise identification
const MUSCLE_ZONE_MAP: Record<string, string> = {
  'procero': 'procerus',
  'procerus': 'procerus',
  'prócero': 'procerus',
  'corrugador': 'corrugator',
  'corrugator': 'corrugator',
  'frontal': 'frontalis',
  'frontalis': 'frontalis',
  'orbicular olho': 'orbicularis_oculi',
  'orbicularis oculi': 'orbicularis_oculi',
  'periorbital': 'periorbital',
  'crow': 'periorbital',
  'pé de galinha': 'periorbital',
  'nasal': 'nasal',
  'nasalis': 'nasal',
  'bunny': 'nasal',
  'perioral': 'perioral',
  'labial': 'perioral',
  'orbicular boca': 'orbicularis_oris',
  'orbicularis oris': 'orbicularis_oris',
  'mentalis': 'mentalis',
  'mental': 'mentalis',
  'mentual': 'mentalis',
  'queixo': 'mentalis',
  'masseter': 'masseter',
  'glabela': 'glabella',
  'glabella': 'glabella',
  'glabelar': 'glabella',
  'platysma': 'platysma',
  'platisma': 'platysma'
};

// ============================================================
// COORDINATE TRANSFORMATION FUNCTIONS
// ============================================================

function determineZone(muscle: string, y: number, x: number): string {
  const muscleLower = muscle.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Exact muscle matching from map
  for (const [key, zone] of Object.entries(MUSCLE_ZONE_MAP)) {
    if (muscleLower.includes(key)) {
      return zone;
    }
  }
  
  // Coordinate-based zone inference with precise anatomical boundaries
  const isLateral = Math.abs(x - 50) > 25;
  const isFarLateral = Math.abs(x - 50) > 35;
  
  if (y < 22) return 'frontalis';
  if (y < 38) {
    if (Math.abs(x - 50) < 8) return 'procerus';
    if (Math.abs(x - 50) < 18) return 'corrugator';
    return 'frontalis';
  }
  if (y < 50) {
    if (isFarLateral) return 'orbicularis_oculi';
    if (isLateral) return 'periorbital';
    return 'glabella';
  }
  if (y < 62) return 'nasal';
  if (y < 78) {
    if (isFarLateral) return 'masseter';
    if (isLateral) return 'perioral';
    return 'orbicularis_oris';
  }
  if (y < 88) return 'mentalis';
  return 'platysma';
}

// Ultra-precise 2D to 3D coordinate transformation with zone awareness
function percentTo3D(x: number, y: number, muscle?: string): [number, number, number] {
  const zone = muscle ? determineZone(muscle, y, x) : determineZone('', y, x);
  const config = ZONE_3D_CONFIG[zone] || ZONE_3D_CONFIG.glabella;
  
  // Normalize coordinates to [-1, 1] range
  const normalizedX = (x - 50) / 50;
  const normalizedY = (50 - y) / 50;
  
  // Apply zone-specific scaling with precision adjustment
  const x3d = normalizedX * 1.35 * config.xScale;
  const y3d = normalizedY * 1.75 * config.yScale + config.yOffset;
  
  // Calculate Z depth based on curve type with anatomical accuracy
  let z3d: number;
  const lateralDistance = Math.abs(normalizedX);
  const verticalDeviation = Math.abs(normalizedY - config.yOffset / 1.75);
  
  switch (config.zCurveType) {
    case 'spherical':
      // Spherical falloff for rounded areas (forehead, eye sockets, chin)
      z3d = config.baseZ - Math.pow(lateralDistance, 2) * config.curveFactor;
      z3d -= verticalDeviation * config.curveFactor * 0.35;
      break;
    case 'cylindrical':
      // Cylindrical for elongated structures (nose, lips, glabella)
      z3d = config.baseZ - Math.pow(lateralDistance, 1.6) * config.curveFactor * 0.75;
      break;
    case 'flat':
      // Near-flat for lateral areas (masseter, jaw)
      z3d = config.baseZ - lateralDistance * config.curveFactor * 0.25;
      break;
    default:
      z3d = config.baseZ;
  }
  
  // Apply depth adjustment for zone precision
  z3d += config.depthAdjustment;
  
  // Ensure minimum depth to stay on face surface
  z3d = Math.max(0.42, z3d);
  
  return [x3d, y3d, z3d];
}

// ============================================================
// ANATOMICAL VALIDATION FUNCTIONS
// ============================================================

function validatePointAnatomically(point: InjectionPoint): ValidationResult {
  const zone = determineZone(point.muscle, point.y, point.x);
  const config = ZONE_3D_CONFIG[zone];
  
  if (!config) {
    return {
      pointId: point.id,
      isValid: false,
      message: `Zona desconhecida para músculo: ${point.muscle}`,
      distanceFromCenter: 999,
      expectedZone: 'unknown'
    };
  }
  
  // Calculate distance from anatomical center
  const dx = point.x - config.anatomicalCenter.x;
  const dy = point.y - config.anatomicalCenter.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  const isValid = distance <= config.validRadius;
  
  return {
    pointId: point.id,
    isValid,
    distanceFromCenter: distance,
    expectedZone: zone,
    message: isValid 
      ? `Ponto válido na zona ${zone}` 
      : `Ponto fora da zona ${zone} (distância: ${distance.toFixed(1)}%, máx: ${config.validRadius}%)`
  };
}

function validateSymmetry(injectionPoints: InjectionPoint[]): { score: number; message: string } {
  const leftPoints = injectionPoints.filter(p => p.x < 45);
  const rightPoints = injectionPoints.filter(p => p.x > 55);
  const centerPoints = injectionPoints.filter(p => p.x >= 45 && p.x <= 55);
  
  // Check bilateral symmetry
  const leftCount = leftPoints.length;
  const rightCount = rightPoints.length;
  
  if (leftCount === 0 && rightCount === 0) {
    return { score: 1.0, message: 'Apenas pontos centrais - simetria não aplicável' };
  }
  
  const symmetryDiff = Math.abs(leftCount - rightCount);
  const totalBilateral = leftCount + rightCount;
  
  if (totalBilateral === 0) {
    return { score: 1.0, message: 'Simetria bilateral perfeita' };
  }
  
  const score = 1 - (symmetryDiff / totalBilateral);
  
  if (score >= 0.9) {
    return { score, message: 'Simetria bilateral excelente' };
  } else if (score >= 0.7) {
    return { score, message: 'Assimetria leve detectada' };
  } else {
    return { score, message: `Assimetria significativa: ${leftCount} pontos à esquerda, ${rightCount} à direita` };
  }
}

function performFullValidation(injectionPoints: InjectionPoint[]): OverallValidation {
  const pointValidations = injectionPoints.map(validatePointAnatomically);
  const symmetryResult = validateSymmetry(injectionPoints);
  
  const errors = pointValidations
    .filter(v => !v.isValid)
    .map(v => v.message);
  
  const warnings: string[] = [];
  
  if (symmetryResult.score < 0.7) {
    warnings.push(symmetryResult.message);
  }
  
  // Check for points too close together
  for (let i = 0; i < injectionPoints.length; i++) {
    for (let j = i + 1; j < injectionPoints.length; j++) {
      const p1 = injectionPoints[i];
      const p2 = injectionPoints[j];
      const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      if (dist < 5) {
        warnings.push(`Pontos ${p1.id} e ${p2.id} muito próximos (${dist.toFixed(1)}%)`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    pointValidations,
    symmetryScore: symmetryResult.score
  };
}

// ============================================================
// VISUAL HELPER FUNCTIONS
// ============================================================

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

// Muscle display data
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

// Default danger zones
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
// 3D COMPONENTS
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
          
          if (child.material) {
            const material = child.material as THREE.MeshStandardMaterial;
            material.roughness = 0.55;
            material.metalness = 0.08;
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
          rotation={[
            MODEL_CONFIG.rotationOffset.x,
            MODEL_CONFIG.rotationOffset.y,
            MODEL_CONFIG.rotationOffset.z
          ]}
        />
      </Center>
    </group>
  );
}

useGLTF.preload('/models/anatomical-face.glb');

function InjectionPointMesh({ 
  point, 
  onClick,
  isSelected,
  validationResult
}: { 
  point: InjectionPoint; 
  onClick?: () => void;
  isSelected?: boolean;
  validationResult?: ValidationResult;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const confidenceRingRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  const position = percentTo3D(point.x, point.y, point.muscle);
  const confidenceColor = getConfidenceColor(point.confidence);
  const confidenceRingSize = getConfidenceRingSize(point.confidence);
  const confidencePercent = point.confidence ? Math.round(point.confidence * 100) : null;
  
  // Validation-based coloring
  const isInvalid = validationResult && !validationResult.isValid;
  const pointColor = isInvalid ? "#EF4444" : "#DC2626";
  
  const muscleLabel = useMemo(() => {
    const muscleLower = point.muscle.toLowerCase();
    if (muscleLower.includes('procero')) return 'Prócero';
    if (muscleLower.includes('corrugador') || muscleLower.includes('corrugator')) {
      if (muscleLower.includes('esq') || muscleLower.includes('left')) return 'Corrugador Esq.';
      if (muscleLower.includes('dir') || muscleLower.includes('right')) return 'Corrugador Dir.';
      return point.x < 50 ? 'Corrugador Esq.' : 'Corrugador Dir.';
    }
    if (muscleLower.includes('frontal')) return 'Frontal';
    if (muscleLower.includes('orbicular') && (muscleLower.includes('olho') || muscleLower.includes('oculi'))) {
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
      {/* Validation warning ring */}
      {isInvalid && (
        <mesh rotation={[0, 0, 0]}>
          <ringGeometry args={[0.18, 0.22, 32]} />
          <meshBasicMaterial 
            color="#EF4444"
            transparent 
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Confidence indicator ring */}
      {point.confidence && !isInvalid && (
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
          color={pointColor}
          emissive={pointColor}
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
              {validationResult && (
                <p className={validationResult.isValid ? 'text-emerald-400' : 'text-red-400'}>
                  {validationResult.isValid ? '✓' : '⚠'} {validationResult.message}
                </p>
              )}
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

// ============================================================
// PHOTO COMPARISON OVERLAY COMPONENT
// ============================================================

interface PhotoComparisonPanelProps {
  patientPhoto: string;
  injectionPoints: InjectionPoint[];
  validationResults: OverallValidation;
}

function PhotoComparisonPanel({ patientPhoto, injectionPoints, validationResults }: PhotoComparisonPanelProps) {
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-300 bg-slate-100">
      <div className="absolute top-2 left-2 z-10">
        <Badge variant="secondary" className="text-xs bg-white/90 backdrop-blur-sm">
          📷 Foto do Paciente
        </Badge>
      </div>
      
      <img 
        src={patientPhoto} 
        alt="Foto do paciente" 
        className="w-full h-full object-cover"
      />
      
      {/* Overlay injection points on photo */}
      <div className="absolute inset-0 pointer-events-none">
        {injectionPoints.map(point => {
          const x = point.x > 1 ? point.x : point.x * 100;
          const y = point.y > 1 ? point.y : point.y * 100;
          const validation = validationResults.pointValidations.find(v => v.pointId === point.id);
          const color = validation && !validation.isValid 
            ? '#EF4444' 
            : getConfidenceColor(point.confidence);
          
          return (
            <div
              key={point.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              {/* Outer ring for validation */}
              {validation && !validation.isValid && (
                <div 
                  className="absolute w-6 h-6 rounded-full border-2 border-red-500 animate-pulse"
                  style={{ left: '-6px', top: '-6px' }}
                />
              )}
              
              {/* Main point */}
              <div
                className="w-3 h-3 rounded-full border-2 border-white shadow-lg"
                style={{ backgroundColor: color }}
                title={`${point.muscle}: ${point.dosage}U`}
              />
              
              {/* Dosage label */}
              <div 
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-900/80 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap"
              >
                {point.dosage}U
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function Face3DViewer({ 
  injectionPoints, 
  dangerZones = DEFAULT_DANGER_ZONES,
  onPointClick,
  onValidationResult,
  isLoading = false,
  showLabels = true,
  showMuscles = true,
  showDangerZones = true,
  patientPhoto
}: Face3DViewerProps) {
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showValidationPanel, setShowValidationPanel] = useState(true);

  const handlePointClick = (point: InjectionPoint) => {
    setSelectedPointId(point.id);
    onPointClick?.(point);
  };

  // Perform full anatomical validation
  const validationResults = useMemo(() => {
    return performFullValidation(injectionPoints);
  }, [injectionPoints]);

  // Notify parent of validation results
  useEffect(() => {
    if (onValidationResult) {
      onValidationResult(validationResults);
    }
  }, [validationResults, onValidationResult]);

  // Calculate overall confidence
  const overallConfidence = useMemo(() => {
    if (injectionPoints.length === 0) return null;
    const validConfidences = injectionPoints.filter(p => p.confidence !== undefined);
    if (validConfidences.length === 0) return null;
    const avg = validConfidences.reduce((sum, p) => sum + (p.confidence || 0), 0) / validConfidences.length;
    return Math.round(avg * 100);
  }, [injectionPoints]);

  return (
    <div className="w-full h-full min-h-[500px] flex flex-col gap-3">
      {/* Controls Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-2">
        <div className="flex items-center gap-4">
          {patientPhoto && (
            <div className="flex items-center gap-2">
              <Switch
                id="show-comparison"
                checked={showComparison}
                onCheckedChange={setShowComparison}
              />
              <Label htmlFor="show-comparison" className="text-sm flex items-center gap-1">
                <Columns className="w-4 h-4" />
                Comparação
              </Label>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Switch
              id="show-validation"
              checked={showValidationPanel}
              onCheckedChange={setShowValidationPanel}
            />
            <Label htmlFor="show-validation" className="text-sm">
              Validação
            </Label>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {overallConfidence !== null && (
            <Badge 
              variant={overallConfidence >= 85 ? "default" : overallConfidence >= 70 ? "secondary" : "destructive"}
              className="text-xs"
            >
              Confiança: {overallConfidence}%
            </Badge>
          )}
          
          <Badge variant="outline" className="text-xs">
            {injectionPoints.length} pontos
          </Badge>
          
          <Badge 
            variant={validationResults.isValid ? "default" : "destructive"}
            className="text-xs"
          >
            {validationResults.isValid ? '✓ Válido' : `${validationResults.errors.length} erros`}
          </Badge>
        </div>
      </div>

      {/* Validation Alerts */}
      {showValidationPanel && (
        <div className="px-2 space-y-2">
          {validationResults.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-700">
                <strong>Erros anatômicos detectados:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {validationResults.errors.slice(0, 3).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {validationResults.errors.length > 3 && (
                    <li>...e mais {validationResults.errors.length - 3} erro(s)</li>
                  )}
                </ul>
              </div>
            </div>
          )}
          
          {validationResults.warnings.length > 0 && validationResults.errors.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">{validationResults.warnings[0]}</p>
            </div>
          )}
          
          {validationResults.isValid && validationResults.warnings.length === 0 && injectionPoints.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <p className="text-xs text-emerald-700">
                Todos os {injectionPoints.length} pontos validados anatomicamente • Simetria: {Math.round(validationResults.symmetryScore * 100)}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main Content - Side by Side Comparison */}
      <div className={`flex-1 min-h-[400px] ${showComparison && patientPhoto ? 'grid grid-cols-2 gap-3 px-2' : 'px-2'}`}>
        {/* Photo Panel */}
        {showComparison && patientPhoto && (
          <PhotoComparisonPanel 
            patientPhoto={patientPhoto}
            injectionPoints={injectionPoints}
            validationResults={validationResults}
          />
        )}
        
        {/* 3D Viewer Panel */}
        <div className={`relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 ${showComparison && patientPhoto ? '' : 'w-full h-full'}`}>
          {showComparison && patientPhoto && (
            <div className="absolute top-2 left-2 z-10">
              <Badge variant="secondary" className="text-xs bg-white/90 backdrop-blur-sm">
                🧠 Modelo 3D Anatômico
              </Badge>
            </div>
          )}
          
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

              {/* Injection points with validation */}
              {injectionPoints.map((point) => {
                const validation = validationResults.pointValidations.find(v => v.pointId === point.id);
                return (
                  <InjectionPointMesh
                    key={point.id}
                    point={point}
                    onClick={() => handlePointClick(point)}
                    isSelected={selectedPointId === point.id}
                    validationResult={validation}
                  />
                );
              })}

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

          {/* Legend - only show if not in comparison mode */}
          {!showComparison && (
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
                  <span className="text-slate-600">Baixa/Inválido</span>
                </div>
                {showDangerZones && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <span className="w-3 h-3 rounded bg-red-500/30 border border-red-500"></span>
                    <span className="text-slate-600">Zona de Risco</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Overall confidence badge */}
          {overallConfidence !== null && !showComparison && (
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
            <span className="text-emerald-400">●</span> GLB Anatômico Calibrado
          </div>
        </div>
      </div>
    </div>
  );
}
