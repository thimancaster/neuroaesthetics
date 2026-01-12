import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AppointmentSchedulerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  analysisId?: string;
  suggestedDate?: Date;
  onScheduled?: () => void;
}

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"
];

export function AppointmentScheduler({
  open,
  onOpenChange,
  patientId,
  patientName,
  analysisId,
  suggestedDate,
  onScheduled,
}: AppointmentSchedulerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [date, setDate] = useState<Date | undefined>(suggestedDate || addDays(new Date(), 90));
  const [time, setTime] = useState("14:00");
  const [appointmentType, setAppointmentType] = useState("followup");
  const [notes, setNotes] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSchedule = async () => {
    if (!date || !user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from("appointments").insert({
        user_id: user.id,
        patient_id: patientId,
        analysis_id: analysisId || null,
        scheduled_date: format(date, "yyyy-MM-dd"),
        scheduled_time: time,
        appointment_type: appointmentType,
        notes: notes || null,
        patient_phone: patientPhone || null,
        patient_email: patientEmail || null,
        status: "scheduled",
      });

      if (error) throw error;

      toast({
        title: "Agendamento criado!",
        description: `Retorno de ${patientName} agendado para ${format(date, "dd/MM/yyyy", { locale: ptBR })} às ${time}.`,
      });

      // Reset form
      setNotes("");
      setPatientPhone("");
      setPatientEmail("");
      
      onScheduled?.();
    } catch (error: any) {
      toast({
        title: "Erro ao agendar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Agendar Retorno</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Patient Info */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm text-muted-foreground">Paciente</p>
            <p className="font-medium">{patientName}</p>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Data do Retorno</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Sugestão: retorno entre 90-120 dias após aplicação
            </p>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label>Horário</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger>
                <Clock className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Appointment Type */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={appointmentType} onValueChange={setAppointmentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="followup">Retorno</SelectItem>
                <SelectItem value="evaluation">Avaliação</SelectItem>
                <SelectItem value="touch_up">Retoque</SelectItem>
                <SelectItem value="first_time">Primeira Consulta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Notas sobre o agendamento..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSchedule} disabled={!date || isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Confirmar Agendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
