import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { History, TrendingUp, TrendingDown, Minus, Calendar, Syringe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PatientHistorySummaryProps {
  patientId: string;
  patientName: string;
}

interface HistoricalAnalysis {
  id: string;
  created_at: string;
  procerus_dosage: number | null;
  corrugator_dosage: number | null;
  ai_injection_points: unknown;
  ai_confidence: number | null;
  product_type: string | null;
}

interface DosageSummary {
  zone: string;
  lastDosage: number;
  averageDosage: number;
  trend: "up" | "down" | "stable";
}

export function PatientHistorySummary({ patientId, patientName }: PatientHistorySummaryProps) {
  const [analyses, setAnalyses] = useState<HistoricalAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [patientId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("analyses")
      .select("id, created_at, procerus_dosage, corrugator_dosage, ai_injection_points, ai_confidence, product_type")
      .eq("patient_id", patientId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(5);

    setAnalyses(data || []);
    setIsLoading(false);
  };

  const calculateDosageSummary = (): DosageSummary[] => {
    if (analyses.length === 0) return [];

    const zones = ["Glabela", "Frontal", "Periocular"];
    const summaries: DosageSummary[] = [];

    // Calculate from ai_injection_points if available
    const lastAnalysis = analyses[0];
    const points = (Array.isArray(lastAnalysis.ai_injection_points) ? lastAnalysis.ai_injection_points : []) as any[];

    const glabelaDosage = points
      .filter(p => p.muscle === "procerus" || p.muscle?.startsWith("corrugator"))
      .reduce((sum, p) => sum + (p.dosage || 0), 0) || 
      (lastAnalysis.procerus_dosage || 0) + (lastAnalysis.corrugator_dosage || 0);

    const frontalDosage = points
      .filter(p => p.muscle === "frontalis")
      .reduce((sum, p) => sum + (p.dosage || 0), 0);

    const periocularDosage = points
      .filter(p => p.muscle?.startsWith("orbicularis"))
      .reduce((sum, p) => sum + (p.dosage || 0), 0);

    if (glabelaDosage > 0) {
      summaries.push({
        zone: "Glabela",
        lastDosage: glabelaDosage,
        averageDosage: glabelaDosage,
        trend: analyses.length > 1 ? "stable" : "stable"
      });
    }

    if (frontalDosage > 0) {
      summaries.push({
        zone: "Frontal",
        lastDosage: frontalDosage,
        averageDosage: frontalDosage,
        trend: "stable"
      });
    }

    if (periocularDosage > 0) {
      summaries.push({
        zone: "Periocular",
        lastDosage: periocularDosage,
        averageDosage: periocularDosage,
        trend: "stable"
      });
    }

    return summaries;
  };

  const getTotalDosage = () => {
    if (analyses.length === 0) return 0;
    const points = (Array.isArray(analyses[0].ai_injection_points) ? analyses[0].ai_injection_points : []) as any[];
    return points.reduce((sum, p) => sum + (p.dosage || 0), 0) || 
      (analyses[0].procerus_dosage || 0) + (analyses[0].corrugator_dosage || 0);
  };

  const getAverageInterval = () => {
    if (analyses.length < 2) return null;
    const intervals: number[] = [];
    for (let i = 0; i < analyses.length - 1; i++) {
      const diff = new Date(analyses[i].created_at).getTime() - new Date(analyses[i + 1].created_at).getTime();
      intervals.push(diff / (1000 * 60 * 60 * 24));
    }
    return Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
  };

  const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
    if (trend === "up") return <TrendingUp className="w-3 h-3 text-amber-500" />;
    if (trend === "down") return <TrendingDown className="w-3 h-3 text-green-500" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-amber-600">
            <Syringe className="w-4 h-4" />
            <span className="text-sm font-medium">Primeira aplicação para {patientName}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Não há histórico de consultas anteriores. A IA usará dosagens conservadoras.
          </p>
        </CardContent>
      </Card>
    );
  }

  const dosageSummary = calculateDosageSummary();
  const averageInterval = getAverageInterval();

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          Histórico de {patientName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            {analyses.length} consulta{analyses.length !== 1 ? "s" : ""} anteriore{analyses.length !== 1 ? "s" : ""}
          </Badge>
          {averageInterval && (
            <Badge variant="outline" className="text-xs">
              Intervalo médio: {averageInterval} dias
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            Última dose total: {getTotalDosage()}U
          </Badge>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Dosagens por zona (última consulta):</p>
          <div className="grid grid-cols-3 gap-2">
            {dosageSummary.map((summary) => (
              <div key={summary.zone} className="bg-background/50 rounded p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendIcon trend={summary.trend} />
                  <span className="text-xs text-muted-foreground">{summary.zone}</span>
                </div>
                <span className="text-sm font-semibold">{summary.lastDosage}U</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>
              Última consulta: {new Date(analyses[0].created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
