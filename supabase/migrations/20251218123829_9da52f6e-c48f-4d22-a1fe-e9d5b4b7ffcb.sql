-- Habilitar RLS na tabela treatment_templates
ALTER TABLE public.treatment_templates ENABLE ROW LEVEL SECURITY;

-- Templates são públicos para leitura (todos os usuários logados podem ver)
CREATE POLICY "Authenticated users can view templates" 
ON public.treatment_templates 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Apenas admins poderiam inserir/atualizar templates (por ora bloqueado)
CREATE POLICY "Templates are read-only for users" 
ON public.treatment_templates 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Templates are read-only for update" 
ON public.treatment_templates 
FOR UPDATE 
USING (false);

CREATE POLICY "Templates are read-only for delete" 
ON public.treatment_templates 
FOR DELETE 
USING (false);