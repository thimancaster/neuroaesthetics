import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, TrendingUp, TrendingDown, Minus, Calendar, User, SlidersHorizontal, ImageIcon, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InjectionPoint } from "./Face3DViewer";
import { Json } from "@/integrations/supabase/types";

interface Analysis {
  id: string;
  created_at: string;
  procerus_dosage: number | null;
  corrugator_dosage: number | null;
  ai_injection_points: InjectionPoint[] | null;
  ai_clinical_notes: string | null;
  ai_confidence: number | null;
  frontal_photo_url: string | null;
  resting_photo_url: string | null;
  glabellar_photo_url: string | null;
  smile_photo_url: string | null;
  patient_id: string;
  patient_gender: string | null;
  product_type: string | null;
}

interface Patient {
  id: string;
  name: string;
  age: number | null;
}

interface BeforeAfterComparisonProps {
  patientId?: string;
  onClose?: () => void;
}

function parseInjectionPoints(data: Json | null): InjectionPoint[] | null {
  if (!data) return null;
  if (Array.isArray(data)) {
    return data as unknown as InjectionPoint[];
  }
  return null;
}

// Interactive photo comparison slider
function PhotoComparisonSlider({ 
  beforeUrl, 
  afterUrl, 
  beforeDate, 
  afterDate 
}: { 
  beforeUrl: string | null;
  afterUrl: string | null;
  beforeDate: string;
  afterDate: string;
}) {
  const [sliderValue, setSliderValue] = useState([50]);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!beforeUrl && !afterUrl) {
    return (
      <div className="aspect-video rounded-lg bg-muted/20 border border-border/50 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Sem fotos para comparação</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div 
        ref={containerRef}
        className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted/20 border border-border/50"
      >
        {/* After image (background) */}
        {afterUrl && (
          <img
            src={afterUrl}
            alt="Depois"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        
        {/* Before image (clipped) */}
        {beforeUrl && (
          <div 
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${sliderValue[0]}%` }}
          >
            <img
              src={beforeUrl}
              alt="Antes"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ 
                width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100%',
                maxWidth: 'none'
              }}
            />
          </div>
        )}

        {/* Slider line */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10"
          style={{ left: `${sliderValue[0]}%`, transform: 'translateX(-50%)' }}
        >
          {/* Handle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-primary">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
          </div>
        </div>

        {/* Labels */}
        <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
          Antes • {beforeDate}
        </div>
        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
          Depois • {afterDate}
        </div>
      </div>

      {/* Slider control */}
      <div className="px-4">
        <Slider
          value={sliderValue}
          onValueChange={setSliderValue}
          min={0}
          max={100}
          step={1}
          className="cursor-pointer"
        />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>← Antes</span>
          <span>Depois →</span>
        </div>
      </div>
    </div>
  );
}

export function BeforeAfterComparison({ patientId, onClose }: BeforeAfterComparisonProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(patientId || null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [beforeAnalysis, setBeforeAnalysis] = useState<Analysis | null>(null);
  const [afterAnalysis, setAfterAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"slider" | "side-by-side">("slider");

  // Carregar pacientes
  useEffect(() => {
    async function fetchPatients() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("patients")
        .select("id, name, age")
        .eq("user_id", user.id)
        .order("name");

      if (data) setPatients(data);
      setIsLoading(false);
    }
    fetchPatients();
  }, []);

  // Carregar análises do paciente selecionado
  useEffect(() => {
    async function fetchAnalyses() {
      if (!selectedPatient) {
        setAnalyses([]);
        return;
      }

      const { data } = await supabase
        .from("analyses")
        .select("*")
        .eq("patient_id", selectedPatient)
        .order("created_at", { ascending: false });

      if (data) {
        const parsed = data.map(a => ({
          ...a,
          ai_injection_points: parseInjectionPoints(a.ai_injection_points),
        }));
        setAnalyses(parsed);
        
        // Auto-selecionar as duas últimas análises se existirem
        if (parsed.length >= 2) {
          setAfterAnalysis(parsed[0]);
          setBeforeAnalysis(parsed[1]);
        } else if (parsed.length === 1) {
          setAfterAnalysis(parsed[0]);
          setBeforeAnalysis(null);
        }
      }
    }
    fetchAnalyses();
  }, [selectedPatient]);

  const calculateDosageChange = (before: number | null, after: number | null) => {
    if (before === null || after === null) return { change: 0, percentage: 0 };
    const change = after - before;
    const percentage = before > 0 ? Math.round((change / before) * 100) : 0;
    return { change, percentage };
  };

  const totalBefore = (beforeAnalysis?.procerus_dosage || 0) + (beforeAnalysis?.corrugator_dosage || 0);
  const totalAfter = (afterAnalysis?.procerus_dosage || 0) + (afterAnalysis?.corrugator_dosage || 0);
  const totalChange = calculateDosageChange(totalBefore, totalAfter);

  const daysBetween = beforeAnalysis && afterAnalysis 
    ? differenceInDays(new Date(afterAnalysis.created_at), new Date(beforeAnalysis.created_at))
    : 0;

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          Carregando...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Comparativo de Evolução
          </CardTitle>
          {beforeAnalysis && afterAnalysis && (
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "slider" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("slider")}
              >
                <SlidersHorizontal className="w-4 h-4 mr-1" />
                Slider
              </Button>
              <Button
                variant={viewMode === "side-by-side" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("side-by-side")}
              >
                <ImageIcon className="w-4 h-4 mr-1" />
                Lado a Lado
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seletor de Paciente */}
        {!patientId && (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Selecionar Paciente
            </label>
            <Select value={selectedPatient || ""} onValueChange={setSelectedPatient}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.age ? `(${p.age} anos)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Seletores de Análises */}
        {selectedPatient && analyses.length >= 2 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Antes (Análise Anterior)
              </label>
              <Select
                value={beforeAnalysis?.id || ""}
                onValueChange={(id) => setBeforeAnalysis(analyses.find((a) => a.id === id) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {analyses.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Depois (Análise Atual)
              </label>
              <Select
                value={afterAnalysis?.id || ""}
                onValueChange={(id) => setAfterAnalysis(analyses.find((a) => a.id === id) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {analyses.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Intervalo entre análises */}
        {beforeAnalysis && afterAnalysis && daysBetween > 0 && (
          <div className="flex justify-center">
            <Badge variant="outline" className="text-sm">
              <Calendar className="w-3 h-3 mr-1" />
              Intervalo: {daysBetween} dias
            </Badge>
          </div>
        )}

        {/* Comparação Visual */}
        {beforeAnalysis && afterAnalysis && (
          <>
            {/* Photo Comparison */}
            {viewMode === "slider" ? (
              <PhotoComparisonSlider
                beforeUrl={beforeAnalysis.resting_photo_url}
                afterUrl={afterAnalysis.resting_photo_url}
                beforeDate={format(new Date(beforeAnalysis.created_at), "dd/MM/yy", { locale: ptBR })}
                afterDate={format(new Date(afterAnalysis.created_at), "dd/MM/yy", { locale: ptBR })}
              />
            ) : (
              /* Side by Side View */
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <p className="text-sm font-medium mb-2 text-center">Antes</p>
                  <p className="text-xs text-muted-foreground text-center mb-2">
                    {format(new Date(beforeAnalysis.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted/20 border border-border/50">
                    {beforeAnalysis.resting_photo_url ? (
                      <img
                        src={beforeAnalysis.resting_photo_url}
                        alt="Antes"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        Sem foto
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-1 flex items-center justify-center">
                  <ArrowRight className="w-8 h-8 text-primary" />
                </div>

                <div className="col-span-1">
                  <p className="text-sm font-medium mb-2 text-center">Depois</p>
                  <p className="text-xs text-muted-foreground text-center mb-2">
                    {format(new Date(afterAnalysis.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted/20 border border-border/50">
                    {afterAnalysis.resting_photo_url ? (
                      <img
                        src={afterAnalysis.resting_photo_url}
                        alt="Depois"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        Sem foto
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Comparação de Dosagens */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Evolução das Dosagens</h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Prócero */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Prócero</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">
                      {beforeAnalysis.procerus_dosage || 0}U → {afterAnalysis.procerus_dosage || 0}U
                    </span>
                    <DosageChangeBadge 
                      {...calculateDosageChange(beforeAnalysis.procerus_dosage, afterAnalysis.procerus_dosage)} 
                    />
                  </div>
                </div>

                {/* Corrugadores */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Corrugadores</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">
                      {beforeAnalysis.corrugator_dosage || 0}U → {afterAnalysis.corrugator_dosage || 0}U
                    </span>
                    <DosageChangeBadge 
                      {...calculateDosageChange(beforeAnalysis.corrugator_dosage, afterAnalysis.corrugator_dosage)} 
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/30">
                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">
                      {totalBefore}U → {totalAfter}U
                    </span>
                    <DosageChangeBadge {...totalChange} />
                  </div>
                </div>
              </div>
            </div>

            {/* Produtos utilizados */}
            {(beforeAnalysis.product_type || afterAnalysis.product_type) && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Produtos: </span>
                {beforeAnalysis.product_type && (
                  <Badge variant="outline">{beforeAnalysis.product_type}</Badge>
                )}
                {afterAnalysis.product_type && beforeAnalysis.product_type !== afterAnalysis.product_type && (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    <Badge variant="outline">{afterAnalysis.product_type}</Badge>
                  </>
                )}
              </div>
            )}

            {/* Observações */}
            {(beforeAnalysis.ai_clinical_notes || afterAnalysis.ai_clinical_notes) && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Observações Clínicas</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
                    <p className="text-xs font-medium mb-1">Antes</p>
                    <p className="text-sm text-muted-foreground">
                      {beforeAnalysis.ai_clinical_notes || "Sem observações"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
                    <p className="text-xs font-medium mb-1">Depois</p>
                    <p className="text-sm text-muted-foreground">
                      {afterAnalysis.ai_clinical_notes || "Sem observações"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Estado vazio */}
        {selectedPatient && analyses.length < 2 && (
          <div className="py-8 text-center text-muted-foreground">
            <p>É necessário pelo menos 2 análises para comparação.</p>
            <p className="text-sm mt-1">
              Este paciente possui {analyses.length} análise{analyses.length !== 1 ? "s" : ""}.
            </p>
          </div>
        )}

        {!selectedPatient && !patientId && (
          <div className="py-8 text-center text-muted-foreground">
            Selecione um paciente para visualizar a evolução.
          </div>
        )}

        {onClose && (
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DosageChangeBadge({ change, percentage }: { change: number; percentage: number }) {
  if (change === 0) {
    return (
      <Badge variant="outline" className="gap-1">
        <Minus className="w-3 h-3" />
        0%
      </Badge>
    );
  }

  if (change > 0) {
    return (
      <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-600 bg-amber-500/10">
        <TrendingUp className="w-3 h-3" />
        +{percentage}%
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 border-green-500/50 text-green-600 bg-green-500/10">
      <TrendingDown className="w-3 h-3" />
      {percentage}%
    </Badge>
  );
}
