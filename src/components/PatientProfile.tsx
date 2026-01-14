import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  User,
  Calendar,
  PlusCircle,
  Edit2,
  Loader2,
  ArrowLeft,
  Syringe,
  Clock,
  Image,
  Activity,
  FileText,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, differenceInDays, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PatientTreatmentHistory } from "./PatientTreatmentHistory";
import { AppointmentScheduler } from "./AppointmentScheduler";
import { PatientEditDialog } from "./PatientEditDialog";

interface Patient {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  cpf: string | null;
  address: string | null;
  allergies: string | null;
  medical_history: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

interface Analysis {
  id: string;
  created_at: string;
  status: string | null;
  procerus_dosage: number | null;
  corrugator_dosage: number | null;
  ai_injection_points: any;
  ai_clinical_notes: string | null;
  ai_confidence: number | null;
  resting_photo_url: string | null;
  glabellar_photo_url: string | null;
  frontal_photo_url: string | null;
  smile_photo_url: string | null;
  product_type: string | null;
}

interface Appointment {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  appointment_type: string;
  status: string | null;
  notes: string | null;
}

export function PatientProfile() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScheduler, setShowScheduler] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  const fetchPatientData = async () => {
    setIsLoading(true);
    try {
      const [patientRes, analysesRes, appointmentsRes] = await Promise.all([
        supabase
          .from("patients")
          .select("*")
          .eq("id", patientId)
          .single(),
        supabase
          .from("analyses")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false }),
        supabase
          .from("appointments")
          .select("*")
          .eq("patient_id", patientId)
          .gte("scheduled_date", new Date().toISOString().split("T")[0])
          .order("scheduled_date", { ascending: true }),
      ]);

      if (patientRes.error) throw patientRes.error;
      setPatient(patientRes.data);
      setAnalyses(analysesRes.data || []);
      setAppointments(appointmentsRes.data || []);
      setAnalyses(analysesRes.data || []);
      setAppointments(appointmentsRes.data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar paciente",
        description: error.message,
        variant: "destructive",
      });
      navigate("/dashboard/patients");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null;
    try {
      return differenceInYears(new Date(), parseISO(birthDate));
    } catch {
      return null;
    }
  };

  const formatPhone = (phone: string | null): string => {
    if (!phone) return "-";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  const getTotalDosage = (analysis: Analysis) => {
    const points = analysis.ai_injection_points || [];
    return points.reduce((sum: number, p: any) => sum + (p.dosage || 0), 0) ||
      (analysis.procerus_dosage || 0) + (analysis.corrugator_dosage || 0);
  };

  const getAverageInterval = () => {
    if (analyses.length < 2) return null;
    const completedAnalyses = analyses.filter(a => a.status === "completed");
    if (completedAnalyses.length < 2) return null;
    
    let totalDays = 0;
    for (let i = 1; i < completedAnalyses.length; i++) {
      const days = differenceInDays(
        parseISO(completedAnalyses[i - 1].created_at),
        parseISO(completedAnalyses[i].created_at)
      );
      totalDays += Math.abs(days);
    }
    return Math.round(totalDays / (completedAnalyses.length - 1));
  };

  const getDosageTrend = () => {
    const completed = analyses.filter(a => a.status === "completed");
    if (completed.length < 2) return "stable";
    
    const lastDosage = getTotalDosage(completed[0]);
    const prevDosage = getTotalDosage(completed[1]);
    
    if (lastDosage > prevDosage + 2) return "up";
    if (lastDosage < prevDosage - 2) return "down";
    return "stable";
  };

  const nextAppointment = appointments[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Paciente não encontrado.</p>
        </CardContent>
      </Card>
    );
  }

  const completedAnalyses = analyses.filter(a => a.status === "completed");
  const avgInterval = getAverageInterval();
  const trend = getDosageTrend();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/patients")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <User className="w-6 h-6 text-primary" />
              {patient.name}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {patient.age && <span>{patient.age} anos</span>}
              <span>•</span>
              <span>Cadastrado em {format(parseISO(patient.created_at), "dd/MM/yyyy")}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowScheduler(true)}>
            <CalendarDays className="w-4 h-4 mr-2" />
            Agendar Retorno
          </Button>
          <Button onClick={() => navigate(`/dashboard/new-analysis/${patient.id}`)}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Nova Consulta
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{completedAnalyses.length}</p>
                <p className="text-xs text-muted-foreground">Consultas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Syringe className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xl font-bold">
                  {completedAnalyses.length > 0 ? getTotalDosage(completedAnalyses[0]) : 0}U
                </p>
                <p className="text-xs text-muted-foreground">Última Dose</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Clock className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{avgInterval || "-"}d</p>
                <p className="text-xs text-muted-foreground">Intervalo Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                trend === "up" ? "bg-rose-500/10" :
                trend === "down" ? "bg-green-500/10" : "bg-muted"
              }`}>
                {trend === "up" ? (
                  <TrendingUp className="w-4 h-4 text-rose-500" />
                ) : trend === "down" ? (
                  <TrendingDown className="w-4 h-4 text-green-500" />
                ) : (
                  <Minus className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium capitalize">{trend === "up" ? "Aumentando" : trend === "down" ? "Diminuindo" : "Estável"}</p>
                <p className="text-xs text-muted-foreground">Tendência</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${nextAppointment ? "bg-blue-500/10" : "bg-muted"}`}>
                <CalendarDays className={`w-4 h-4 ${nextAppointment ? "text-blue-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {nextAppointment 
                    ? format(parseISO(nextAppointment.scheduled_date), "dd/MM")
                    : "-"
                  }
                </p>
                <p className="text-xs text-muted-foreground">Próx. Retorno</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="evolution">Evolução</TabsTrigger>
          <TabsTrigger value="gallery">Galeria</TabsTrigger>
          <TabsTrigger value="data">Dados</TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Consultas</CardTitle>
            </CardHeader>
            <CardContent>
              {analyses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma consulta registrada.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate(`/dashboard/new-analysis/${patient.id}`)}
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Primeira Consulta
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

                    <div className="space-y-6">
                      {analyses.map((analysis, index) => {
                        const totalDosage = getTotalDosage(analysis);
                        const isCompleted = analysis.status === "completed";
                        
                        return (
                          <div key={analysis.id} className="relative pl-10">
                            {/* Timeline dot */}
                            <div className={`absolute left-2 w-5 h-5 rounded-full border-2 ${
                              isCompleted 
                                ? "bg-primary border-primary" 
                                : "bg-amber-500 border-amber-500"
                            }`}>
                              <span className="sr-only">
                                {isCompleted ? "Concluída" : "Rascunho"}
                              </span>
                            </div>

                            <Card className="hover:border-primary/30 transition-colors">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium">
                                        {format(parseISO(analysis.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                      </span>
                                      <Badge variant={isCompleted ? "default" : "secondary"}>
                                        {isCompleted ? "Concluída" : "Rascunho"}
                                      </Badge>
                                      {index === 0 && isCompleted && (
                                        <Badge variant="outline" className="text-primary border-primary">
                                          Última
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                                      <span className="flex items-center gap-1">
                                        <Syringe className="w-3 h-3" />
                                        {totalDosage}U total
                                      </span>
                                      {analysis.product_type && (
                                        <span>• {analysis.product_type}</span>
                                      )}
                                      {analysis.ai_confidence && (
                                        <span>• {Math.round(analysis.ai_confidence * 100)}% confiança</span>
                                      )}
                                    </div>
                                    {analysis.ai_clinical_notes && (
                                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                        {analysis.ai_clinical_notes}
                                      </p>
                                    )}
                                  </div>
                                  {analysis.resting_photo_url && (
                                    <img 
                                      src={analysis.resting_photo_url} 
                                      alt="Foto de repouso"
                                      className="w-16 h-16 rounded-lg object-cover"
                                    />
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evolution Tab */}
        <TabsContent value="evolution">
          <PatientTreatmentHistory patientId={patient.id} patientName={patient.name} />
        </TabsContent>

        {/* Gallery Tab */}
        <TabsContent value="gallery">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Image className="w-5 h-5" />
                Galeria de Fotos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedAnalyses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma foto disponível.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {completedAnalyses.map((analysis) => {
                    const photos = [
                      { url: analysis.resting_photo_url, label: "Repouso" },
                      { url: analysis.glabellar_photo_url, label: "Glabelar" },
                      { url: analysis.frontal_photo_url, label: "Frontal" },
                      { url: analysis.smile_photo_url, label: "Sorriso" },
                    ].filter(p => p.url);

                    if (photos.length === 0) return null;

                    return (
                      <div key={analysis.id}>
                        <h4 className="text-sm font-medium mb-3">
                          {format(parseISO(analysis.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {photos.map((photo, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={photo.url!}
                                alt={photo.label}
                                className="w-full aspect-square object-cover rounded-lg"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-lg">
                                <span className="text-xs text-white">{photo.label}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Dados Cadastrais</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dados Pessoais */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Dados Pessoais</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Nome</Label>
                    <p className="font-medium">{patient.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Idade</Label>
                    <p className="font-medium">
                      {patient.birth_date 
                        ? `${calculateAge(patient.birth_date)} anos` 
                        : patient.age 
                          ? `${patient.age} anos` 
                          : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Gênero</Label>
                    <p className="font-medium capitalize">{patient.gender || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Telefone</Label>
                    <p className="font-medium">{formatPhone(patient.phone)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Email</Label>
                    <p className="font-medium">{patient.email || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">CPF</Label>
                    <p className="font-medium">{patient.cpf || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              {patient.address && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Endereço</h4>
                  <p className="text-sm">{patient.address}</p>
                </div>
              )}

              {/* Histórico Médico */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Histórico Médico</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground text-xs">Alergias</Label>
                    <p className="text-sm">{patient.allergies || "Nenhuma alergia registrada"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Histórico</Label>
                    <p className="text-sm">{patient.medical_history || "Nenhum histórico registrado"}</p>
                  </div>
                  {(patient.emergency_contact || patient.emergency_phone) && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Contato de Emergência</Label>
                      <p className="text-sm">
                        {patient.emergency_contact}
                        {patient.emergency_phone && ` - ${formatPhone(patient.emergency_phone)}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Observações */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Observações</h4>
                <p className="text-sm">{patient.observations || "Nenhuma observação registrada."}</p>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-muted-foreground text-xs">Cadastrado em</Label>
                  <p className="text-sm">{format(parseISO(patient.created_at), "dd/MM/yyyy 'às' HH:mm")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Última atualização</Label>
                  <p className="text-sm">{format(parseISO(patient.updated_at), "dd/MM/yyyy 'às' HH:mm")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Patient Edit Dialog */}
      <PatientEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        patient={patient}
        onSaved={fetchPatientData}
      />

      {/* Appointment Scheduler */}
      <AppointmentScheduler
        open={showScheduler}
        onOpenChange={setShowScheduler}
        patientId={patient.id}
        patientName={patient.name}
        onScheduled={() => {
          setShowScheduler(false);
          fetchPatientData();
        }}
      />
    </div>
  );
}
