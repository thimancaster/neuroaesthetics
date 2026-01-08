import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from "recharts";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus, Calendar, Syringe, Activity, ChartLine, ImageIcon, BarChart3, Loader2, ArrowRight } from "lucide-react";
import { BeforeAfterComparison } from "./BeforeAfterComparison";
import { InjectionPoint } from "./Face3DViewer";

interface Analysis {
  id: string;
  created_at: string;
  procerus_dosage: number | null;
  corrugator_dosage: number | null;
  ai_injection_points: InjectionPoint[] | null;
  ai_clinical_notes: string | null;
  ai_confidence: number | null;
  resting_photo_url: string | null;
  glabellar_photo_url: string | null;
  frontal_photo_url: string | null;
  status: string | null;
  product_type: string | null;
}

interface Patient {
  id: string;
  name: string;
  age: number | null;
  created_at: string;
}

interface PatientEvolutionDashboardProps {
  patientId?: string;
  onPatientChange?: (patientId: string) => void;
}

export function PatientEvolutionDashboard({ patientId, onPatientChange }: PatientEvolutionDashboardProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("evolution");
  const [timeRange, setTimeRange] = useState("12");

  // Fetch patients
  useEffect(() => {
    fetchPatients();
  }, []);

  // Fetch analyses when patient changes
  useEffect(() => {
    if (patientId) {
      const patient = patients.find(p => p.id === patientId);
      if (patient) {
        setSelectedPatient(patient);
      }
      fetchAnalyses(patientId);
    }
  }, [patientId, patients]);

  const fetchPatients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setPatients(data || []);
      
      // Auto-select first patient if none specified
      if (!patientId && data && data.length > 0) {
        setSelectedPatient(data[0]);
        fetchAnalyses(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalyses = async (pId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .eq("patient_id", pId)
        .eq("status", "completed")
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Parse injection points
      const parsed = (data || []).map(a => ({
        ...a,
        ai_injection_points: Array.isArray(a.ai_injection_points) 
          ? a.ai_injection_points as unknown as InjectionPoint[] 
          : null
      }));
      
      setAnalyses(parsed);
    } catch (error) {
      console.error("Error fetching analyses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatientSelect = (id: string) => {
    const patient = patients.find(p => p.id === id);
    if (patient) {
      setSelectedPatient(patient);
      fetchAnalyses(id);
      onPatientChange?.(id);
    }
  };

  // Calculate evolution data
  const evolutionData = analyses.map((a, index) => {
    const points = a.ai_injection_points || [];
    const totalFromPoints = points.reduce((sum, p) => sum + (p.dosage || 0), 0);
    const total = totalFromPoints || (a.procerus_dosage || 0) + (a.corrugator_dosage || 0);
    
    // Group by muscle
    const byMuscle: Record<string, number> = {};
    points.forEach(p => {
      const muscle = p.muscle.replace(/_left|_right/g, '').replace('corrugator', 'Corrugador').replace('procerus', 'Prócero').replace('frontalis', 'Frontal').replace('orbicularis_oculi', 'Orbicular');
      byMuscle[muscle] = (byMuscle[muscle] || 0) + (p.dosage || 0);
    });

    return {
      session: index + 1,
      date: format(parseISO(a.created_at), "dd/MM/yy", { locale: ptBR }),
      fullDate: format(parseISO(a.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      total,
      confidence: a.ai_confidence ? Math.round(a.ai_confidence * 100) : null,
      procerus: a.procerus_dosage || byMuscle['Prócero'] || 0,
      corrugator: a.corrugator_dosage || byMuscle['Corrugador'] || 0,
      frontal: byMuscle['Frontal'] || 0,
      orbicular: byMuscle['Orbicular'] || 0,
      pointCount: points.length,
      product: a.product_type,
      ...byMuscle
    };
  });

  // Calculate metrics
  const metrics = {
    totalSessions: analyses.length,
    avgDosage: analyses.length > 0
      ? Math.round(evolutionData.reduce((sum, d) => sum + d.total, 0) / analyses.length)
      : 0,
    avgInterval: analyses.length > 1
      ? Math.round(
          differenceInDays(
            parseISO(analyses[analyses.length - 1].created_at),
            parseISO(analyses[0].created_at)
          ) / (analyses.length - 1)
        )
      : 0,
    trend: analyses.length >= 2
      ? (() => {
          const last = evolutionData[evolutionData.length - 1];
          const prev = evolutionData[evolutionData.length - 2];
          return last.total > prev.total ? 'up' : last.total < prev.total ? 'down' : 'stable';
        })()
      : 'stable',
    avgConfidence: analyses.length > 0
      ? Math.round(
          analyses.filter(a => a.ai_confidence).reduce((sum, a) => sum + (a.ai_confidence || 0) * 100, 0) /
          analyses.filter(a => a.ai_confidence).length
        ) || null
      : null
  };

  // Radar data for last session
  const radarData = evolutionData.length > 0
    ? Object.entries(evolutionData[evolutionData.length - 1])
        .filter(([key]) => !['session', 'date', 'fullDate', 'total', 'confidence', 'pointCount', 'product'].includes(key))
        .filter(([_, value]) => typeof value === 'number' && value > 0)
        .map(([muscle, dosage]) => ({
          muscle: muscle.charAt(0).toUpperCase() + muscle.slice(1),
          dosagem: dosage as number,
          fullMark: 30
        }))
    : [];

  if (isLoading && !selectedPatient) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Patient Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Evolução do Paciente</h2>
          {selectedPatient && (
            <p className="text-muted-foreground">
              {selectedPatient.name} {selectedPatient.age ? `• ${selectedPatient.age} anos` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPatient?.id || ""} onValueChange={handlePatientSelect}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecione um paciente" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} {p.age ? `(${p.age} anos)` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">1 ano</SelectItem>
              <SelectItem value="24">2 anos</SelectItem>
              <SelectItem value="60">Histórico completo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.totalSessions}</p>
                <p className="text-sm text-muted-foreground">Consultas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Syringe className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.avgDosage}U</p>
                <p className="text-sm text-muted-foreground">Média/sessão</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.avgInterval}d</p>
                <p className="text-sm text-muted-foreground">Intervalo médio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                metrics.trend === 'up' ? 'bg-rose-500/10' : 
                metrics.trend === 'down' ? 'bg-green-500/10' : 'bg-muted'
              }`}>
                {metrics.trend === 'up' ? (
                  <TrendingUp className="w-5 h-5 text-rose-500" />
                ) : metrics.trend === 'down' ? (
                  <TrendingDown className="w-5 h-5 text-green-500" />
                ) : (
                  <Minus className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium capitalize">{metrics.trend === 'up' ? 'Aumentando' : metrics.trend === 'down' ? 'Reduzindo' : 'Estável'}</p>
                <p className="text-sm text-muted-foreground">Tendência</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {metrics.avgConfidence && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <ChartLine className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.avgConfidence}%</p>
                  <p className="text-sm text-muted-foreground">Confiança IA</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="evolution" className="flex items-center gap-2">
            <ChartLine className="w-4 h-4" />
            Evolução
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Antes/Depois
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Detalhes
          </TabsTrigger>
        </TabsList>

        {/* Evolution Tab */}
        <TabsContent value="evolution" className="space-y-6">
          {analyses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma consulta registrada para este paciente.</p>
                <Button className="mt-4" variant="outline">
                  Nova Consulta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Line Chart - Dosage Evolution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Evolução das Dosagens por Músculo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={evolutionData}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          labelFormatter={(value, payload) => {
                            const item = payload?.[0]?.payload;
                            return item?.fullDate || value;
                          }}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#colorTotal)" strokeWidth={2} name="Total" />
                        <Line type="monotone" dataKey="procerus" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4 }} name="Prócero" />
                        <Line type="monotone" dataKey="corrugator" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="Corrugador" />
                        <Line type="monotone" dataKey="frontal" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Frontal" />
                        <Line type="monotone" dataKey="orbicular" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Orbicular" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Bar Chart - Session Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Comparativo de Sessões</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={evolutionData.slice(-6)}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            formatter={(value) => [`${value}U`, 'Dosagem Total']}
                          />
                          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Radar Chart - Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Distribuição por Região (Última Sessão)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      {radarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData}>
                            <PolarGrid className="stroke-border" />
                            <PolarAngleAxis dataKey="muscle" className="text-xs" />
                            <PolarRadiusAxis className="text-xs" />
                            <Radar
                              name="Dosagem"
                              dataKey="dosagem"
                              stroke="hsl(var(--primary))"
                              fill="hsl(var(--primary))"
                              fillOpacity={0.3}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                              formatter={(value) => [`${value}U`, 'Dosagem']}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          Sem dados detalhados
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Before/After Tab */}
        <TabsContent value="comparison">
          {selectedPatient && (
            <BeforeAfterComparison patientId={selectedPatient.id} />
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Consultas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyses.slice().reverse().map((analysis, index) => {
                  const points = analysis.ai_injection_points || [];
                  const totalDosage = points.reduce((sum, p) => sum + (p.dosage || 0), 0) ||
                                      (analysis.procerus_dosage || 0) + (analysis.corrugator_dosage || 0);

                  return (
                    <div
                      key={analysis.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-medium text-primary">
                            {analyses.length - index}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {format(parseISO(analysis.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{points.length} pontos</span>
                            {analysis.ai_confidence && (
                              <>
                                <span>•</span>
                                <span>{Math.round(analysis.ai_confidence * 100)}% confiança</span>
                              </>
                            )}
                            {analysis.product_type && (
                              <>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs">{analysis.product_type}</Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="text-lg font-semibold px-3 py-1">
                          {totalDosage}U
                        </Badge>
                      </div>
                    </div>
                  );
                })}

                {analyses.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma consulta registrada.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
