import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Building2, Stethoscope, Mail, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  clinic_name: string | null;
  specialty: string | null;
}

export function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    clinic_name: "",
    specialty: "",
  });

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
      setForm({
        full_name: data.full_name || "",
        clinic_name: data.clinic_name || "",
        specialty: data.specialty || "",
      });
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        clinic_name: form.clinic_name,
        specialty: form.specialty,
      })
      .eq("user_id", user.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Account Info */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Informações da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <p className="text-foreground mt-1">{user?.email}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">ID do Usuário</Label>
            <p className="text-foreground font-mono text-sm mt-1">{user?.id}</p>
          </div>
        </CardContent>
      </Card>

      {/* Profile Info */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Dados Profissionais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Nome Completo
            </Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
              placeholder="Dr. João Silva"
              className="bg-muted/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinic_name" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Nome da Clínica
            </Label>
            <Input
              id="clinic_name"
              value={form.clinic_name}
              onChange={(e) => setForm((prev) => ({ ...prev, clinic_name: e.target.value }))}
              placeholder="Clínica Estética Premium"
              className="bg-muted/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialty" className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Especialidade
            </Label>
            <Input
              id="specialty"
              value={form.specialty}
              onChange={(e) => setForm((prev) => ({ ...prev, specialty: e.target.value }))}
              placeholder="Dermatologia, Medicina Estética..."
              className="bg-muted/30"
            />
          </div>

          <div className="pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
