import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Edit2, Trash2, User, Calendar, FileText, Loader2, PlusCircle, Activity, MoreVertical, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PatientQuickStats } from "./PatientQuickStats";

interface Patient {
  id: string;
  name: string;
  age: number | null;
  observations: string | null;
  created_at: string;
}

interface PatientsListProps {
  patients: Patient[];
  onRefresh: () => void;
}

export function PatientsList({ patients, onRefresh }: PatientsListProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [editForm, setEditForm] = useState({
    name: "",
    age: "",
    observations: "",
  });

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditDialog = (patient: Patient) => {
    setEditingPatient(patient);
    setEditForm({
      name: patient.name,
      age: patient.age?.toString() || "",
      observations: patient.observations || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingPatient) return;
    setIsLoading(true);

    const { error } = await supabase
      .from("patients")
      .update({
        name: editForm.name,
        age: editForm.age ? parseInt(editForm.age) : null,
        observations: editForm.observations,
      })
      .eq("id", editingPatient.id);

    setIsLoading(false);

    if (error) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Paciente atualizado com sucesso!" });
      setEditingPatient(null);
      onRefresh();
    }
  };

  const handleDelete = async () => {
    if (!deletingPatient) return;
    setIsLoading(true);

    // Delete related analyses first
    await supabase.from("analyses").delete().eq("patient_id", deletingPatient.id);

    const { error } = await supabase
      .from("patients")
      .delete()
      .eq("id", deletingPatient.id);

    setIsLoading(false);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Paciente excluído com sucesso!" });
      setDeletingPatient(null);
      onRefresh();
    }
  };

  const handleNewConsultation = (patient: Patient) => {
    navigate(`/dashboard/new-analysis/${patient.id}`);
  };

  const handleViewEvolution = (patient: Patient) => {
    navigate(`/dashboard/evolution?patientId=${patient.id}`);
  };

  const handleViewProfile = (patient: Patient) => {
    navigate(`/dashboard/patients/${patient.id}`);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar paciente por nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-muted/30"
        />
      </div>

      {/* Patients List */}
      {filteredPatients.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchTerm
                ? "Nenhum paciente encontrado com esse nome."
                : "Nenhum paciente cadastrado ainda."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredPatients.map((patient) => (
            <Card key={patient.id} className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-primary" />
                      <h3 
                        className="font-medium text-foreground truncate hover:text-primary cursor-pointer"
                        onClick={() => handleViewProfile(patient)}
                      >
                        {patient.name}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {patient.age && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {patient.age} anos
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {new Date(patient.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    {patient.observations && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {patient.observations}
                      </p>
                    )}
                    <PatientQuickStats patientId={patient.id} />
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleNewConsultation(patient)}
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Nova Consulta</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewProfile(patient)}>
                          <User className="w-4 h-4 mr-2" />
                          Ver Prontuário
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewEvolution(patient)}>
                          <Activity className="w-4 h-4 mr-2" />
                          Ver Evolução
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(patient)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Editar Dados
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeletingPatient(patient)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir Paciente
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingPatient} onOpenChange={() => setEditingPatient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Paciente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome Completo</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-age">Idade</Label>
              <Input
                id="edit-age"
                type="number"
                value={editForm.age}
                onChange={(e) => setEditForm((prev) => ({ ...prev, age: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-obs">Observações</Label>
              <Textarea
                id="edit-obs"
                value={editForm.observations}
                onChange={(e) => setEditForm((prev) => ({ ...prev, observations: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPatient(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isLoading || !editForm.name.trim()}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPatient} onOpenChange={() => setDeletingPatient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Paciente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deletingPatient?.name}</strong>? Esta ação
              não pode ser desfeita e todas as análises deste paciente serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
