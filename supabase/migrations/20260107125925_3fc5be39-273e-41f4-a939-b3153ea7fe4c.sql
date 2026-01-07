-- Table for appointments/scheduling
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
  
  appointment_type TEXT NOT NULL DEFAULT 'followup',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  
  reminder_email BOOLEAN DEFAULT true,
  reminder_whatsapp BOOLEAN DEFAULT false,
  reminder_days_before INTEGER[] DEFAULT ARRAY[7, 1],
  
  patient_phone TEXT,
  patient_email TEXT,
  
  notes TEXT,
  status TEXT DEFAULT 'scheduled',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for tracking sent reminders
CREATE TABLE public.appointment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_appointments_user ON public.appointments(user_id);
CREATE INDEX idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX idx_appointments_date ON public.appointments(scheduled_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_reminders_scheduled ON public.appointment_reminders(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_reminders_appointment ON public.appointment_reminders(appointment_id);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointments
CREATE POLICY "Users can view their own appointments" 
ON public.appointments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments" 
ON public.appointments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own appointments" 
ON public.appointments 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for reminders (via appointment ownership)
CREATE POLICY "Users can view reminders for their appointments" 
ON public.appointment_reminders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.appointments 
    WHERE appointments.id = appointment_reminders.appointment_id 
    AND appointments.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert reminders for their appointments" 
ON public.appointment_reminders 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.appointments 
    WHERE appointments.id = appointment_reminders.appointment_id 
    AND appointments.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update reminders for their appointments" 
ON public.appointment_reminders 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.appointments 
    WHERE appointments.id = appointment_reminders.appointment_id 
    AND appointments.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();