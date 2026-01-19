import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, ArrowLeft, ArrowRight, Check, User, Camera, Crosshair, Loader2, FolderOpen, X, Sparkles, Brain, Eye, Tag, FileDown, Activity, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CameraCapture, PhotoType } from "./CameraCapture";
import { Face3DViewer, InjectionPoint } from "./Face3DViewer";
import { DosageSafetyAlert } from "./DosageSafetyAlert";
import { ProductSelector, TOXIN_PRODUCTS } from "./ProductSelector";
import { TreatmentTemplates } from "./TreatmentTemplates";
import { PatientHistorySummary } from "./PatientHistorySummary";
import { exportAnalysisPdf } from "@/lib/exportPdf";
import { sanitizeError, logError } from "@/lib/errors";

interface PatientData {
  name: string;
  age: string;
  gender: "feminino" | "masculino";
  muscleStrength: "low" | "medium" | "high";
  observations: string;
}

interface PhotoData {
  resting: File | null;
  glabellar: File | null;
  frontal: File | null;
  smile: File | null;
  nasal: File | null;
  perioral: File | null;
  profile_left: File | null;
  profile_right: File | null;
}

interface AIAnalysis {
  injectionPoints: InjectionPoint[];
  totalDosage: {
    procerus: number;
    corrugator: number;
    frontalis?: number;
    orbicularis_oculi?: number;
    other?: number;
    total: number;
  };
  clinicalNotes: string;
  confidence: number;
}

const PHOTO_TYPES: { key: PhotoType; label: string; desc: string; required?: boolean }[] = [
  { key: "resting", label: "Face em Repouso", desc: "Expressão neutra", required: true },
  { key: "glabellar", label: "Contração Glabelar", desc: "Expressão 'Bravo'", required: true },
  { key: "frontal", label: "Contração Frontal", desc: "Expressão 'Surpresa'" },
  { key: "smile", label: "Sorriso Forçado", desc: "Pés de galinha" },
  { key: "nasal", label: "Contração Nasal", desc: "Bunny Lines" },
  { key: "perioral", label: "Contração Perioral", desc: "Código de barras" },
  { key: "profile_left", label: "Perfil Esquerdo", desc: "Lado esquerdo" },
  { key: "profile_right", label: "Perfil Direito", desc: "Lado direito" },
];

interface ExistingPatient {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  observations: string | null;
}

interface NewAnalysisWizardProps {
  existingPatientId?: string;
}

export function NewAnalysisWizard({ existingPatientId }: NewAnalysisWizardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraOpen, setCameraOpen] = useState<PhotoType | null>(null);
  const { toast } = useToast();
  
  // Existing patient mode (return consultation)
  const [existingPatient, setExistingPatient] = useState<ExistingPatient | null>(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const isReturnMode = !!existingPatientId;
  
  // Patient history for AI context
  const [patientHistory, setPatientHistory] = useState<{
    consultationCount: number;
    lastDosages: Record<string, number>;
    averageInterval: number | null;
    lastConsultationDate: string | null;
    clinicalResponse: string | null;
  } | null>(null);
  
  // Product/toxin selection state
  const [selectedProduct, setSelectedProduct] = useState("botox");
  const [conversionFactor, setConversionFactor] = useState(1.0);
  
  const [patientData, setPatientData] = useState<PatientData>({
    name: "",
    age: "",
    gender: "feminino",
    muscleStrength: "medium",
    observations: "",
  });
  
  const [photos, setPhotos] = useState<PhotoData>({
    resting: null,
    glabellar: null,
    frontal: null,
    smile: null,
    nasal: null,
    perioral: null,
    profile_left: null,
    profile_right: null,
  });
  
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<InjectionPoint | null>(null);
  const [showMuscles, setShowMuscles] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showDangerZones, setShowDangerZones] = useState(true);
  const [showExpandedPhotos, setShowExpandedPhotos] = useState(false);
  
  // Temporary photo URLs for preview and AI analysis
  const [photoUrls, setPhotoUrls] = useState<Record<PhotoType, string | null>>({
    resting: null,
    glabellar: null,
    frontal: null,
    smile: null,
    nasal: null,
    perioral: null,
    profile_left: null,
    profile_right: null,
  });

  // Load existing patient data when in return mode
  useEffect(() => {
    if (existingPatientId) {
      loadExistingPatient(existingPatientId);
    }
  }, [existingPatientId]);

  const loadExistingPatient = async (patientId: string) => {
    setIsLoadingPatient(true);
    try {
      // Fetch patient with extended fields
      const { data: patient, error } = await supabase
        .from("patients")
        .select("id, name, age, gender, observations")
        .eq("id", patientId)
        .single();

      if (error) throw error;
      if (patient) {
        setExistingPatient(patient);
        setPatientData({
          name: patient.name,
          age: patient.age?.toString() || "",
          gender: (patient.gender as "feminino" | "masculino") || "feminino",
          muscleStrength: "medium",
          observations: patient.observations || "",
        });
        
        // Fetch patient history for AI context
        const { data: analyses } = await supabase
          .from("analyses")
          .select("id, created_at, procerus_dosage, corrugator_dosage, ai_injection_points, ai_clinical_notes, status")
          .eq("patient_id", patientId)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(10);
        
        if (analyses && analyses.length > 0) {
          const lastAnalysis = analyses[0];
          
          // Calculate dosages from last analysis
          const lastDosages: Record<string, number> = {
            procerus: lastAnalysis.procerus_dosage || 0,
            corrugator: lastAnalysis.corrugator_dosage || 0,
          };
          
          // Extract more detailed dosages from ai_injection_points if available
          if (lastAnalysis.ai_injection_points && Array.isArray(lastAnalysis.ai_injection_points)) {
            const points = lastAnalysis.ai_injection_points as any[];
            const frontalisTotal = points.filter(p => p.muscle === "frontalis").reduce((sum, p) => sum + (p.dosage || 0), 0);
            const orbicularisTotal = points.filter(p => p.muscle?.startsWith("orbicularis_oculi")).reduce((sum, p) => sum + (p.dosage || 0), 0);
            if (frontalisTotal > 0) lastDosages.frontalis = frontalisTotal;
            if (orbicularisTotal > 0) lastDosages.orbicularis = orbicularisTotal;
          }
          
          // Calculate average interval between consultations
          let avgInterval: number | null = null;
          if (analyses.length >= 2) {
            let totalDays = 0;
            for (let i = 1; i < Math.min(analyses.length, 5); i++) {
              const days = Math.abs(
                (new Date(analyses[i - 1].created_at).getTime() - new Date(analyses[i].created_at).getTime()) / (1000 * 60 * 60 * 24)
              );
              totalDays += days;
            }
            avgInterval = Math.round(totalDays / (Math.min(analyses.length, 5) - 1));
          }
          
          setPatientHistory({
            consultationCount: analyses.length,
            lastDosages,
            averageInterval: avgInterval,
            lastConsultationDate: lastAnalysis.created_at.split("T")[0],
            clinicalResponse: lastAnalysis.ai_clinical_notes || null,
          });
        }
      }
    } catch (error) {
      console.error("Error loading patient:", error);
      toast({
        title: "Erro ao carregar paciente",
        description: "Não foi possível carregar os dados do paciente.",
        variant: "destructive",
      });
      navigate("/dashboard/patients");
    } finally {
      setIsLoadingPatient(false);
    }
  };

  const handleProductChange = (productId: string, factor: number) => {
    const previousFactor = conversionFactor;
    setSelectedProduct(productId);
    setConversionFactor(factor);
    
    // Recalculate dosages if we already have analysis
    if (aiAnalysis && factor !== previousFactor) {
      const ratio = factor / previousFactor;
      const updatedPoints = aiAnalysis.injectionPoints.map(p => ({
        ...p,
        dosage: Math.round(p.dosage * ratio)
      }));
      
      const procerusTotal = updatedPoints
        .filter(p => p.muscle === "procerus")
        .reduce((sum, p) => sum + p.dosage, 0);
      
      const corrugatorTotal = updatedPoints
        .filter(p => p.muscle.startsWith("corrugator"))
        .reduce((sum, p) => sum + p.dosage, 0);
      
      const frontalisTotal = updatedPoints
        .filter(p => p.muscle === "frontalis")
        .reduce((sum, p) => sum + p.dosage, 0);
      
      const orbicularisTotal = updatedPoints
        .filter(p => p.muscle.startsWith("orbicularis_oculi"))
        .reduce((sum, p) => sum + p.dosage, 0);
      
      setAiAnalysis({
        ...aiAnalysis,
        injectionPoints: updatedPoints,
        totalDosage: {
          procerus: procerusTotal,
          corrugator: corrugatorTotal,
          frontalis: frontalisTotal,
          orbicularis_oculi: orbicularisTotal,
          total: procerusTotal + corrugatorTotal + frontalisTotal + orbicularisTotal
        }
      });
    }
  };

  const handlePhotoUpload = (type: PhotoType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotos(prev => ({ ...prev, [type]: file }));
      const url = URL.createObjectURL(file);
      setPhotoUrls(prev => ({ ...prev, [type]: url }));
    }
  };

  const handleCameraCapture = (type: PhotoType) => (file: File) => {
    setPhotos(prev => ({ ...prev, [type]: file }));
    const url = URL.createObjectURL(file);
    setPhotoUrls(prev => ({ ...prev, [type]: url }));
  };

  const removePhoto = (type: PhotoType) => {
    if (photoUrls[type]) {
      URL.revokeObjectURL(photoUrls[type]!);
    }
    setPhotos(prev => ({ ...prev, [type]: null }));
    setPhotoUrls(prev => ({ ...prev, [type]: null }));
  };

  const uploadPhotoToStorage = async (file: File, userId: string, patientId: string, photoType: PhotoType): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${patientId}/${photoType}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('patient-photos')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    // Return file path only, not public URL (for security - use signed URLs when displaying)
    return fileName;
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const handleAnalyzePhotos = async () => {
    setIsAnalyzing(true);
    try {
      const imageUrls: string[] = [];
      
      for (const photoType of Object.keys(photos) as PhotoType[]) {
        if (photos[photoType]) {
          imageUrls.push(await fileToBase64(photos[photoType]!));
        }
      }

      if (imageUrls.length === 0) {
        setAiAnalysis({
          injectionPoints: [
            { id: "proc_1", muscle: "procerus", x: 50, y: 25, depth: "deep", dosage: 8, notes: "Ponto central do procerus" },
            { id: "corr_l1", muscle: "corrugator_left", x: 35, y: 22, depth: "deep", dosage: 8, notes: "Corrugador medial esquerdo" },
            { id: "corr_l2", muscle: "corrugator_left", x: 28, y: 20, depth: "superficial", dosage: 6, notes: "Corrugador lateral esquerdo" },
            { id: "corr_r1", muscle: "corrugator_right", x: 65, y: 22, depth: "deep", dosage: 8, notes: "Corrugador medial direito" },
            { id: "corr_r2", muscle: "corrugator_right", x: 72, y: 20, depth: "superficial", dosage: 6, notes: "Corrugador lateral direito" },
          ],
          totalDosage: { procerus: 8, corrugator: 28, total: 36 },
          clinicalNotes: "Análise padrão para tratamento glabelar. Ajuste conforme massa muscular e histórico do paciente.",
          confidence: 0.7
        });
        setStep(3);
        return;
      }

      const { data, error } = await supabase.functions.invoke('analyze-face', {
        body: { 
          imageUrls,
          patientGender: patientData.gender,
          muscleStrength: patientData.muscleStrength,
          patientAge: patientData.age ? parseInt(patientData.age) : undefined,
          patientHistory: isReturnMode ? patientHistory : null,
        }
      });

      if (error) {
        console.error('Analysis error:', error);
        throw new Error(error.message || 'Erro na análise');
      }

      setAiAnalysis(data);
      setStep(3);
      
      toast({
        title: "Análise concluída!",
        description: `${data.injectionPoints?.length || 0} pontos identificados com ${Math.round((data.confidence || 0) * 100)}% de confiança.`,
      });
      
    } catch (error: any) {
      console.error('AI analysis failed:', error);
      toast({
        title: "Erro na análise de IA",
        description: "Usando análise padrão. " + (error.message || ''),
        variant: "destructive",
      });
      
      setAiAnalysis({
        injectionPoints: [
          { id: "proc_1", muscle: "procerus", x: 50, y: 25, depth: "deep", dosage: 8, notes: "Ponto central do procerus" },
          { id: "corr_l1", muscle: "corrugator_left", x: 35, y: 22, depth: "deep", dosage: 8, notes: "Corrugador medial" },
          { id: "corr_r1", muscle: "corrugator_right", x: 65, y: 22, depth: "deep", dosage: 8, notes: "Corrugador medial" },
        ],
        totalDosage: { procerus: 8, corrugator: 16, total: 24 },
        clinicalNotes: "Análise padrão (fallback).",
        confidence: 0.5
      });
      setStep(3);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePointDosageChange = (pointId: string, newDosage: number) => {
    if (!aiAnalysis) return;
    
    const updatedPoints = aiAnalysis.injectionPoints.map(p => 
      p.id === pointId ? { ...p, dosage: newDosage } : p
    );
    
    recalculateTotals(updatedPoints);
  };

  // Handle point position change from 3D drag editing
  const handlePointPositionChange = (pointId: string, newX: number, newY: number) => {
    if (!aiAnalysis) return;
    
    const updatedPoints = aiAnalysis.injectionPoints.map(p => 
      p.id === pointId ? { ...p, x: newX, y: newY } : p
    );
    
    recalculateTotals(updatedPoints);
    
    toast({
      title: "Ponto reposicionado",
      description: `Novas coordenadas: X=${newX.toFixed(1)}%, Y=${newY.toFixed(1)}%`,
    });
  };

  const recalculateTotals = (points: InjectionPoint[]) => {
    const procerusTotal = points
      .filter(p => p.muscle === "procerus")
      .reduce((sum, p) => sum + p.dosage, 0);
    
    const corrugatorTotal = points
      .filter(p => p.muscle.startsWith("corrugator"))
      .reduce((sum, p) => sum + p.dosage, 0);

    const frontalisTotal = points
      .filter(p => p.muscle === "frontalis")
      .reduce((sum, p) => sum + p.dosage, 0);

    const orbicularisTotal = points
      .filter(p => p.muscle.startsWith("orbicularis_oculi"))
      .reduce((sum, p) => sum + p.dosage, 0);
    
    setAiAnalysis(prev => prev ? {
      ...prev,
      injectionPoints: points,
      totalDosage: {
        procerus: procerusTotal,
        corrugator: corrugatorTotal,
        frontalis: frontalisTotal,
        orbicularis_oculi: orbicularisTotal,
        total: procerusTotal + corrugatorTotal + frontalisTotal + orbicularisTotal
      }
    } : null);
  };

  // Handle template application
  const handleApplyTemplates = (points: InjectionPoint[], totalUnits: number) => {
    if (!aiAnalysis) {
      setAiAnalysis({
        injectionPoints: points,
        totalDosage: {
          procerus: 0,
          corrugator: 0,
          total: totalUnits
        },
        clinicalNotes: "Protocolo aplicado via template.",
        confidence: 0.9
      });
    } else {
      // Merge with existing points or replace
      const newPoints = [...aiAnalysis.injectionPoints, ...points];
      recalculateTotals(newPoints);
    }
    
    toast({
      title: "Template aplicado!",
      description: `${points.length} pontos adicionados com total de ${totalUnits}U.`,
    });
  };

  const dosagesByMuscle = useMemo(() => {
    if (!aiAnalysis) return {};
    
    return aiAnalysis.injectionPoints.reduce((acc, point) => {
      acc[point.muscle] = (acc[point.muscle] || 0) + point.dosage;
      return acc;
    }, {} as Record<string, number>);
  }, [aiAnalysis]);

  const handleExportPdf = async () => {
    if (!aiAnalysis) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let doctorName = "";
      let clinicName = "";
      
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, clinic_name")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (profile) {
          doctorName = profile.full_name || "";
          clinicName = profile.clinic_name || "";
        }
      }

      await exportAnalysisPdf({
        patient: patientData,
        injectionPoints: aiAnalysis.injectionPoints,
        totalDosage: aiAnalysis.totalDosage,
        clinicalNotes: aiAnalysis.clinicalNotes,
        confidence: aiAnalysis.confidence,
        doctorName,
        clinicName,
        productName: TOXIN_PRODUCTS.find(p => p.id === selectedProduct)?.name || 'Botox®',
        includeTCLE: true,
      });

      toast({
        title: "PDF exportado!",
        description: "O arquivo foi salvo na pasta de downloads.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao exportar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveAnalysis = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let patientId: string;

      // If return mode, use existing patient; otherwise create new patient
      if (isReturnMode && existingPatient) {
        patientId = existingPatient.id;
      } else {
        const { data: newPatient, error: patientError } = await supabase
          .from('patients')
          .insert({
            user_id: user.id,
            name: patientData.name,
            age: patientData.age ? parseInt(patientData.age) : null,
            observations: patientData.observations,
          })
          .select()
          .single();

        if (patientError) throw patientError;
        patientId = newPatient.id;
      }

      // Upload all photos in parallel
      const photoUploadPromises = (Object.keys(photos) as PhotoType[]).map(async (photoType) => {
        if (photos[photoType]) {
          return {
            type: photoType,
            url: await uploadPhotoToStorage(photos[photoType]!, user.id, patientId, photoType)
          };
        }
        return { type: photoType, url: null };
      });
      
      const uploadedPhotos = await Promise.all(photoUploadPromises);
      const uploadedPhotoUrls: Record<string, string | null> = {};
      uploadedPhotos.forEach(p => {
        uploadedPhotoUrls[`${p.type}_photo_url`] = p.url;
      });

      const { error: analysisError } = await supabase
        .from('analyses')
        .insert({
          user_id: user.id,
          patient_id: patientId,
          procerus_dosage: aiAnalysis?.totalDosage.procerus || 0,
          corrugator_dosage: aiAnalysis?.totalDosage.corrugator || 0,
          resting_photo_url: uploadedPhotoUrls.resting_photo_url,
          glabellar_photo_url: uploadedPhotoUrls.glabellar_photo_url,
          frontal_photo_url: uploadedPhotoUrls.frontal_photo_url,
          smile_photo_url: uploadedPhotoUrls.smile_photo_url,
          nasal_photo_url: uploadedPhotoUrls.nasal_photo_url,
          perioral_photo_url: uploadedPhotoUrls.perioral_photo_url,
          profile_left_photo_url: uploadedPhotoUrls.profile_left_photo_url,
          profile_right_photo_url: uploadedPhotoUrls.profile_right_photo_url,
          ai_injection_points: aiAnalysis?.injectionPoints as any || null,
          ai_clinical_notes: aiAnalysis?.clinicalNotes || null,
          ai_confidence: aiAnalysis?.confidence || null,
          patient_gender: patientData.gender,
          muscle_strength_score: patientData.muscleStrength,
          product_type: TOXIN_PRODUCTS.find(p => p.id === selectedProduct)?.genericName || 'OnabotulinumtoxinA',
          conversion_factor: conversionFactor,
          status: 'completed',
        });

      if (analysisError) throw analysisError;

      toast({
        title: "Análise salva com sucesso!",
        description: "Fotos, dosagens e análise de IA registradas.",
      });

      // Reset form
      setStep(1);
      setPatientData({ name: "", age: "", gender: "feminino", muscleStrength: "medium", observations: "" });
      setPhotos({ resting: null, glabellar: null, frontal: null, smile: null, nasal: null, perioral: null, profile_left: null, profile_right: null });
      setPhotoUrls({ resting: null, glabellar: null, frontal: null, smile: null, nasal: null, perioral: null, profile_left: null, profile_right: null });
      setAiAnalysis(null);
      setSelectedPoint(null);
      setSelectedProduct("botox");
      setConversionFactor(1.0);
      
    } catch (error: unknown) {
      logError(error, 'NewAnalysisWizard.handleComplete');
      toast({
        title: "Erro ao salvar",
        description: sanitizeError(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canProceedStep1 = patientData.name.trim().length > 0;
  const canProceedStep2 = photos.resting || photos.glabellar || photos.frontal;
  
  const photosToShow = showExpandedPhotos ? PHOTO_TYPES : PHOTO_TYPES.slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {[
          { num: 1, label: "Paciente" },
          { num: 2, label: "Fotos" },
          { num: 3, label: "Análise IA" }
        ].map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                  step >= s.num
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.num ? <Check className="w-5 h-5" /> : s.num}
              </div>
              <span className="text-xs mt-1 text-muted-foreground">{s.label}</span>
            </div>
            {i < 2 && (
              <div
                className={`w-20 h-1 mx-2 rounded ${
                  step > s.num ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Patient Data + Product Selection */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <User className="w-5 h-5 text-primary" />
                Dados do Paciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={patientData.name}
                    onChange={(e) => setPatientData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do paciente"
                    className="bg-muted/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Idade</Label>
                  <Input
                    id="age"
                    type="number"
                    value={patientData.age}
                    onChange={(e) => setPatientData(prev => ({ ...prev, age: e.target.value }))}
                    placeholder="Ex: 35"
                    className="bg-muted/30"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Sexo</Label>
                  <Select 
                    value={patientData.gender} 
                    onValueChange={(value: "feminino" | "masculino") => setPatientData(prev => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="masculino">Masculino</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Homens geralmente requerem doses 30-50% maiores
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="muscleStrength" className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Força Muscular
                  </Label>
                  <Select 
                    value={patientData.muscleStrength} 
                    onValueChange={(value: "low" | "medium" | "high") => setPatientData(prev => ({ ...prev, muscleStrength: value }))}
                  >
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Avalie a contração muscular durante expressões faciais
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={patientData.observations}
                  onChange={(e) => setPatientData(prev => ({ ...prev, observations: e.target.value }))}
                  placeholder="Notas clínicas, histórico relevante..."
                  className="bg-muted/30 min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Selection */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-base">
                💉 Toxina Botulínica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductSelector
                selectedProduct={selectedProduct}
                onProductChange={handleProductChange}
              />
            </CardContent>
          </Card>

          <div className="lg:col-span-3 flex justify-end pt-4">
            <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Photo Upload */}
      {step === 2 && (
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <Camera className="w-5 h-5 text-primary" />
                Fotos do Protocolo
              </CardTitle>
              <div className="flex items-center gap-2">
                <Switch
                  id="expanded-photos"
                  checked={showExpandedPhotos}
                  onCheckedChange={setShowExpandedPhotos}
                />
                <Label htmlFor="expanded-photos" className="text-sm cursor-pointer">
                  Protocolo Completo (8 fotos)
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-4 mb-6 ${showExpandedPhotos ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
              {photosToShow.map((photo) => (
                <div key={photo.key} className="space-y-3">
                  <Label className="flex items-center gap-2">
                    {photo.label}
                    {photo.required && <span className="text-xs text-primary">*</span>}
                  </Label>
                  
                  <div className="relative h-40 border-2 border-dashed border-border/50 rounded-lg overflow-hidden bg-muted/20">
                    {photoUrls[photo.key] ? (
                      <>
                        <img
                          src={photoUrls[photo.key]!}
                          alt={photo.label}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 w-7 h-7"
                          onClick={() => removePhoto(photo.key)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">{photo.desc}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setCameraOpen(photo.key)}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Tirar Foto
                    </Button>
                    <label className="flex-1">
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <span>
                          <FolderOpen className="w-4 h-4 mr-2" />
                          Arquivo
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload(photo.key)}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={handleAnalyzePhotos} 
                disabled={isAnalyzing}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analisando com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analisar com IA
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Camera Capture Modal */}
      {cameraOpen && (
        <CameraCapture
          isOpen={!!cameraOpen}
          onClose={() => setCameraOpen(null)}
          onCapture={handleCameraCapture(cameraOpen)}
          photoType={cameraOpen}
          photoLabel={PHOTO_TYPES.find(p => p.key === cameraOpen)?.label || "Foto"}
        />
      )}

      {/* Step 3: AI Analysis & 3D Visualization */}
      {step === 3 && aiAnalysis && (
        <div className="space-y-6">
          {/* AI Analysis Header */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">Análise de IA Concluída</h3>
                    <p className="text-sm text-muted-foreground">
                      {aiAnalysis.injectionPoints.length} pontos identificados • 
                      Confiança: <span className="font-medium text-primary">{Math.round(aiAnalysis.confidence * 100)}%</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{aiAnalysis.totalDosage.total}U</p>
                    <p className="text-xs text-muted-foreground">
                      {TOXIN_PRODUCTS.find(p => p.id === selectedProduct)?.name || 'Botox'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* 3D Face Viewer */}
            <Card className="xl:col-span-3 border-border/50 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-base">
                    <Crosshair className="w-5 h-5 text-primary" />
                    Modelo Anatômico 3D
                  </CardTitle>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="show-muscles"
                        checked={showMuscles}
                        onCheckedChange={setShowMuscles}
                      />
                      <Label htmlFor="show-muscles" className="text-xs flex items-center gap-1 cursor-pointer">
                        <Eye className="w-3.5 h-3.5" />
                        Músculos
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="show-labels"
                        checked={showLabels}
                        onCheckedChange={setShowLabels}
                      />
                      <Label htmlFor="show-labels" className="text-xs flex items-center gap-1 cursor-pointer">
                        <Tag className="w-3.5 h-3.5" />
                        Legendas
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="show-danger-zones"
                        checked={showDangerZones}
                        onCheckedChange={setShowDangerZones}
                      />
                      <Label htmlFor="show-danger-zones" className="text-xs flex items-center gap-1 cursor-pointer text-red-500">
                        ⚠️ Zonas de Perigo
                      </Label>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <div className="h-[500px] relative">
                  <Face3DViewer
                    injectionPoints={aiAnalysis.injectionPoints}
                    onPointClick={setSelectedPoint}
                    onPointPositionChange={handlePointPositionChange}
                    showMuscles={showMuscles}
                    showLabels={showLabels}
                    showDangerZones={showDangerZones}
                    patientPhoto={photoUrls.resting || photoUrls.glabellar || undefined}
                    enableEditing={true}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Right Sidebar - Templates & Dosage */}
            <div className="xl:col-span-2 space-y-4">
              {/* Treatment Templates */}
              <TreatmentTemplates
                patientGender={patientData.gender}
                muscleStrength={patientData.muscleStrength}
                conversionFactor={conversionFactor}
                onSelectTemplate={handleApplyTemplates}
              />

              {/* Dosage Summary */}
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Resumo de Dosagem</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-background/50 border border-border/50 text-center">
                      <p className="text-xl font-bold text-amber-500">{aiAnalysis.totalDosage.procerus}U</p>
                      <p className="text-xs text-muted-foreground">Prócero</p>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50 border border-border/50 text-center">
                      <p className="text-xl font-bold text-violet-500">{aiAnalysis.totalDosage.corrugator}U</p>
                      <p className="text-xs text-muted-foreground">Corrugadores</p>
                    </div>
                    {(aiAnalysis.totalDosage.frontalis || 0) > 0 && (
                      <div className="p-3 rounded-lg bg-background/50 border border-border/50 text-center">
                        <p className="text-xl font-bold text-rose-500">{aiAnalysis.totalDosage.frontalis}U</p>
                        <p className="text-xs text-muted-foreground">Frontal</p>
                      </div>
                    )}
                    {(aiAnalysis.totalDosage.orbicularis_oculi || 0) > 0 && (
                      <div className="p-3 rounded-lg bg-background/50 border border-border/50 text-center">
                        <p className="text-xl font-bold text-pink-500">{aiAnalysis.totalDosage.orbicularis_oculi}U</p>
                        <p className="text-xs text-muted-foreground">Orbicular</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 text-center">
                    <p className="text-3xl font-bold text-foreground">{aiAnalysis.totalDosage.total}U</p>
                    <p className="text-sm text-muted-foreground">Total Geral</p>
                  </div>
                </CardContent>
              </Card>

              {/* Clinical Notes */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    Observações Clínicas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{aiAnalysis.clinicalNotes}</p>
                </CardContent>
              </Card>

              {/* Injection Points List */}
              <Card className="border-border/50 max-h-[350px] overflow-hidden flex flex-col">
                <CardHeader className="pb-2 flex-shrink-0">
                  <CardTitle className="text-base">Pontos de Aplicação ({aiAnalysis.injectionPoints.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 overflow-y-auto flex-1 pr-2">
                  {aiAnalysis.injectionPoints.map((point) => {
                    const muscleColors: Record<string, string> = {
                      procerus: '#F59E0B',
                      corrugator_left: '#8B5CF6',
                      corrugator_right: '#8B5CF6',
                      frontalis: '#F43F5E',
                      orbicularis_oculi_left: '#EC4899',
                      orbicularis_oculi_right: '#EC4899',
                      nasalis: '#06B6D4',
                      mentalis: '#10B981',
                    };
                    const muscleLabels: Record<string, string> = {
                      procerus: 'Prócero',
                      corrugator_left: 'Corrugador Esq.',
                      corrugator_right: 'Corrugador Dir.',
                      frontalis: 'Frontal',
                      orbicularis_oculi_left: 'Orbicular Olho Esq.',
                      orbicularis_oculi_right: 'Orbicular Olho Dir.',
                      nasalis: 'Nasal',
                      levator_labii: 'Levantador Lábio',
                      zygomaticus_major: 'Zigomático Maior',
                      zygomaticus_minor: 'Zigomático Menor',
                      orbicularis_oris: 'Orbicular Boca',
                      depressor_anguli: 'Depressor Ângulo',
                      mentalis: 'Mentual',
                      masseter: 'Masseter',
                    };

                    return (
                      <div 
                        key={point.id}
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                          selectedPoint?.id === point.id 
                            ? 'border-primary bg-primary/10 shadow-md' 
                            : 'border-border/50 hover:border-primary/50 hover:bg-muted/30'
                        }`}
                        onClick={() => setSelectedPoint(point)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white shadow" 
                              style={{ backgroundColor: muscleColors[point.muscle] || '#DC2626' }}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {muscleLabels[point.muscle] || point.muscle}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {point.depth === 'deep' ? '🔵 Profundo' : '🟢 Superficial'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Input
                              type="number"
                              value={point.dosage}
                              onChange={(e) => handlePointDosageChange(point.id, parseInt(e.target.value) || 0)}
                              className="w-14 h-8 text-center text-sm font-semibold"
                              min={0}
                              max={50}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-xs text-muted-foreground font-medium">U</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Alertas de Segurança */}
          <DosageSafetyAlert 
            dosagesByMuscle={dosagesByMuscle} 
            totalDosage={aiAnalysis.totalDosage.total} 
          />

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleExportPdf}>
                <FileDown className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
              <Button onClick={handleSaveAnalysis} disabled={isLoading} size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Salvar Análise
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
