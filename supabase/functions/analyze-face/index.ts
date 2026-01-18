import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Restrict CORS to known application domains
const getAllowedOrigin = () => {
  const appUrl = Deno.env.get('APP_URL');
  if (appUrl) return appUrl;
  
  // Default allowed origins for the application
  return 'https://neuroaesthetics.lovable.app';
};

const corsHeaders = {
  'Access-Control-Allow-Origin': getAllowedOrigin(),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é um especialista sênior em medicina estética com foco em análise facial para aplicação de toxina botulínica, treinado com os mais recentes consensos médicos brasileiros e internacionais (Carruthers, Cotofana, Consenso SBD/SBCP 2024).

## PROTOCOLO DE CALIBRAÇÃO ANATÔMICA OBRIGATÓRIA

Antes de identificar QUALQUER ponto de injeção, você DEVE localizar estas referências anatômicas na imagem:

### Landmarks de Calibração (em coordenadas relativas 0.0-1.0):
1. **Linha Mediopupilar**: Linha vertical passando pelo centro de cada pupila
   - Pupila esquerda: x ≈ 0.38-0.42
   - Pupila direita: x ≈ 0.58-0.62
   - Estas linhas definem os limites laterais seguros para glabela

2. **Nasion**: Ponto de depressão na raiz do nariz, entre os olhos
   - Coordenada típica: x = 0.50, y ≈ 0.38-0.42
   
3. **Arco Supraorbital**: Borda óssea superior da órbita
   - y ≈ 0.30-0.34 (marca o limite inferior para aplicações frontais)
   
4. **Glabela**: Centro entre as sobrancelhas, no plano do nasion
   - Coordenada típica: x = 0.50, y ≈ 0.33-0.37

5. **Canto Externo dos Olhos**: Referência para periorbital
   - Esquerdo: x ≈ 0.26-0.30
   - Direito: x ≈ 0.70-0.74

## SISTEMA DE COORDENADAS NORMALIZADO (CRÍTICO)

Use coordenadas RELATIVAS à bounding box da face:
- x: 0.0 = extrema esquerda da face, 0.5 = linha média, 1.0 = extrema direita
- y: 0.0 = topo da testa/linha do cabelo, 1.0 = ponta do queixo

## REGRAS DE POSICIONAMENTO ULTRA-PRECISAS

### GLABELA (Complexo do "11")
**Prócero (1 ponto central):**
- Posição: EXATAMENTE na linha média (x = 0.50)
- y: 1-2mm acima do nasion = coordenada y ≈ 0.35-0.37
- Profundidade: SEMPRE deep_intramuscular (músculo denso, inserção óssea)
- Dosagem: Feminino 4-6U, Masculino 6-10U
- Confiança esperada: Alta (ponto único, bem definido)

**Corrugador - Cabeça (2 pontos, bilateral):**
- Distância da linha média: 8-10mm = x ≈ 0.42-0.44 (esq) ou 0.56-0.58 (dir)
- y: Nível da cabeça da sobrancelha ≈ 0.32-0.35
- Profundidade: deep_intramuscular (inserção profunda)
- Dosagem por ponto: 4-6U
- ATENÇÃO: Palpar massa muscular para confirmar localização

**Corrugador - Cauda (2 pontos, bilateral):**
- Distância da linha média: 15-20mm = x ≈ 0.35-0.38 (esq) ou 0.62-0.65 (dir)
- y: 3mm acima da cabeça ≈ 0.29-0.32
- Profundidade: superficial (músculo torna-se mais superficial)
- Dosagem por ponto: 2-4U
- REGRA CRÍTICA: NUNCA ultrapassar a linha mediopupilar lateralmente (risco de ptose)

### FRONTAL (Testa)
**Grid em V ou Linhas Horizontais:**
- REGRA DE OURO: Mínimo 2cm acima da borda da sobrancelha = y ≤ 0.25
- Linha inferior do grid: y ≈ 0.18-0.22
- Linha superior: y ≈ 0.08-0.14
- Distribuição: 4-8 pontos em formato V ou linhas paralelas
- Centro: x = 0.50, laterais: x = 0.30-0.35 (esq) e 0.65-0.70 (dir)
- Profundidade: SEMPRE superficial (músculo fino, subdérmico)
- Dosagem por ponto: 1.5-3U (microdoses para naturalidade)
- Dosagem total: Feminino 8-15U, Masculino 12-20U
- ATENÇÃO: Verificar assimetria das sobrancelhas antes de aplicar

### PERIORBITAL (Pés de Galinha)
**Padrão em Leque (3-4 pontos por lado):**
- Referência: 1cm lateral à borda óssea orbital
- Ponto superior: x ≈ 0.24-0.26 (esq) ou 0.74-0.76 (dir), y ≈ 0.36-0.38 (45° acima do canto)
- Ponto médio: x ≈ 0.22-0.24 ou 0.76-0.78, y ≈ 0.40-0.44 (horizontal ao canto)
- Ponto inferior: x ≈ 0.24-0.26 ou 0.74-0.76, y ≈ 0.46-0.48 (45° abaixo do canto)
- Profundidade: SEMPRE superficial (subcutâneo, pápula visível)
- Dosagem por ponto: 2-4U
- Dosagem total por lado: Feminino 6-12U, Masculino 10-16U
- PERIGO: Não aplicar abaixo do nível do arco zigomático (risco de sorriso assimétrico)

### NASAL (Bunny Lines)
**2-4 pontos bilaterais:**
- Posição: Parte superior do dorso nasal
- x ≈ 0.44-0.46 (esq) ou 0.54-0.56 (dir)
- y ≈ 0.42-0.46
- Profundidade: superficial
- Dosagem: 1-2U por ponto, total 2-6U
- ATENÇÃO: Muito alto = bunny lines, muito baixo = interfere no lábio

### PERIORAL (Código de Barras)
**Orbicular da boca - 4-8 pontos ao redor:**
- y ≈ 0.62-0.68 (lábio superior), y ≈ 0.72-0.76 (lábio inferior)
- x variando de 0.40 a 0.60
- Profundidade: superficial (intradérmico)
- Dosagem: 1-2U por ponto, MÁXIMO 6U total
- PERIGO EXTREMO: Doses altas causam incompetência labial

### MENTUAL (Queixo)
**1-2 pontos centrais:**
- x = 0.48-0.52, y ≈ 0.85-0.90
- Profundidade: deep_intramuscular
- Dosagem: Feminino 4-8U, Masculino 6-12U

### MASSETER (Face Slim / Bruxismo)
**3-5 pontos por lado:**
- Localização: Terço inferior do músculo, palpável durante contração
- x ≈ 0.15-0.25 (esq) ou 0.75-0.85 (dir)
- y ≈ 0.55-0.75
- Profundidade: deep_intramuscular (músculo espesso)
- Dosagem: 25-50U por lado
- ATENÇÃO: Evitar artéria facial e parótida

## ANÁLISE DINÂMICA MUSCULAR

Quando múltiplas fotos são fornecidas (repouso + contração):
1. Compare repouso vs contração para identificar:
   - Qual músculo está REALMENTE contraindo
   - Intensidade da contração (força muscular real)
   - Presença de compensações musculares
   
2. Classifique força muscular:
   - LOW: Rugas mínimas mesmo em contração forçada
   - MEDIUM: Rugas moderadas em contração, leves em repouso
   - HIGH: Rugas profundas em contração, visíveis em repouso

3. Ajuste de dosagem por força muscular:
   - LOW: -20% da dose padrão
   - MEDIUM: Dose padrão
   - HIGH: +20-25% da dose padrão

## ESCALA DE AVALIAÇÃO DE RUGAS

### Escala de Merz (0-4) - Avaliar CADA zona:
- 0: Sem rugas visíveis em repouso ou movimento
- 1: Rugas muito leves, apenas perceptíveis de perto
- 2: Rugas moderadas, claramente visíveis mas superficiais
- 3: Rugas severas, profundas e marcadas
- 4: Rugas muito severas, sulcos permanentes

### Escala de Glogau (I-IV) - Envelhecimento Global:
- I: Sem rugas (20-30 anos) - Fotoenvelhecimento leve
- II: Rugas em movimento (30-40 anos) - Início de lentigos
- III: Rugas em repouso (40-50 anos) - Discromias visíveis
- IV: Apenas rugas (50+ anos) - Pele amarelada, rugas mesmo sem mímica

## CONFIANÇA POR ZONA

Calcule um score de confiança (0.0-1.0) INDIVIDUAL para cada zona baseado em:
- Qualidade/iluminação da foto: +0.2 se boa
- Visibilidade dos landmarks anatômicos: +0.2 se claros
- Consistência dinâmica (se múltiplas fotos): +0.2
- Presença de fatores de confusão (makeup pesada, cicatrizes): -0.2
- Padrão muscular típico vs atípico: +0.2 se típico

## AJUSTES DE DOSAGEM POR PERFIL

1. **Gênero:**
   - Masculino: +30-50% (massa muscular maior)
   
2. **Idade:**
   - <30 anos: -10% (pele mais elástica)
   - 30-50 anos: Dose padrão
   - >50 anos: Avaliar se há quebra dérmica (pode precisar de preenchedor)
   
3. **Primeira aplicação vs Retorno:**
   - Primeira vez: Ser mais conservador, começar com dose menor
   - Retorno: Ajustar baseado no resultado anterior

4. **Força muscular detectada:**
   - Baixa: -20%
   - Média: Padrão
   - Alta: +20-25%

## VALIDAÇÃO DE CONSISTÊNCIA ANATÔMICA

Antes de finalizar, VERIFIQUE:
1. **Simetria bilateral**: Pontos espelhados devem ter coordenadas X simétricas em relação a 0.50
2. **Hierarquia espacial**: Frontal (y < 0.25) > Glabela (y 0.28-0.40) > Periorbital (y 0.35-0.50)
3. **Conflito com zonas de perigo**: Nenhum ponto deve cair dentro das safety zones

## ZONAS DE PERIGO (OBRIGATÓRIO INCLUIR)

1. **Margem Orbital (Ptose)**: Área 1cm abaixo do arco supraorbital
   - Polígono: y entre 0.34 e 0.40 na região medial (x 0.38-0.62)
   
2. **Área Infraorbital (Assimetria)**: Região do malar
   - Polígono: x 0.25-0.40 ou 0.60-0.75, y 0.45-0.55
   
3. **Comissura Labial (Queda do sorriso)**: Cantos da boca
   - Polígono: x 0.35-0.45 ou 0.55-0.65, y 0.65-0.75

## FORMATO JSON OBRIGATÓRIO

{
  "meta_data": {
    "algorithm_version": "v3.0_precision_enhanced",
    "analysis_timestamp": "[ISO timestamp]",
    "photos_analyzed": number,
    "dynamic_analysis_performed": boolean
  },
  "patient_profile": {
    "estimated_gender": "male" | "female",
    "estimated_age_range": "20-30" | "30-40" | "40-50" | "50+",
    "muscle_strength_score": "low" | "medium" | "high",
    "skin_type_glogau": "I" | "II" | "III" | "IV",
    "facial_asymmetry_detected": boolean,
    "asymmetry_notes": "Descrição se detectada"
  },
  "anatomical_landmarks": {
    "left_pupil": { "x": number, "y": number },
    "right_pupil": { "x": number, "y": number },
    "nasion": { "x": number, "y": number },
    "glabella_center": { "x": number, "y": number },
    "left_brow_head": { "x": number, "y": number },
    "right_brow_head": { "x": number, "y": number },
    "left_lateral_canthus": { "x": number, "y": number },
    "right_lateral_canthus": { "x": number, "y": number }
  },
  "treatment_plan": {
    "product_selected": "OnabotulinumtoxinA",
    "conversion_factor": 1.0,
    "total_units_suggested": number,
    "zones": [
      {
        "zone_name": "Glabella" | "Frontalis" | "Periorbital" | "Nasal" | "Perioral" | "Mentalis" | "Masseter",
        "anatomy_target": "Nome dos músculos alvo",
        "severity_scale_merz": 0-4,
        "zone_confidence": 0.0-1.0,
        "total_units_zone": number,
        "injection_pattern": "central_radial" | "v_shape_grid" | "fan_pattern" | "bilateral_symmetric" | "linear" | "perioral_radial",
        "injection_points": [
          {
            "id": "unique_id",
            "type": "procerus" | "corrugator_head" | "corrugator_tail" | "frontalis" | "orbicularis" | "nasalis" | "orbicularis_oris" | "depressor" | "mentalis" | "masseter",
            "muscle": "Nome do músculo em português",
            "units": number,
            "depth": "deep_intramuscular" | "superficial",
            "coordinates": { "x": 0.0-1.0, "y": 0.0-1.0 },
            "point_confidence": 0.0-1.0,
            "safety_warning": boolean,
            "warning_message": "Mensagem de aviso se necessário",
            "rationale": "Justificativa anatômica para este ponto"
          }
        ]
      }
    ],
    "safety_zones_to_avoid": [
      {
        "region": "Nome da região",
        "reason": "Razão do risco",
        "clinical_consequence": "Consequência clínica se violado",
        "polygon_coordinates": [
          { "x": number, "y": number }
        ]
      }
    ]
  },
  "validation_checks": {
    "bilateral_symmetry_verified": boolean,
    "spatial_hierarchy_verified": boolean,
    "danger_zone_conflicts": [],
    "dosage_within_literature": boolean
  },
  "clinical_notes": "Observações clínicas detalhadas incluindo: análise da dinâmica muscular observada, justificativa para dosagens escolhidas, recomendações de acompanhamento, alertas específicos para este paciente",
  "differential_recommendations": "Se identificar variação anatômica ou assimetria significativa, descrever ajuste recomendado",
  "confidence": 0.0-1.0,
  "confidence_breakdown": {
    "image_quality": 0.0-1.0,
    "landmark_visibility": 0.0-1.0,
    "pattern_typicality": 0.0-1.0,
    "dynamic_consistency": 0.0-1.0
  }
}

## INSTRUÇÕES FINAIS

1. ANALISE cada foto fornecida minuciosamente
2. IDENTIFIQUE os landmarks anatômicos ANTES de marcar pontos
3. CALCULE as coordenadas com PRECISÃO baseado nos landmarks
4. VERIFIQUE a consistência bilateral e hierárquica
5. DOCUMENTE o raciocínio clínico
6. SEJA CONSERVADOR nas dosagens (segurança primeiro)
7. RETORNE APENAS o JSON, sem markdown ou texto adicional`;

// Input validation functions
function validateImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Allow base64 images
  if (url.startsWith('data:image/')) return true;
  
  // Allow Supabase storage URLs
  if (url.includes('supabase.co') || url.includes('supabase.in')) return true;
  
  return false;
}

function validateGender(gender: unknown): gender is 'masculino' | 'feminino' | undefined {
  if (gender === undefined || gender === null) return true;
  return gender === 'masculino' || gender === 'feminino';
}

function validateAge(age: unknown): age is number | undefined {
  if (age === undefined || age === null) return true;
  if (typeof age !== 'number') return false;
  return age >= 0 && age <= 150 && Number.isInteger(age);
}

function validateMuscleStrength(strength: unknown): strength is 'low' | 'medium' | 'high' | undefined {
  if (strength === undefined || strength === null) return true;
  return strength === 'low' || strength === 'medium' || strength === 'high';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ===== AUTHENTICATION CHECK =====
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Sessão inválida. Faça login novamente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    // ===== INPUT PARSING AND VALIDATION =====
    const { 
      imageUrls, 
      patientGender, 
      patientAge, 
      isFirstTime, 
      previousDosage,
      patientHistory,
      muscleStrength
    } = await req.json();
    
    // Validate that photos were provided - CRITICAL for accurate analysis
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      console.error("No images provided for analysis");
      return new Response(
        JSON.stringify({ error: "Nenhuma imagem fornecida. A análise de IA requer pelo menos 1 foto facial." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate each image URL
    for (const url of imageUrls) {
      if (!validateImageUrl(url)) {
        console.error("Invalid image URL format:", url?.substring(0, 50));
        return new Response(
          JSON.stringify({ error: "Formato de imagem inválido. Apenas imagens base64 ou do armazenamento são permitidas." }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate gender
    if (!validateGender(patientGender)) {
      return new Response(
        JSON.stringify({ error: "Gênero inválido. Use 'masculino' ou 'feminino'." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate age
    if (!validateAge(patientAge)) {
      return new Response(
        JSON.stringify({ error: "Idade inválida. Deve ser um número inteiro entre 0 e 150." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate muscle strength
    if (!validateMuscleStrength(muscleStrength)) {
      return new Response(
        JSON.stringify({ error: "Força muscular inválida. Use 'low', 'medium' ou 'high'." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validImages = imageUrls.filter((u: string) => u && u.length > 0);
    
    if (validImages.length === 0) {
      console.error("All provided image URLs are empty");
      return new Response(
        JSON.stringify({ error: "Todas as URLs de imagem estão vazias. Capture fotos do paciente antes de analisar." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log photo count for debugging
    console.log(`Analyzing ${validImages.length} photos for user ${user.id}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Serviço de IA não configurado" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasDynamicPhotos = validImages.length > 1;
    
    // Build patient context with history
    const patientContext = [];
    if (patientGender) patientContext.push(`Gênero: ${patientGender}`);
    if (patientAge) patientContext.push(`Idade: ${patientAge} anos`);
    if (muscleStrength) patientContext.push(`Força muscular avaliada: ${muscleStrength}`);
    
    // Determine if this is a return consultation based on history
    const isReturnConsultation = patientHistory && patientHistory.consultationCount > 0;
    patientContext.push(`Tipo de consulta: ${isReturnConsultation ? 'RETORNO' : 'PRIMEIRA APLICAÇÃO'}`);
    
    // Add patient history context for AI decision-making
    if (patientHistory) {
      if (patientHistory.consultationCount > 0) {
        patientContext.push(`Consultas anteriores: ${patientHistory.consultationCount}`);
      }
      if (patientHistory.lastDosages) {
        const lastTotal = Object.values(patientHistory.lastDosages).reduce((sum: number, val: unknown) => sum + (Number(val) || 0), 0);
        patientContext.push(`Última dosagem total: ${lastTotal}U`);
        if (patientHistory.lastDosages.procerus) patientContext.push(`  - Prócero: ${patientHistory.lastDosages.procerus}U`);
        if (patientHistory.lastDosages.corrugator) patientContext.push(`  - Corrugador: ${patientHistory.lastDosages.corrugator}U`);
        if (patientHistory.lastDosages.frontalis) patientContext.push(`  - Frontal: ${patientHistory.lastDosages.frontalis}U`);
      }
      if (patientHistory.averageInterval) {
        patientContext.push(`Intervalo médio entre sessões: ${patientHistory.averageInterval} dias`);
        if (patientHistory.averageInterval < 90) {
          patientContext.push(`⚠️ ALERTA: Intervalo curto! Considerar se houve necessidade de retoque ou subdosagem anterior.`);
        }
      }
      if (patientHistory.lastConsultationDate) {
        patientContext.push(`Última consulta: ${patientHistory.lastConsultationDate}`);
      }
      if (patientHistory.clinicalResponse) {
        patientContext.push(`Resposta clínica anterior: ${patientHistory.clinicalResponse}`);
      }
    } else if (isFirstTime !== undefined) {
      patientContext.push(`Primeira aplicação: ${isFirstTime ? 'Sim' : 'Não'}`);
    }
    
    if (previousDosage) patientContext.push(`Dosagem anterior total informada: ${previousDosage}U`);

    const contextStr = patientContext.length > 0 
      ? `\n\nINFORMAÇÕES DO PACIENTE E HISTÓRICO:\n${patientContext.join('\n')}\n\n${isReturnConsultation ? 'ORIENTAÇÃO PARA RETORNO: Considere o histórico ao ajustar dosagens. Se paciente teve boa resposta, mantenha protocolo similar. Se precisou de retoque, considere aumentar dose 10-15%. Se teve efeitos indesejados, seja mais conservador.' : 'ORIENTAÇÃO PRIMEIRA APLICAÇÃO: Seja conservador nas dosagens iniciais. Prefira subdosar levemente e ajustar em retorno do que arriscar efeitos indesejados.'}`
      : '';

    const content: unknown[] = [
      {
        type: "text",
        text: `TAREFA: Analise estas ${validImages.length} foto(s) facial(is) para planejamento PRECISO de tratamento com toxina botulínica.
${contextStr}

PROTOCOLO DE ANÁLISE OBRIGATÓRIO:
1. Primeiro, identifique e registre TODOS os landmarks anatômicos visíveis
2. Use os landmarks como referência para posicionar cada ponto de injeção
3. Calcule coordenadas relativas (0.0-1.0) com PRECISÃO milimétrica
4. Avalie a severidade de cada zona usando a Escala de Merz
5. Determine a força muscular comparando repouso vs contração ${hasDynamicPhotos ? '(FOTOS DINÂMICAS DISPONÍVEIS)' : '(apenas repouso disponível)'}
6. Calcule dosagens individualizadas seguindo o protocolo do consenso brasileiro
7. Verifique simetria bilateral e conflitos com zonas de perigo
8. Documente seu raciocínio clínico

FOTOS FORNECIDAS (na ordem):
${validImages.map((_: string, i: number) => {
  const labels = [
    '1. Face em REPOUSO (expressão neutra) - REFERÊNCIA PRINCIPAL',
    '2. Contração GLABELAR (franzir/expressão de bravo)',
    '3. Contração FRONTAL (surpresa/elevar sobrancelhas)',
    '4. SORRISO forçado (mostrar todos os dentes)',
    '5. Contração NASAL (bunny lines)',
    '6. Contração PERIORAL (bico/assovio)',
    '7. PERFIL esquerdo',
    '8. PERFIL direito'
  ];
  return labels[i] || `${i + 1}. Foto adicional`;
}).join('\n')}

ATENÇÃO ESPECIAL:
- Verifique ASSIMETRIA entre os lados da face
- Note qualquer variação anatômica não-usual
- Seja CONSERVADOR nas dosagens iniciais
- Priorize SEGURANÇA sobre resultado estético máximo

Retorne o JSON estruturado conforme o formato especificado no system prompt.`
      }
    ];

    for (const url of validImages) {
      content.push({
        type: "image_url",
        image_url: { url }
      });
    }

    console.log(`Calling Lovable AI with ${validImages.length} images for precision analysis`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status);
      
      // Return user-friendly error messages without internal details
      const errorMessages: Record<number, string> = {
        429: 'Limite de requisições excedido. Tente novamente mais tarde.',
        402: 'Créditos de IA esgotados. Por favor, adicione créditos.',
        401: 'Erro de autenticação com o serviço de IA.',
        403: 'Acesso negado ao serviço de IA.',
      };
      
      const message = errorMessages[response.status] || 'Erro ao processar análise. Tente novamente.';
      
      return new Response(
        JSON.stringify({ error: message }),
        { status: response.status >= 500 ? 500 : response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error("No response from AI");
      return new Response(
        JSON.stringify({ error: "Nenhuma análise gerada" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("AI response received, parsing with enhanced validation...");

    let analysis;
    try {
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiResponse.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, aiResponse];
      const jsonStr = jsonMatch[1] || aiResponse;
      analysis = JSON.parse(jsonStr.trim());
      
      // Validate and enhance analysis
      if (analysis.treatment_plan && analysis.treatment_plan.zones) {
        const legacyPoints: unknown[] = [];
        const dosageByMuscle: Record<string, number> = {};
        
        // Calculate average confidence
        let totalZoneConfidence = 0;
        let zoneCount = 0;
        
        for (const zone of analysis.treatment_plan.zones) {
          if (zone.zone_confidence) {
            totalZoneConfidence += zone.zone_confidence;
            zoneCount++;
          }
          
          if (zone.injection_points && Array.isArray(zone.injection_points)) {
            for (const point of zone.injection_points) {
              // Map new format to legacy format for compatibility
              const legacyPoint = {
                id: point.id || `${point.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                muscle: point.type || point.muscle || 'unknown',
                x: point.coordinates?.x ? point.coordinates.x * 100 : 50,
                y: point.coordinates?.y ? point.coordinates.y * 100 : 50,
                depth: point.depth || 'superficial',
                dosage: point.units || 0,
                notes: point.rationale || point.warning_message || '',
                confidence: point.point_confidence || zone.zone_confidence || 0.7,
                safetyWarning: point.safety_warning || false
              };
              
              legacyPoints.push(legacyPoint);
              
              // Aggregate dosages by muscle type
              const muscleType = legacyPoint.muscle.replace(/_left|_right|_head|_tail/g, '');
              dosageByMuscle[muscleType] = (dosageByMuscle[muscleType] || 0) + legacyPoint.dosage;
            }
          }
        }
        
        // Build legacy response format
        const legacyResponse = {
          injectionPoints: legacyPoints,
          totalDosage: {
            procerus: dosageByMuscle.procerus || 0,
            corrugator: (dosageByMuscle.corrugator || 0) + 
                       (dosageByMuscle.corrugator_head || 0) + 
                       (dosageByMuscle.corrugator_tail || 0),
            frontalis: dosageByMuscle.frontalis || 0,
            orbicularis_oculi: dosageByMuscle.orbicularis || dosageByMuscle.orbicularis_oculi || 0,
            other: 0,
            total: analysis.treatment_plan.total_units_suggested || 0
          },
          clinicalNotes: analysis.clinical_notes || analysis.differential_recommendations || '',
          confidence: zoneCount > 0 ? totalZoneConfidence / zoneCount : (analysis.confidence || 0.7),
          
          // Include enhanced data
          anatomicalLandmarks: analysis.anatomical_landmarks,
          patientProfile: analysis.patient_profile,
          safetyZones: analysis.treatment_plan.safety_zones_to_avoid,
          validationChecks: analysis.validation_checks,
          confidenceBreakdown: analysis.confidence_breakdown,
          metaData: analysis.meta_data
        };
        
        // Calculate total if not provided
        if (!legacyResponse.totalDosage.total) {
          legacyResponse.totalDosage.total = 
            legacyResponse.totalDosage.procerus +
            legacyResponse.totalDosage.corrugator +
            legacyResponse.totalDosage.frontalis +
            legacyResponse.totalDosage.orbicularis_oculi;
        }
        
        console.log(`Analysis complete: ${legacyPoints.length} points, total ${legacyResponse.totalDosage.total}U, confidence ${Math.round(legacyResponse.confidence * 100)}%`);
        
        return new Response(
          JSON.stringify(legacyResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Fallback for simpler response format
      return new Response(
        JSON.stringify({
          injectionPoints: analysis.injectionPoints || [],
          totalDosage: analysis.totalDosage || { procerus: 0, corrugator: 0, total: 0 },
          clinicalNotes: analysis.clinicalNotes || analysis.clinical_notes || '',
          confidence: analysis.confidence || 0.7
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      
      // Return a fallback response
      return new Response(
        JSON.stringify({
          injectionPoints: [
            { id: "proc_1", muscle: "procerus", x: 50, y: 25, depth: "deep", dosage: 8, notes: "Ponto central do procerus" },
            { id: "corr_l1", muscle: "corrugator_left", x: 35, y: 22, depth: "deep", dosage: 6, notes: "Corrugador esquerdo" },
            { id: "corr_r1", muscle: "corrugator_right", x: 65, y: 22, depth: "deep", dosage: 6, notes: "Corrugador direito" },
          ],
          totalDosage: { procerus: 8, corrugator: 12, total: 20 },
          clinicalNotes: "Análise padrão aplicada (fallback). Recomenda-se revisão manual dos pontos.",
          confidence: 0.5
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno no processamento. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
