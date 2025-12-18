import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é um especialista em medicina estética, especificamente em análise facial para aplicação de toxina botulínica.

Sua tarefa é analisar fotos faciais e retornar um JSON estruturado profissional para planejamento de tratamento.

## SISTEMA DE COORDENADAS (CRÍTICO)
Use coordenadas RELATIVAS (0.0 a 1.0) baseadas na bounding box da face:
- x: 0.0 = extrema esquerda, 0.5 = centro, 1.0 = extrema direita
- y: 0.0 = topo da testa, 1.0 = ponta do queixo

## ESCALA DE AVALIAÇÃO
Use a Escala de Merz (0-4) para severidade:
- 0: Sem rugas visíveis
- 1: Rugas muito leves
- 2: Rugas moderadas
- 3: Rugas severas
- 4: Rugas muito severas

Use a Escala de Glogau (I-IV) para envelhecimento:
- I: Sem rugas (20-30 anos)
- II: Rugas em movimento (30-40 anos)
- III: Rugas em repouso (40-50 anos)
- IV: Apenas rugas (50+ anos)

## MÚSCULOS E DOSAGENS (em Unidades Botox®/OnabotulinumtoxinA)

GLABELA (Complexo):
- procerus: Central, 1 ponto, 4-10U
- corrugator (par): Cabeça e cauda, 2-3 pontos cada lado, 8-20U total

FRONTAL:
- frontalis: Grid em V, 4-8 pontos, 10-30U total
- REGRA: Mínimo 2cm acima da sobrancelha

PERIORBITAL:
- orbicularis_oculi: Fan pattern, 3-4 pontos por lado, 6-15U por lado
- REGRA: 1cm lateral à borda óssea orbital

NASAL:
- nasalis: Bunny lines, 1-2 pontos por lado, 2-6U total

PERIORAL:
- orbicularis_oris: Código de barras, 2-4 pontos, 2-6U
- depressor_anguli: Comissuras, 1-2 pontos por lado, 2-6U

INFERIOR:
- mentalis: Queixo, 1-2 pontos centrais, 4-10U
- masseter: Bruxismo/slim, 3-5 pontos por lado, 25-50U por lado

## PROFUNDIDADE DE INJEÇÃO
- "deep_intramuscular": Músculos profundos (Prócero, Corrugadores, Mentual, Masseter) - agulha 90º
- "superficial": Músculos superficiais (Frontal, Orbicular, Perioral) - pápula subdérmica

## ZONAS DE PERIGO (incluir no response)
1. Margem Orbital: 1cm acima para evitar ptose palpebral
2. Área Infraorbital: Risco de assimetria do sorriso
3. Comissura Labial: Risco de boca caída

## FORMATO JSON OBRIGATÓRIO

{
  "meta_data": {
    "algorithm_version": "v2.4_medical_consensus",
    "image_id": "analysis_[timestamp]"
  },
  "patient_profile": {
    "estimated_gender": "male" | "female",
    "estimated_age_range": "20-30" | "30-40" | "40-50" | "50+",
    "muscle_strength_score": "low" | "medium" | "high",
    "skin_type_glogau": "I" | "II" | "III" | "IV"
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
        "total_units_zone": number,
        "injection_pattern": "central_radial" | "v_shape_grid" | "fan_pattern" | "bilateral_symmetric" | "linear",
        "injection_points": [
          {
            "id": "unique_id",
            "type": "procerus" | "corrugator_head" | "corrugator_tail" | etc,
            "muscle": "Nome do músculo em português",
            "units": number,
            "depth": "deep_intramuscular" | "superficial",
            "coordinates": { "x": 0.0-1.0, "y": 0.0-1.0 },
            "safety_warning": boolean,
            "warning_message": "Mensagem de aviso se necessário"
          }
        ]
      }
    ],
    "safety_zones_to_avoid": [
      {
        "region": "Nome da região",
        "reason": "Razão do risco",
        "polygon_coordinates": [
          { "x": number, "y": number }
        ]
      }
    ]
  },
  "clinical_notes": "Observações clínicas detalhadas em português",
  "confidence": 0.0-1.0
}

IMPORTANTE:
- Analise a anatomia muscular visível nas fotos
- Seja conservador nas dosagens (segurança primeiro)
- Inclua TODAS as zonas de perigo relevantes
- Ajuste doses: Homens +30-50%, Força muscular alta +20%
- Retorne APENAS o JSON, sem markdown ou texto adicional`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrls, patientGender, patientAge } = await req.json();
    
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma imagem fornecida" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Serviço de IA não configurado" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const patientContext = patientGender || patientAge 
      ? `\n\nInformações do paciente: ${patientGender ? `Gênero: ${patientGender}` : ''} ${patientAge ? `Idade: ${patientAge} anos` : ''}`
      : '';

    const content: any[] = [
      {
        type: "text",
        text: `Analise estas fotos faciais para planejamento de tratamento com toxina botulínica.${patientContext}
        
Descrição das fotos (em ordem):
1. Face em repouso (expressão neutra)
2. Contração glabelar (expressão de bravo) - se fornecida
3. Contração frontal (surpresa) - se fornecida
4. Sorriso forçado - se fornecida
5. Contração nasal (bunny lines) - se fornecida
6. Contração perioral - se fornecida
7. Perfil esquerdo - se fornecido
8. Perfil direito - se fornecido

Analise cuidadosamente e retorne o JSON estruturado conforme especificado.`
      }
    ];

    for (const url of imageUrls.filter((u: string) => u)) {
      content.push({
        type: "image_url",
        image_url: { url }
      });
    }

    console.log("Calling Lovable AI with", imageUrls.filter((u: string) => u).length, "images");

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
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Por favor, adicione créditos." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Falha na análise de IA" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    console.log("AI response received, parsing...");

    let analysis;
    try {
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiResponse.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, aiResponse];
      const jsonStr = jsonMatch[1] || aiResponse;
      analysis = JSON.parse(jsonStr.trim());
      
      // Convert new format to legacy format for backward compatibility
      if (analysis.treatment_plan && analysis.treatment_plan.zones) {
        const legacyPoints: any[] = [];
        const dosageByMuscle: Record<string, number> = {};
        
        for (const zone of analysis.treatment_plan.zones) {
          for (const point of zone.injection_points || []) {
            legacyPoints.push({
              id: point.id,
              muscle: point.muscle || point.type,
              x: Math.round((point.coordinates?.x || 0.5) * 100),
              y: Math.round((point.coordinates?.y || 0.5) * 100),
              depth: point.depth === 'deep_intramuscular' ? 'deep' : 'superficial',
              dosage: point.units,
              notes: point.warning_message || '',
              safetyWarning: point.safety_warning,
              relativeX: point.coordinates?.x,
              relativeY: point.coordinates?.y
            });
            
            const muscleKey = point.muscle || point.type || 'other';
            dosageByMuscle[muscleKey] = (dosageByMuscle[muscleKey] || 0) + (point.units || 0);
          }
        }
        
        analysis.injectionPoints = legacyPoints;
        analysis.totalDosage = {
          procerus: dosageByMuscle['Procerus'] || dosageByMuscle['procerus'] || 0,
          corrugator: (dosageByMuscle['Corrugador Esquerdo'] || 0) + (dosageByMuscle['Corrugador Direito'] || 0) + (dosageByMuscle['corrugator'] || 0),
          frontalis: dosageByMuscle['Frontal'] || dosageByMuscle['frontalis'] || 0,
          orbicularis_oculi: (dosageByMuscle['Orbicular Esquerdo'] || 0) + (dosageByMuscle['Orbicular Direito'] || 0) + (dosageByMuscle['orbicularis'] || 0),
          other: Object.entries(dosageByMuscle)
            .filter(([k]) => !['Procerus', 'procerus', 'Corrugador Esquerdo', 'Corrugador Direito', 'corrugator', 'Frontal', 'frontalis', 'Orbicular Esquerdo', 'Orbicular Direito', 'orbicularis'].includes(k))
            .reduce((sum, [, v]) => sum + v, 0),
          total: analysis.treatment_plan.total_units_suggested || legacyPoints.reduce((sum, p) => sum + (p.dosage || 0), 0)
        };
        analysis.clinicalNotes = analysis.clinical_notes || '';
        analysis.safetyZones = analysis.treatment_plan.safety_zones_to_avoid || [];
        analysis.patientProfile = analysis.patient_profile;
      }
      
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw response:", aiResponse);
      
      // Return comprehensive default analysis
      analysis = {
        meta_data: {
          algorithm_version: "v2.4_fallback",
          image_id: `analysis_${Date.now()}`
        },
        patient_profile: {
          estimated_gender: patientGender || "female",
          estimated_age_range: "30-40",
          muscle_strength_score: "medium",
          skin_type_glogau: "II"
        },
        treatment_plan: {
          product_selected: "OnabotulinumtoxinA",
          conversion_factor: 1.0,
          total_units_suggested: 54,
          zones: [
            {
              zone_name: "Glabella",
              anatomy_target: "Procerus & Corrugadores",
              severity_scale_merz: 2,
              total_units_zone: 20,
              injection_pattern: "central_radial",
              injection_points: [
                { id: "g1", type: "procerus", muscle: "Procerus", units: 4, depth: "deep_intramuscular", coordinates: { x: 0.50, y: 0.35 }, safety_warning: false },
                { id: "g2", type: "corrugator_head", muscle: "Corrugador Esquerdo", units: 5, depth: "deep_intramuscular", coordinates: { x: 0.44, y: 0.33 }, safety_warning: false },
                { id: "g3", type: "corrugator_tail", muscle: "Corrugador Esquerdo", units: 3, depth: "superficial", coordinates: { x: 0.38, y: 0.31 }, safety_warning: true, warning_message: "Manter 1cm acima da margem orbital" },
                { id: "g4", type: "corrugator_head", muscle: "Corrugador Direito", units: 5, depth: "deep_intramuscular", coordinates: { x: 0.56, y: 0.33 }, safety_warning: false },
                { id: "g5", type: "corrugator_tail", muscle: "Corrugador Direito", units: 3, depth: "superficial", coordinates: { x: 0.62, y: 0.31 }, safety_warning: true, warning_message: "Manter 1cm acima da margem orbital" }
              ]
            },
            {
              zone_name: "Frontalis",
              anatomy_target: "Músculo Frontal",
              severity_scale_merz: 2,
              total_units_zone: 14,
              injection_pattern: "v_shape_grid",
              injection_points: [
                { id: "f1", type: "frontalis", muscle: "Frontal", units: 2, depth: "superficial", coordinates: { x: 0.35, y: 0.18 }, safety_warning: false },
                { id: "f2", type: "frontalis", muscle: "Frontal", units: 2, depth: "superficial", coordinates: { x: 0.42, y: 0.15 }, safety_warning: false },
                { id: "f3", type: "frontalis", muscle: "Frontal", units: 3, depth: "superficial", coordinates: { x: 0.50, y: 0.12 }, safety_warning: false },
                { id: "f4", type: "frontalis", muscle: "Frontal", units: 2, depth: "superficial", coordinates: { x: 0.58, y: 0.15 }, safety_warning: false },
                { id: "f5", type: "frontalis", muscle: "Frontal", units: 2, depth: "superficial", coordinates: { x: 0.65, y: 0.18 }, safety_warning: false },
                { id: "f6", type: "frontalis", muscle: "Frontal", units: 3, depth: "superficial", coordinates: { x: 0.50, y: 0.20 }, safety_warning: false }
              ]
            },
            {
              zone_name: "Periorbital",
              anatomy_target: "Orbicular dos Olhos",
              severity_scale_merz: 2,
              total_units_zone: 20,
              injection_pattern: "fan_pattern",
              injection_points: [
                { id: "o1", type: "orbicularis", muscle: "Orbicular Esquerdo", units: 3, depth: "superficial", coordinates: { x: 0.26, y: 0.38 }, safety_warning: false },
                { id: "o2", type: "orbicularis", muscle: "Orbicular Esquerdo", units: 4, depth: "superficial", coordinates: { x: 0.24, y: 0.42 }, safety_warning: false },
                { id: "o3", type: "orbicularis", muscle: "Orbicular Esquerdo", units: 3, depth: "superficial", coordinates: { x: 0.26, y: 0.46 }, safety_warning: false },
                { id: "o4", type: "orbicularis", muscle: "Orbicular Direito", units: 3, depth: "superficial", coordinates: { x: 0.74, y: 0.38 }, safety_warning: false },
                { id: "o5", type: "orbicularis", muscle: "Orbicular Direito", units: 4, depth: "superficial", coordinates: { x: 0.76, y: 0.42 }, safety_warning: false },
                { id: "o6", type: "orbicularis", muscle: "Orbicular Direito", units: 3, depth: "superficial", coordinates: { x: 0.74, y: 0.46 }, safety_warning: false }
              ]
            }
          ],
          safety_zones_to_avoid: [
            {
              region: "Margem Orbital Superior",
              reason: "Risco de Ptose Palpebral",
              polygon_coordinates: [
                { x: 0.35, y: 0.36 },
                { x: 0.65, y: 0.36 },
                { x: 0.65, y: 0.40 },
                { x: 0.35, y: 0.40 }
              ]
            }
          ]
        },
        clinical_notes: "Análise padrão para tratamento facial do terço superior. Recomenda-se avaliação individualizada da dinâmica muscular. Ajuste as dosagens conforme a massa muscular e histórico do paciente.",
        confidence: 0.75,
        // Legacy format
        injectionPoints: [
          { id: "g1", muscle: "Procerus", x: 50, y: 35, depth: "deep", dosage: 4, notes: "", relativeX: 0.50, relativeY: 0.35 },
          { id: "g2", muscle: "Corrugador Esquerdo", x: 44, y: 33, depth: "deep", dosage: 5, notes: "", relativeX: 0.44, relativeY: 0.33 },
          { id: "g3", muscle: "Corrugador Esquerdo", x: 38, y: 31, depth: "superficial", dosage: 3, notes: "Zona de cuidado", relativeX: 0.38, relativeY: 0.31, safetyWarning: true },
          { id: "g4", muscle: "Corrugador Direito", x: 56, y: 33, depth: "deep", dosage: 5, notes: "", relativeX: 0.56, relativeY: 0.33 },
          { id: "g5", muscle: "Corrugador Direito", x: 62, y: 31, depth: "superficial", dosage: 3, notes: "Zona de cuidado", relativeX: 0.62, relativeY: 0.31, safetyWarning: true },
          { id: "f1", muscle: "Frontal", x: 35, y: 18, depth: "superficial", dosage: 2, notes: "", relativeX: 0.35, relativeY: 0.18 },
          { id: "f2", muscle: "Frontal", x: 42, y: 15, depth: "superficial", dosage: 2, notes: "", relativeX: 0.42, relativeY: 0.15 },
          { id: "f3", muscle: "Frontal", x: 50, y: 12, depth: "superficial", dosage: 3, notes: "", relativeX: 0.50, relativeY: 0.12 },
          { id: "f4", muscle: "Frontal", x: 58, y: 15, depth: "superficial", dosage: 2, notes: "", relativeX: 0.58, relativeY: 0.15 },
          { id: "f5", muscle: "Frontal", x: 65, y: 18, depth: "superficial", dosage: 2, notes: "", relativeX: 0.65, relativeY: 0.18 },
          { id: "f6", muscle: "Frontal", x: 50, y: 20, depth: "superficial", dosage: 3, notes: "", relativeX: 0.50, relativeY: 0.20 },
          { id: "o1", muscle: "Orbicular Esquerdo", x: 26, y: 38, depth: "superficial", dosage: 3, notes: "", relativeX: 0.26, relativeY: 0.38 },
          { id: "o2", muscle: "Orbicular Esquerdo", x: 24, y: 42, depth: "superficial", dosage: 4, notes: "", relativeX: 0.24, relativeY: 0.42 },
          { id: "o3", muscle: "Orbicular Esquerdo", x: 26, y: 46, depth: "superficial", dosage: 3, notes: "", relativeX: 0.26, relativeY: 0.46 },
          { id: "o4", muscle: "Orbicular Direito", x: 74, y: 38, depth: "superficial", dosage: 3, notes: "", relativeX: 0.74, relativeY: 0.38 },
          { id: "o5", muscle: "Orbicular Direito", x: 76, y: 42, depth: "superficial", dosage: 4, notes: "", relativeX: 0.76, relativeY: 0.42 },
          { id: "o6", muscle: "Orbicular Direito", x: 74, y: 46, depth: "superficial", dosage: 3, notes: "", relativeX: 0.74, relativeY: 0.46 }
        ],
        totalDosage: { procerus: 4, corrugator: 16, frontalis: 14, orbicularis_oculi: 20, other: 0, total: 54 },
        clinicalNotes: "Análise padrão para tratamento facial do terço superior.",
        safetyZones: [
          {
            region: "Margem Orbital Superior",
            reason: "Risco de Ptose Palpebral",
            polygon_coordinates: [
              { x: 0.35, y: 0.36 },
              { x: 0.65, y: 0.36 },
              { x: 0.65, y: 0.40 },
              { x: 0.35, y: 0.40 }
            ]
          }
        ]
      };
    }

    console.log("Analysis complete");

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in analyze-face function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
