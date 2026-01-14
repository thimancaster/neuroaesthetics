import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  Clock,
  CalendarCheck,
  UserX,
  FileEdit,
  ChevronRight,
  Bell,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { differenceInDays, parseISO, format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Alert {
  id: string;
  type: "overdue" | "draft" | "upcoming" | "no_contact";
  title: string;
  description: string;
  patientId?: string;
  patientName?: string;
  date?: string;
  priority: "high" | "medium" | "low";
}

export function SmartAlerts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user]);

  const fetchAlerts = async () => {
    setIsLoading(true);
    const alertsList: Alert[] = [];

    try {
      // 1. Pacientes que não retornaram há mais de 180 dias (6 meses)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: overduePatients } = await supabase
        .from("patients")
        .select(`
          id,
          name,
          analyses (
            id,
            created_at,
            status
          )
        `)
        .order("created_at", { ascending: false });

      if (overduePatients) {
        for (const patient of overduePatients) {
          const completedAnalyses = (patient.analyses as any[])?.filter(
            (a) => a.status === "completed"
          );
          if (completedAnalyses && completedAnalyses.length > 0) {
            const lastAnalysis = completedAnalyses[0];
            const daysSince = differenceInDays(
              new Date(),
              parseISO(lastAnalysis.created_at)
            );
            if (daysSince > 180) {
              alertsList.push({
                id: `overdue-${patient.id}`,
                type: "overdue",
                title: "Paciente sem retorno",
                description: `${patient.name} não retorna há ${daysSince} dias`,
                patientId: patient.id,
                patientName: patient.name,
                date: lastAnalysis.created_at,
                priority: daysSince > 365 ? "high" : "medium",
              });
            }
          }
        }
      }

      // 2. Consultas em rascunho há mais de 7 dias
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: draftAnalyses } = await supabase
        .from("analyses")
        .select(`
          id,
          created_at,
          patient_id,
          patients (
            name
          )
        `)
        .eq("status", "draft")
        .lt("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (draftAnalyses) {
        for (const analysis of draftAnalyses) {
          const daysSince = differenceInDays(
            new Date(),
            parseISO(analysis.created_at)
          );
          const patientName = (analysis.patients as any)?.name || "Paciente";
          alertsList.push({
            id: `draft-${analysis.id}`,
            type: "draft",
            title: "Consulta incompleta",
            description: `Rascunho de ${patientName} há ${daysSince} dias`,
            patientId: analysis.patient_id,
            patientName,
            date: analysis.created_at,
            priority: daysSince > 14 ? "high" : "medium",
          });
        }
      }

      // 3. Agendamentos para os próximos 3 dias
      const today = new Date();
      const threeDaysLater = addDays(today, 3);

      const { data: upcomingAppointments } = await supabase
        .from("appointments")
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          status,
          patient_id,
          patients (
            name
          )
        `)
        .gte("scheduled_date", format(today, "yyyy-MM-dd"))
        .lte("scheduled_date", format(threeDaysLater, "yyyy-MM-dd"))
        .in("status", ["scheduled", "confirmed"])
        .order("scheduled_date", { ascending: true });

      if (upcomingAppointments) {
        for (const apt of upcomingAppointments) {
          const patientName = (apt.patients as any)?.name || "Paciente";
          const isToday = apt.scheduled_date === format(today, "yyyy-MM-dd");
          const isTomorrow =
            apt.scheduled_date === format(addDays(today, 1), "yyyy-MM-dd");

          let timeLabel = format(parseISO(apt.scheduled_date), "dd/MM", {
            locale: ptBR,
          });
          if (isToday) timeLabel = "Hoje";
          if (isTomorrow) timeLabel = "Amanhã";
          if (apt.scheduled_time) timeLabel += ` às ${apt.scheduled_time}`;

          alertsList.push({
            id: `upcoming-${apt.id}`,
            type: "upcoming",
            title: "Agendamento próximo",
            description: `${patientName} - ${timeLabel}`,
            patientId: apt.patient_id,
            patientName,
            date: apt.scheduled_date,
            priority: isToday ? "high" : isTomorrow ? "medium" : "low",
          });
        }
      }

      // 4. Pacientes sem dados de contato
      const { data: patientsNoContact } = await supabase
        .from("patients")
        .select("id, name, phone, email")
        .is("phone", null)
        .is("email", null)
        .limit(5);

      if (patientsNoContact) {
        for (const patient of patientsNoContact) {
          alertsList.push({
            id: `nocontact-${patient.id}`,
            type: "no_contact",
            title: "Sem contato",
            description: `${patient.name} não possui telefone ou email`,
            patientId: patient.id,
            patientName: patient.name,
            priority: "low",
          });
        }
      }

      // Ordenar por prioridade
      alertsList.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      setAlerts(alertsList.slice(0, 10)); // Limitar a 10 alertas
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (type: Alert["type"]) => {
    switch (type) {
      case "overdue":
        return <UserX className="w-4 h-4" />;
      case "draft":
        return <FileEdit className="w-4 h-4" />;
      case "upcoming":
        return <CalendarCheck className="w-4 h-4" />;
      case "no_contact":
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: Alert["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "low":
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  const handleAlertClick = (alert: Alert) => {
    if (alert.patientId) {
      navigate(`/dashboard/patients/${alert.patientId}`);
    } else if (alert.type === "upcoming") {
      navigate("/dashboard/appointments");
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Clock className="w-5 h-5 animate-pulse text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum alerta no momento!</p>
            <p className="text-xs mt-1">Tudo está em dia.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Alertas
          <Badge variant="secondary" className="ml-auto">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[280px]">
          <div className="px-4 pb-4 space-y-2">
            {alerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors hover:bg-muted/50 ${getPriorityColor(
                  alert.priority
                )}`}
              >
                <div className="shrink-0">{getIcon(alert.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alert.title}</p>
                  <p className="text-xs opacity-80 truncate">
                    {alert.description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
