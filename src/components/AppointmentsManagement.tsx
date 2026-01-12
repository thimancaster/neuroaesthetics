import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  Clock,
  User,
  MoreVertical,
  PlusCircle,
  Check,
  X,
  Loader2,
  CalendarDays,
  Phone,
  Mail,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO, isToday, isTomorrow, isThisWeek, addDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: string;
  patient_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  appointment_type: string;
  status: string | null;
  notes: string | null;
  patient_phone: string | null;
  patient_email: string | null;
  created_at: string;
  patients?: {
    name: string;
    age: number | null;
  };
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "Agendado", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "default" },
  completed: { label: "Realizado", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const TYPE_LABELS: Record<string, string> = {
  followup: "Retorno",
  evaluation: "Avaliação",
  touch_up: "Retoque",
  first_time: "Primeira Consulta",
};

export function AppointmentsManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user, filter]);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("appointments")
        .select("*, patients(name, age)")
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true });

      const today = format(new Date(), "yyyy-MM-dd");

      switch (filter) {
        case "today":
          query = query.eq("scheduled_date", today);
          break;
        case "week":
          const endOfWeek = format(addDays(new Date(), 7), "yyyy-MM-dd");
          query = query.gte("scheduled_date", today).lte("scheduled_date", endOfWeek);
          break;
        case "upcoming":
          query = query.gte("scheduled_date", today).neq("status", "cancelled");
          break;
        case "past":
          query = query.lt("scheduled_date", today);
          break;
        case "cancelled":
          query = query.eq("status", "cancelled");
          break;
      }

      const { data, error } = await query;

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (appointmentId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Agendamento marcado como ${STATUS_LABELS[newStatus]?.label || newStatus}.`,
      });

      fetchAppointments();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!cancellingId) return;
    await updateStatus(cancellingId, "cancelled");
    setCancellingId(null);
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  const groupedAppointments = appointments.reduce((groups, apt) => {
    const dateLabel = getDateLabel(apt.scheduled_date);
    if (!groups[dateLabel]) {
      groups[dateLabel] = [];
    }
    groups[dateLabel].push(apt);
    return groups;
  }, {} as Record<string, Appointment[]>);

  const todayCount = appointments.filter(a => 
    isToday(parseISO(a.scheduled_date)) && a.status !== "cancelled"
  ).length;

  const weekCount = appointments.filter(a => {
    const date = parseISO(a.scheduled_date);
    return isThisWeek(date, { weekStartsOn: 0 }) && a.status !== "cancelled";
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-foreground">Agendamentos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie retornos e consultas dos seus pacientes
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{todayCount}</p>
                <p className="text-xs text-muted-foreground">Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CalendarDays className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{weekCount}</p>
                <p className="text-xs text-muted-foreground">Esta semana</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Check className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-bold">
                  {appointments.filter(a => a.status === "confirmed").length}
                </p>
                <p className="text-xs text-muted-foreground">Confirmados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xl font-bold">
                  {appointments.filter(a => a.status === "scheduled").length}
                </p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="today">Hoje</TabsTrigger>
          <TabsTrigger value="week">Esta Semana</TabsTrigger>
          <TabsTrigger value="upcoming">Próximos</TabsTrigger>
          <TabsTrigger value="past">Anteriores</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : appointments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhum agendamento encontrado.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedAppointments).map(([dateLabel, apts]) => (
                <div key={dateLabel}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {dateLabel}
                  </h3>
                  <div className="space-y-2">
                    {apts.map((apt) => (
                      <Card key={apt.id} className="hover:border-primary/30 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1">
                              {/* Time */}
                              <div className="text-center min-w-[60px]">
                                <p className="text-lg font-semibold">{apt.scheduled_time || "--:--"}</p>
                              </div>

                              {/* Patient Info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <User className="w-4 h-4 text-primary" />
                                  <span 
                                    className="font-medium hover:text-primary cursor-pointer"
                                    onClick={() => navigate(`/dashboard/patients/${apt.patient_id}`)}
                                  >
                                    {apt.patients?.name || "Paciente"}
                                  </span>
                                  <Badge variant={STATUS_LABELS[apt.status || "scheduled"]?.variant || "secondary"}>
                                    {STATUS_LABELS[apt.status || "scheduled"]?.label || apt.status}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                  <span>{TYPE_LABELS[apt.appointment_type] || apt.appointment_type}</span>
                                  {apt.patient_phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      {apt.patient_phone}
                                    </span>
                                  )}
                                  {apt.patient_email && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="w-3 h-3" />
                                      {apt.patient_email}
                                    </span>
                                  )}
                                </div>
                                {apt.notes && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                    {apt.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              {apt.status !== "completed" && apt.status !== "cancelled" && (
                                <Button
                                  size="sm"
                                  onClick={() => navigate(`/dashboard/new-analysis/${apt.patient_id}`)}
                                >
                                  <PlusCircle className="w-4 h-4 mr-1" />
                                  Iniciar
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {apt.status === "scheduled" && (
                                    <DropdownMenuItem onClick={() => updateStatus(apt.id, "confirmed")}>
                                      <Check className="w-4 h-4 mr-2" />
                                      Confirmar
                                    </DropdownMenuItem>
                                  )}
                                  {apt.status !== "completed" && apt.status !== "cancelled" && (
                                    <DropdownMenuItem onClick={() => updateStatus(apt.id, "completed")}>
                                      <Check className="w-4 h-4 mr-2" />
                                      Marcar como Realizado
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    onClick={() => navigate(`/dashboard/patients/${apt.patient_id}`)}
                                  >
                                    <User className="w-4 h-4 mr-2" />
                                    Ver Prontuário
                                  </DropdownMenuItem>
                                  {apt.status !== "cancelled" && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => setCancellingId(apt.id)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <X className="w-4 h-4 mr-2" />
                                        Cancelar
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancellingId} onOpenChange={() => setCancellingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este agendamento? Esta ação pode ser desfeita
              reagendando posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUpdating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Cancelar Agendamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
