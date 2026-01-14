-- Adicionar campos completos de cadastro do paciente
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS gender text DEFAULT 'feminino',
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS allergies text,
ADD COLUMN IF NOT EXISTS medical_history text,
ADD COLUMN IF NOT EXISTS emergency_contact text,
ADD COLUMN IF NOT EXISTS emergency_phone text;

-- Criar índice para busca por CPF
CREATE INDEX IF NOT EXISTS idx_patients_cpf ON public.patients(cpf) WHERE cpf IS NOT NULL;

-- Criar índice para busca por email
CREATE INDEX IF NOT EXISTS idx_patients_email ON public.patients(email) WHERE email IS NOT NULL;