import { z } from 'zod';

// ============================================================
// PATIENT VALIDATION SCHEMAS
// ============================================================

export const patientSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Nome contém caracteres inválidos')
    .trim(),
  age: z.number()
    .int('Idade deve ser um número inteiro')
    .min(0, 'Idade não pode ser negativa')
    .max(150, 'Idade inválida')
    .optional()
    .nullable(),
  birth_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento inválida')
    .optional()
    .nullable(),
  observations: z.string()
    .max(5000, 'Observações muito longas')
    .optional()
    .nullable(),
  gender: z.enum(['feminino', 'masculino'], {
    errorMap: () => ({ message: 'Gênero inválido' })
  }).optional().nullable(),
  phone: z.string()
    .max(20, 'Telefone muito longo')
    .optional()
    .nullable(),
  email: z.string()
    .email('Email inválido')
    .max(100, 'Email muito longo')
    .optional()
    .nullable()
    .or(z.literal('')),
  cpf: z.string()
    .max(14, 'CPF inválido')
    .optional()
    .nullable(),
  address: z.string()
    .max(500, 'Endereço muito longo')
    .optional()
    .nullable(),
  allergies: z.string()
    .max(2000, 'Campo de alergias muito longo')
    .optional()
    .nullable(),
  medical_history: z.string()
    .max(5000, 'Histórico médico muito longo')
    .optional()
    .nullable(),
  emergency_contact: z.string()
    .max(100, 'Nome do contato de emergência muito longo')
    .optional()
    .nullable(),
  emergency_phone: z.string()
    .max(20, 'Telefone de emergência muito longo')
    .optional()
    .nullable(),
});

export type PatientFormData = z.infer<typeof patientSchema>;

// ============================================================
// PROFILE VALIDATION SCHEMAS
// ============================================================

export const profileSchema = z.object({
  full_name: z.string()
    .max(100, 'Nome muito longo')
    .trim()
    .optional()
    .nullable(),
  clinic_name: z.string()
    .max(200, 'Nome da clínica muito longo')
    .trim()
    .optional()
    .nullable(),
  specialty: z.string()
    .max(100, 'Especialidade muito longa')
    .trim()
    .optional()
    .nullable(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

// ============================================================
// ANALYSIS VALIDATION SCHEMAS
// ============================================================

export const analysisNotesSchema = z.object({
  notes: z.string()
    .max(10000, 'Notas muito longas')
    .optional()
    .nullable(),
});

export type AnalysisNotesData = z.infer<typeof analysisNotesSchema>;

// ============================================================
// APPOINTMENT VALIDATION SCHEMAS
// ============================================================

export const appointmentSchema = z.object({
  scheduled_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  scheduled_time: z.string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Horário inválido')
    .optional()
    .nullable(),
  appointment_type: z.enum(['followup', 'new', 'consultation'], {
    errorMap: () => ({ message: 'Tipo de agendamento inválido' })
  }),
  notes: z.string()
    .max(2000, 'Notas muito longas')
    .optional()
    .nullable(),
  patient_email: z.string()
    .email('Email inválido')
    .optional()
    .nullable()
    .or(z.literal('')),
  patient_phone: z.string()
    .max(20, 'Telefone muito longo')
    .optional()
    .nullable(),
  reminder_email: z.boolean().optional(),
  reminder_whatsapp: z.boolean().optional(),
});

export type AppointmentFormData = z.infer<typeof appointmentSchema>;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Validates data against a schema and returns parsed data or throws
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safely validates data and returns result with errors
 */
export function safeValidateData<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { 
    success: false, 
    errors: result.error.errors.map(e => e.message) 
  };
}
