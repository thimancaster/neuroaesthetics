import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, User, PlusCircle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PatientWithReturn {
  id: string;
  name: string;
  lastConsultation: string;
  daysSinceLastVisit: number;
  totalConsultations: number;
}

export function UpcomingReturns() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientWithReturn[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPatientsNeedingReturn();
  }, []);

  const fetchPatientsNeedingReturn = async () => {
    setIsLoading(true);
    
    // Get all patients with their analyses
    const { data: patientsData } = await supabase
      .from("patients")
      .select("id, name");

    if (!patientsData) {
      setIsLoading(false);
      return;
    }

    // For each patient, get their latest completed analysis
    const patientsWithStats = await Promise.all(
      patientsData.map(async (patient) => {
        const { data: analyses } = await supabase
          .from("analyses")
          .select("created_at, status")
          .eq("patient_id", patient.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1);

        const lastAnalysis = analyses?.[0];
        const daysSince = lastAnalysis 
          ? Math.floor((Date.now() - new Date(lastAnalysis.created_at).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const { count } = await supabase
          .from("analyses")
          .select("id", { count: "exact", head: true })
          .eq("patient_id", patient.id)
          .eq("status", "completed");

        return {
          id: patient.id,
          name: patient.name,
          lastConsultation: lastAnalysis?.created_at || null,
          daysSinceLastVisit: daysSince || 0,
          totalConsultations: count || 0
        };
      })
    );

    // Filter patients who need return (90-180 days since last visit)
    const needingReturn = patientsWithStats
      .filter(p => p.daysSinceLastVisit >= 90 && p.lastConsultation)
      .sort((a, b) => a.daysSinceLastVisit - b.daysSinceLastVisit)
      .slice(0, 5);

    setPatients(needingReturn);
    setIsLoading(false);
  };

  const handleNewConsultation = (patientId: string) => {
    navigate(`/dashboard/new-analysis/${patientId}`);
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Retornos Próximos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <div className="animate-pulse w-full space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary" />
          Pacientes para Retorno
        </CardTitle>
      </CardHeader>
      <CardContent>
        {patients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum paciente necessita de retorno no momento.
          </p>
        ) : (
          <div className="space-y-3">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{patient.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={patient.daysSinceLastVisit > 150 ? "destructive" : "secondary"}
                        className="text-xs font-normal"
                      >
                        {patient.daysSinceLastVisit} dias
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {patient.totalConsultations} consulta{patient.totalConsultations !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleNewConsultation(patient.id)}
                  className="gap-1"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Nova Consulta</span>
                  <ChevronRight className="w-4 h-4 sm:hidden" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
