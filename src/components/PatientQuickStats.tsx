import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, Activity, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PatientQuickStatsProps {
  patientId: string;
}

interface Stats {
  totalConsultations: number;
  lastConsultation: string | null;
  hasOngoingDraft: boolean;
  daysSinceLastVisit: number | null;
}

export function PatientQuickStats({ patientId }: PatientQuickStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchStats();
  }, [patientId]);

  const fetchStats = async () => {
    const { data: analyses } = await supabase
      .from("analyses")
      .select("id, created_at, status")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (analyses) {
      const lastCompleted = analyses.find(a => a.status === "completed");
      const hasDraft = analyses.some(a => a.status === "draft");
      
      const daysSince = lastCompleted 
        ? Math.floor((Date.now() - new Date(lastCompleted.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      setStats({
        totalConsultations: analyses.filter(a => a.status === "completed").length,
        lastConsultation: lastCompleted?.created_at || null,
        hasOngoingDraft: hasDraft,
        daysSinceLastVisit: daysSince
      });
    }
  };

  if (!stats) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <Badge variant="secondary" className="text-xs font-normal gap-1">
        <Activity className="w-3 h-3" />
        {stats.totalConsultations} consulta{stats.totalConsultations !== 1 ? "s" : ""}
      </Badge>
      
      {stats.lastConsultation && (
        <Badge variant="outline" className="text-xs font-normal gap-1">
          <Calendar className="w-3 h-3" />
          Última: {new Date(stats.lastConsultation).toLocaleDateString("pt-BR")}
        </Badge>
      )}
      
      {stats.daysSinceLastVisit !== null && stats.daysSinceLastVisit > 180 && (
        <Badge variant="destructive" className="text-xs font-normal gap-1">
          <AlertCircle className="w-3 h-3" />
          {stats.daysSinceLastVisit} dias sem retorno
        </Badge>
      )}
      
      {stats.hasOngoingDraft && (
        <Badge variant="default" className="text-xs font-normal gap-1 bg-amber-500/20 text-amber-600 border-amber-500/30">
          <Clock className="w-3 h-3" />
          Consulta em andamento
        </Badge>
      )}
    </div>
  );
}
