import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { format, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus, Calendar, Syringe, Activity, Download, Loader2 } from "lucide-react";

interface Analysis {
  id: string;
  created_at: string;
  procerus_dosage: number;
  corrugator_dosage: number;
  ai_injection_points: any;
  notes: string;
  status: string;
}

interface PatientTreatmentHistoryProps {
  patientId: string;
  patientName: string;
}

export function PatientTreatmentHistory({ patientId, patientName }: PatientTreatmentHistoryProps) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("12");

  useEffect(() => {
    fetchAnalyses();
  }, [patientId, timeRange]);

  const fetchAnalyses = async () => {
    setIsLoading(true);
    try {
      const fromDate = subMonths(new Date(), parseInt(timeRange));
      
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'completed')
        .gte('created_at', fromDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Error fetching analyses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare data for line chart
  const lineChartData = analyses.map(a => {
    const points = a.ai_injection_points || [];
    const dosagesByMuscle: Record<string, number> = {};
    
    points.forEach((p: any) => {
      const muscle = p.muscle || 'Outros';
      dosagesByMuscle[muscle] = (dosagesByMuscle[muscle] || 0) + (p.dosage || 0);
    });

    return {
      date: format(parseISO(a.created_at), "dd/MM/yy", { locale: ptBR }),
      fullDate: format(parseISO(a.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      Procerus: dosagesByMuscle['Procerus'] || a.procerus_dosage || 0,
      Corrugador: (dosagesByMuscle['Corrugador Esquerdo'] || 0) + (dosagesByMuscle['Corrugador Direito'] || 0) || a.corrugator_dosage || 0,
      Frontal: dosagesByMuscle['Frontal'] || 0,
      Orbicular: (dosagesByMuscle['Orbicular Esquerdo'] || 0) + (dosagesByMuscle['Orbicular Direito'] || 0),
      Total: points.reduce((sum: number, p: any) => sum + (p.dosage || 0), 0) || (a.procerus_dosage || 0) + (a.corrugator_dosage || 0)
    };
  });

  // Prepare data for bar chart (comparing sessions)
  const barChartData = analyses.slice(-5).map((a, index) => {
    const points = a.ai_injection_points || [];
    const total = points.reduce((sum: number, p: any) => sum + (p.dosage || 0), 0) || 
                  (a.procerus_dosage || 0) + (a.corrugator_dosage || 0);
    
    return {
      session: `Sessão ${index + 1}`,
      date: format(parseISO(a.created_at), "dd/MM", { locale: ptBR }),
      dosagem: total
    };
  });

  // Prepare data for radar chart
  const getRadarData = () => {
    if (analyses.length === 0) return [];
    
    const lastAnalysis = analyses[analyses.length - 1];
    const points = lastAnalysis.ai_injection_points || [];
    const dosagesByMuscle: Record<string, number> = {};
    
    points.forEach((p: any) => {
      const muscle = p.muscle || 'Outros';
      const simpleMuscle = muscle.replace(' Esquerdo', '').replace(' Direito', '');
      dosagesByMuscle[simpleMuscle] = (dosagesByMuscle[simpleMuscle] || 0) + (p.dosage || 0);
    });

    return Object.entries(dosagesByMuscle).map(([muscle, dosage]) => ({
      muscle,
      dosagem: dosage,
      fullMark: 30
    }));
  };

  // Calculate metrics
  const metrics = {
    totalSessions: analyses.length,
    avgDosage: analyses.length > 0 
      ? Math.round(analyses.reduce((sum, a) => {
          const points = a.ai_injection_points || [];
          return sum + points.reduce((s: number, p: any) => s + (p.dosage || 0), 0);
        }, 0) / analyses.length)
      : 0,
    avgInterval: analyses.length > 1
      ? Math.round((parseISO(analyses[analyses.length - 1].created_at).getTime() - 
                    parseISO(analyses[0].created_at).getTime()) / 
                   (1000 * 60 * 60 * 24 * (analyses.length - 1)))
      : 0,
    lastSession: analyses.length > 0 
      ? format(parseISO(analyses[analyses.length - 1].created_at), "dd/MM/yyyy", { locale: ptBR })
      : '-',
    trend: analyses.length >= 2
      ? (() => {
          const last = analyses[analyses.length - 1];
          const prev = analyses[analyses.length - 2];
          const lastTotal = (last.ai_injection_points || []).reduce((s: number, p: any) => s + (p.dosage || 0), 0);
          const prevTotal = (prev.ai_injection_points || []).reduce((s: number, p: any) => s + (p.dosage || 0), 0);
          return lastTotal > prevTotal ? 'up' : lastTotal < prevTotal ? 'down' : 'stable';
        })()
      : 'stable'
  };

  if (isLoading) {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Histórico de Tratamentos</h2>
          <p className="text-muted-foreground">{patientName}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último ano</SelectItem>
              <SelectItem value="24">Últimos 2 anos</SelectItem>
              <SelectItem value="60">Todo histórico</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.totalSessions}</p>
                <p className="text-sm text-muted-foreground">Sessões</p>
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
              <div className="p-2 rounded-lg bg-green-500/10">
                <Activity className="w-5 h-5 text-green-500" />
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
                <p className="text-sm font-medium">{metrics.lastSession}</p>
                <p className="text-sm text-muted-foreground">Última sessão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {analyses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum tratamento encontrado no período selecionado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Line Chart - Dosage Evolution */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Evolução das Dosagens por Músculo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Procerus" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Corrugador" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Frontal" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Orbicular" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Total" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart - Session Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comparativo de Sessões</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="session" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [`${value}U`, 'Dosagem Total']}
                    />
                    <Bar dataKey="dosagem" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={getRadarData()}>
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
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Session List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Sessões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analyses.slice().reverse().map((analysis, index) => {
              const points = analysis.ai_injection_points || [];
              const totalDosage = points.reduce((sum: number, p: any) => sum + (p.dosage || 0), 0) ||
                                  (analysis.procerus_dosage || 0) + (analysis.corrugator_dosage || 0);
              
              return (
                <div 
                  key={analysis.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {analyses.length - index}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {format(parseISO(analysis.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {points.length} pontos de aplicação
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-base font-semibold">
                      {totalDosage}U
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
