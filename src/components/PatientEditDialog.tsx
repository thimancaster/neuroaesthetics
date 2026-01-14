import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, User, MapPin, Heart, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { differenceInYears, parseISO } from "date-fns";

interface PatientData {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  cpf: string | null;
  address: string | null;
  allergies: string | null;
  medical_history: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  observations: string | null;
}

interface PatientEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientData | null;
  onSaved: () => void;
}

export function PatientEditDialog({
  open,
  onOpenChange,
  patient,
  onSaved,
}: PatientEditDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<Omit<PatientData, "id">>({
    name: "",
    age: null,
    gender: "feminino",
    phone: "",
    email: "",
    birth_date: "",
    cpf: "",
    address: "",
    allergies: "",
    medical_history: "",
    emergency_contact: "",
    emergency_phone: "",
    observations: "",
  });

  useEffect(() => {
    if (patient) {
      setForm({
        name: patient.name || "",
        age: patient.age,
        gender: patient.gender || "feminino",
        phone: patient.phone || "",
        email: patient.email || "",
        birth_date: patient.birth_date || "",
        cpf: patient.cpf || "",
        address: patient.address || "",
        allergies: patient.allergies || "",
        medical_history: patient.medical_history || "",
        emergency_contact: patient.emergency_contact || "",
        emergency_phone: patient.emergency_phone || "",
        observations: patient.observations || "",
      });
    }
  }, [patient]);

  const calculateAge = (birthDate: string): number | null => {
    if (!birthDate) return null;
    try {
      return differenceInYears(new Date(), parseISO(birthDate));
    } catch {
      return null;
    }
  };

  const handleBirthDateChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      birth_date: value,
      age: calculateAge(value),
    }));
  };

  const formatCPF = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9)
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSave = async () => {
    if (!patient) return;
    if (!form.name.trim()) {
      toast({
        title: "Nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const updateData: Record<string, any> = {
        name: form.name.trim(),
        age: form.age,
        gender: form.gender,
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
        birth_date: form.birth_date || null,
        cpf: form.cpf?.replace(/\D/g, "") || null,
        address: form.address?.trim() || null,
        allergies: form.allergies?.trim() || null,
        medical_history: form.medical_history?.trim() || null,
        emergency_contact: form.emergency_contact?.trim() || null,
        emergency_phone: form.emergency_phone?.replace(/\D/g, "") || null,
        observations: form.observations?.trim() || null,
      };

      const { error } = await supabase
        .from("patients")
        .update(updateData)
        .eq("id", patient.id);

      if (error) throw error;

      toast({ title: "Paciente atualizado com sucesso!" });
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Editar Dados do Paciente
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal" className="text-xs">
              <User className="w-3 h-3 mr-1" />
              Pessoal
            </TabsTrigger>
            <TabsTrigger value="address" className="text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              Endereço
            </TabsTrigger>
            <TabsTrigger value="medical" className="text-xs">
              <Heart className="w-3 h-3 mr-1" />
              Médico
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              Notas
            </TabsTrigger>
          </TabsList>

          {/* Tab Dados Pessoais */}
          <TabsContent value="personal" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Nome do paciente"
                />
              </div>

              <div>
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={form.birth_date || ""}
                  onChange={(e) => handleBirthDateChange(e.target.value)}
                />
                {form.age !== null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {form.age} anos
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="gender">Gênero</Label>
                <Select
                  value={form.gender || "feminino"}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, gender: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="masculino">Masculino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formatCPF(form.cpf || "")}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, cpf: e.target.value }))
                  }
                  placeholder="000.000.000-00"
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formatPhone(form.phone || "")}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email || ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="paciente@email.com"
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab Endereço */}
          <TabsContent value="address" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="address">Endereço Completo</Label>
              <Textarea
                id="address"
                value={form.address || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Rua, número, complemento, bairro, cidade, estado, CEP"
                rows={4}
              />
            </div>
          </TabsContent>

          {/* Tab Histórico Médico */}
          <TabsContent value="medical" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="allergies">Alergias Conhecidas</Label>
              <Textarea
                id="allergies"
                value={form.allergies || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, allergies: e.target.value }))
                }
                placeholder="Liste alergias a medicamentos, substâncias, etc."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="medical_history">Histórico Médico</Label>
              <Textarea
                id="medical_history"
                value={form.medical_history || ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    medical_history: e.target.value,
                  }))
                }
                placeholder="Condições pré-existentes, cirurgias anteriores, medicamentos em uso..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergency_contact">Contato de Emergência</Label>
                <Input
                  id="emergency_contact"
                  value={form.emergency_contact || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      emergency_contact: e.target.value,
                    }))
                  }
                  placeholder="Nome do contato"
                />
              </div>

              <div>
                <Label htmlFor="emergency_phone">Telefone Emergência</Label>
                <Input
                  id="emergency_phone"
                  value={formatPhone(form.emergency_phone || "")}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      emergency_phone: e.target.value,
                    }))
                  }
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab Observações */}
          <TabsContent value="notes" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="observations">Observações Gerais</Label>
              <Textarea
                id="observations"
                value={form.observations || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, observations: e.target.value }))
                }
                placeholder="Anotações adicionais sobre o paciente..."
                rows={6}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
