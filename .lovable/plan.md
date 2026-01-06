# Plano: Aumento de Precisao da Analise de IA e Sistema de Agendamento

## Resumo Executivo

Este plano aborda duas grandes frentes:
1. **Melhorar a precisao da analise facial por IA** - Aprimorar o posicionamento dos pontos de injecao no modelo 3D e a confiabilidade das dosagens sugeridas
2. **Sistema de agendamento de retorno** - Implementar lembretes por email e WhatsApp para follow-up

---

## PARTE 1: Aumento da Precisao da Analise Facial por IA

### 1.1 Aprimorar o Prompt da Edge Function

**Arquivo:** `supabase/functions/analyze-face/index.ts`

**Melhorias:**
- Adicionar instrucoes mais detalhadas sobre landmarks anatomicos especificos (468 pontos do MediaPipe/face mesh)
- Incluir referencias a estruturas osseas para calibracao (linha mediopupilar, arco supraorbital, nasion)
- Especificar pontos de referencia relativos: 
  - Glabela: Centro exato entre as sobrancelhas (Y = ~0.33-0.35)
  - Corrugadores: Cabeca em 1/3 medial da sobrancelha, cauda em 2/3
  - Frontal: Grid em V iniciando 2cm acima da sobrancelha (Y <= 0.25)
  - Periorbital: 1cm lateral a borda ossea orbital (X ~0.22-0.26 ou 0.74-0.78)
- Adicionar validacao cruzada: comparar foto em repouso vs contracao para identificar dinamica muscular real
- Incluir escala de confianca por zona (nao apenas global)

**Novo formato de prompt aprimorado:**
```
## CALIBRACAO ANATOMICA OBRIGATORIA

Antes de identificar pontos, localize estas referencias:
1. Linha mediopupilar: linha vertical pelo centro de cada pupila
2. Nasion: ponto de depressao entre olhos na raiz do nariz (y ~0.38-0.42)
3. Arco supraorbital: borda ossea superior da orbita
4. Glabela: ponto central entre sobrancelhas no plano do nasion

## REGRAS DE POSICIONAMENTO PRECISAS

GLABELA:
- Procerus: EXATAMENTE na linha media (x=0.50), 1-2mm acima do nasion (y=0.35-0.37)
- Corrugador cabeca: 8-10mm lateral a linha media (x=0.42-0.44 ou 0.56-0.58), no nivel da cabeca da sobrancelha
- Corrugador cauda: 15-20mm lateral (x=0.35-0.38 ou 0.62-0.65), 3mm acima do nivel da cabeca

FRONTAL:
- NUNCA abaixo de 2cm da borda da sobrancelha
- Grid em V: 4-8 pontos distribuidos uniformemente
- Linha inferior: y=0.18-0.22
- Linha superior: y=0.10-0.15

PERIORBITAL (Pes de Galinha):
- 3 pontos em leque, 1cm lateral a borda ossea
- Ponto superior: angulo de 45 graus acima do canto externo
- Ponto medio: horizontal ao canto externo
- Ponto inferior: angulo de 45 graus abaixo

## ANALISE DINAMICA (se multiplas fotos fornecidas)
Compare repouso vs contracao para:
- Confirmar qual musculo esta efetivamente contraindo
- Estimar forca muscular real (leve/moderada/forte)
- Ajustar dosagem proporcionalmente
```

### 1.2 Melhorar Mapeamento 2D para 3D

**Arquivo:** `src/components/Face3DViewer.tsx`

**Funcao `percentTo3D` - Melhorias:**
- Adicionar calibracao baseada em landmarks anatomicos
- Usar curvatura mais precisa baseada em modelo de face humana real
- Separar mapeamento por zona facial (cada zona tem curvatura diferente)

```typescript
// Nova funcao de mapeamento por zona
function coordinateTo3D(
  x: number, 
  y: number, 
  zone: 'glabella' | 'frontalis' | 'periorbital' | 'nasal' | 'perioral' | 'mentalis' | 'masseter'
): [number, number, number] {
  // Curvatura e offset Z especificos por zona anatomica
  const zoneConfig = {
    glabella: { baseZ: 1.4, curveFactor: 0.15 },
    frontalis: { baseZ: 1.0, curveFactor: 0.25 },
    periorbital: { baseZ: 1.2, curveFactor: 0.3 },
    nasal: { baseZ: 1.55, curveFactor: 0.1 },
    perioral: { baseZ: 1.4, curveFactor: 0.2 },
    mentalis: { baseZ: 1.2, curveFactor: 0.3 },
    masseter: { baseZ: 0.6, curveFactor: 0.4 }
  };
  
  const config = zoneConfig[zone];
  const x3d = ((x - 50) / 50) * 1.4;
  const y3d = ((50 - y) / 50) * 1.8 + 0.2;
  const z3d = config.baseZ - Math.pow(Math.abs(x3d), 2) * config.curveFactor;
  
  return [x3d, y3d, z3d];
}
```

### 1.3 Adicionar Indicadores de Confianca por Ponto

**Melhorias visuais:**
- Cor do ponto varia com confianca (verde alto, amarelo medio, vermelho baixo)
- Tamanho do anel externo proporcional a confianca
- Tooltip mostra % de confianca individual

### 1.4 Validacao de Consistencia Anatomica

**Nova funcao de validacao:**
- Verificar simetria bilateral (pontos espelhados devem ter coordenadas X simetricas)
- Verificar hierarquia espacial (frontal sempre acima de glabela, glabela sempre acima de periorbital)
- Alertar se algum ponto cair em zona de perigo

### 1.5 Recalibrar Dosagens Baseado em Literatura Atualizada

**Arquivo:** `src/components/DosageSafetyAlert.tsx` e `supabase/functions/analyze-face/index.ts`

**Tabela de referencia atualizada (Consenso Brasileiro 2024):**

| Zona | Feminino (U) | Masculino (U) | Forcca Alta (+%) |
|------|-------------|---------------|-----------------|
| Procerus | 4-8U | 6-12U | +20% |
| Corrugador (total bilateral) | 12-20U | 16-30U | +25% |
| Frontal | 8-15U | 12-20U | +15% |
| Periorbital (por lado) | 6-12U | 8-16U | +20% |
| Nasal | 2-4U | 4-6U | +10% |
| Mentual | 4-8U | 6-12U | +20% |

---

## PARTE 2: Sistema de Agendamento de Retorno com Lembretes

### 2.1 Criar Tabela de Agendamentos

**Nova migracao SQL:**

```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES analyses(id),
  
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

CREATE TABLE appointment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_appointments_user ON appointments(user_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX idx_reminders_scheduled ON appointment_reminders(scheduled_for) WHERE status = 'pending';
```

### 2.2 Edge Function para Envio de Lembretes

**Novo arquivo:** `supabase/functions/send-reminders/index.ts`

**Funcionalidades:**
- Executada periodicamente (cron job ou chamada externa)
- Busca lembretes pendentes com scheduled_for <= now()
- Envia email via Resend
- Envia WhatsApp via API do WhatsApp Business (Twilio ou Z-API)
- Atualiza status do lembrete

### 2.3 Integracao com WhatsApp Business API

**Opcoes de integracao:**
1. **Twilio WhatsApp**: Mais robusto, pago
2. **Z-API ou Evolution API**: Mais simples, opcao brasileira
3. **Meta Cloud API**: Direto do WhatsApp oficial

**Secrets necessarios:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`
- ou
- `ZAPI_INSTANCE_ID`
- `ZAPI_TOKEN`

### 2.4 Componente de Agendamento

**Novo arquivo:** `src/components/AppointmentScheduler.tsx`

**Features:**
- Calendario para selecao de data
- Selecao de horario
- Checkbox para ativar email/WhatsApp
- Input para telefone e email do paciente
- Preview da mensagem que sera enviada
- Configuracao de quantos dias antes enviar lembretes

### 2.5 Pagina de Gestao de Agendamentos

**Novo arquivo:** `src/pages/Appointments.tsx`

**Features:**
- Lista de agendamentos futuros
- Filtros por data, paciente, status
- Acoes: remarcar, cancelar, enviar lembrete manual
- Historico de lembretes enviados

---

## Arquivos a Serem Modificados/Criados

### Modificacoes:
1. `supabase/functions/analyze-face/index.ts` - Prompt aprimorado e validacao
2. `src/components/Face3DViewer.tsx` - Mapeamento 3D por zona
3. `src/components/NewAnalysisWizard.tsx` - Integracao com agendamento
4. `src/components/DosageSafetyAlert.tsx` - Limites atualizados

### Novos arquivos:
1. `supabase/functions/send-reminders/index.ts` - Edge function para lembretes
2. `src/components/AppointmentScheduler.tsx` - Componente de agendamento
3. `src/pages/Appointments.tsx` - Pagina de gestao
4. Migracao SQL para novas tabelas

---

## Dependencias e Configuracoes

### Secrets necessarias:
- `RESEND_API_KEY` - Para envio de emails (ja temos exemplo no projeto)
- `WHATSAPP_API_KEY` - Para envio de WhatsApp (a ser escolhido provedor)

### Pacotes:
- Nenhum pacote adicional necessario (usar React, date-fns ja instalado)

---

## Critical Files for Implementation

- `supabase/functions/analyze-face/index.ts` - Core da logica de IA a ser aprimorada
- `src/components/Face3DViewer.tsx` - Mapeamento de coordenadas 2D para 3D
- `src/components/NewAnalysisWizard.tsx` - Integracao do fluxo completo
- `src/components/DosageSafetyAlert.tsx` - Validacao de dosagens
- `supabase/config.toml` - Configuracao de novas edge functions
