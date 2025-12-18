import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Check, Loader2 } from "lucide-react";

interface TemplatePoint {
  id: string;
  muscle: string;
  units: number;
  depth: string;
  coordinates: { x: number; y: number };
}

interface TreatmentTemplate {
  id: string;
  name: string;
  description: string;
  zone_type: string;
  default_units: number;
  gender_modifier_male: number;
  gender_modifier_female: number;
  muscle_modifier_high: number;
  muscle_modifier_medium: number;
  muscle_modifier_low: number;
  injection_points: TemplatePoint[];
  injection_pattern: string;
}

interface TreatmentTemplatesProps {
  patientGender: string;
  muscleStrength: string;
  conversionFactor: number;
  onSelectTemplate: (points: any[], totalUnits: number) => void;
}

const ZONE_COLORS: Record<string, string> = {
  glabella: "bg-rose-100 text-rose-700 border-rose-200",
  frontalis: "bg-amber-100 text-amber-700 border-amber-200",
  periorbital: "bg-blue-100 text-blue-700 border-blue-200",
  nasal: "bg-green-100 text-green-700 border-green-200",
  perioral: "bg-purple-100 text-purple-700 border-purple-200",
  mentalis: "bg-cyan-100 text-cyan-700 border-cyan-200",
  masseter: "bg-orange-100 text-orange-700 border-orange-200",
  full_upper: "bg-gradient-to-r from-rose-100 to-amber-100 text-rose-700 border-rose-200",
};

const ZONE_LABELS: Record<string, string> = {
  glabella: "Glabelar",
  frontalis: "Frontal",
  periorbital: "Periorbital",
  nasal: "Nasal",
  perioral: "Perioral",
  mentalis: "Mentual",
  masseter: "Masseter",
  full_upper: "Terço Superior",
};

export function TreatmentTemplates({ 
  patientGender, 
  muscleStrength, 
  conversionFactor,
  onSelectTemplate 
}: TreatmentTemplatesProps) {
  const [templates, setTemplates] = useState<TreatmentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('treatment_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      // Parse injection_points from JSON
      const parsed = (data || []).map(t => ({
        ...t,
        injection_points: typeof t.injection_points === 'string' 
          ? JSON.parse(t.injection_points) 
          : t.injection_points
      }));
      
      setTemplates(parsed);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAdjustedUnits = (template: TreatmentTemplate, baseUnits: number): number => {
    let units = baseUnits;
    
    // Gender modifier
    if (patientGender === 'masculino') {
      units *= template.gender_modifier_male;
    } else {
      units *= template.gender_modifier_female;
    }
    
    // Muscle strength modifier
    if (muscleStrength === 'high') {
      units *= template.muscle_modifier_high;
    } else if (muscleStrength === 'low') {
      units *= template.muscle_modifier_low;
    } else {
      units *= template.muscle_modifier_medium;
    }
    
    // Conversion factor (for different toxin brands)
    units *= conversionFactor;
    
    return Math.round(units);
  };

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const applySelectedTemplates = () => {
    const allPoints: any[] = [];
    let totalUnits = 0;

    for (const templateId of selectedTemplates) {
      const template = templates.find(t => t.id === templateId);
      if (!template) continue;

      for (const point of template.injection_points) {
        const adjustedUnits = calculateAdjustedUnits(template, point.units);
        allPoints.push({
          id: `${template.zone_type}_${point.id}`,
          muscle: point.muscle,
          x: Math.round(point.coordinates.x * 100),
          y: Math.round(point.coordinates.y * 100),
          depth: point.depth === 'deep_intramuscular' ? 'deep' : 'superficial',
          dosage: adjustedUnits,
          notes: '',
          relativeX: point.coordinates.x,
          relativeY: point.coordinates.y
        });
        totalUnits += adjustedUnits;
      }
    }

    onSelectTemplate(allPoints, totalUnits);
    setSelectedTemplates([]);
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5 text-primary" />
          Templates de Protocolo
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Selecione um ou mais protocolos pré-definidos baseados na literatura médica
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[320px] pr-4">
          <div className="grid gap-3">
            {templates.map((template) => {
              const isSelected = selectedTemplates.includes(template.id);
              const adjustedUnits = calculateAdjustedUnits(template, template.default_units);
              
              return (
                <div
                  key={template.id}
                  onClick={() => toggleTemplate(template.id)}
                  className={`
                    p-4 rounded-lg border cursor-pointer transition-all
                    ${isSelected 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{template.name}</h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${ZONE_COLORS[template.zone_type] || 'bg-muted'}`}
                        >
                          {ZONE_LABELS[template.zone_type] || template.zone_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{template.injection_points.length} pontos</span>
                        <span>•</span>
                        <span className="font-medium text-foreground">{adjustedUnits}U</span>
                        {conversionFactor !== 1 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600">Convertido</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      ${isSelected 
                        ? 'border-primary bg-primary text-primary-foreground' 
                        : 'border-muted-foreground/30'
                      }
                    `}>
                      {isSelected && <Check className="w-4 h-4" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {selectedTemplates.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">
                {selectedTemplates.length} template(s) selecionado(s)
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedTemplates([])}
              >
                Limpar
              </Button>
            </div>
            <Button 
              className="w-full"
              onClick={applySelectedTemplates}
            >
              Aplicar Templates Selecionados
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
