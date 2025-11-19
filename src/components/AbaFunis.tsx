import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Settings, Loader2 } from "lucide-react";
import { useFunis, useCreateFunil } from "@/hooks/useFunis";
import { useDeleteFunil } from "@/hooks/useDeleteFunil";
import { EtapasModal } from "./EtapasModal";
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
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

export const AbaFunis = () => {
  const [novoFunilNome, setNovoFunilNome] = useState("");
  const [funilParaExcluir, setFunilParaExcluir] = useState<string | null>(null);
  const [funilParaGerenciar, setFunilParaGerenciar] = useState<{
    id: string;
    nome: string;
    etapas: any[];
  } | null>(null);

  const { data: funis, isLoading } = useFunis();
  const createFunil = useCreateFunil();
  const deleteFunil = useDeleteFunil();
  const { isAdmin } = usePermissions();

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso Negado</CardTitle>
          <CardDescription>
            Apenas administradores podem gerenciar funis.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleCriarFunil = async () => {
    if (!novoFunilNome.trim()) {
      toast.error("Nome do funil é obrigatório");
      return;
    }

    createFunil.mutate(
      { nome: novoFunilNome },
      {
        onSuccess: () => {
          setNovoFunilNome("");
        },
      }
    );
  };

  const handleExcluirFunil = async () => {
    if (!funilParaExcluir) return;

    deleteFunil.mutate(funilParaExcluir, {
      onSuccess: () => {
        setFunilParaExcluir(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Funis de Vendas</CardTitle>
          <CardDescription>
            Crie, edite e exclua funis de vendas. Cada funil possui etapas que representam o processo de vendas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Criar Novo Funil */}
          <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/50">
            <h3 className="font-semibold text-foreground">Criar Novo Funil</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="nome-funil">Nome do Funil</Label>
                <Input
                  id="nome-funil"
                  placeholder="Ex: Vendas B2B"
                  value={novoFunilNome}
                  onChange={(e) => setNovoFunilNome(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCriarFunil();
                  }}
                />
              </div>
              <Button
                onClick={handleCriarFunil}
                disabled={createFunil.isPending || !novoFunilNome.trim()}
                className="mt-6"
              >
                {createFunil.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Funil
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Lista de Funis */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Funis Existentes</h3>
            {!funis || funis.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhum funil cadastrado ainda. Crie o primeiro funil acima.
              </p>
            ) : (
              <div className="grid gap-3">
                {funis.map((funil: any) => (
                  <div
                    key={funil.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{funil.nome}</h4>
                      <p className="text-sm text-muted-foreground">
                        Criado em {new Date(funil.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFunilParaGerenciar({
                            id: funil.id,
                            nome: funil.nome,
                            etapas: [],
                          })
                        }
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Gerenciar Etapas
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setFunilParaExcluir(funil.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog
        open={!!funilParaExcluir}
        onOpenChange={(open) => !open && setFunilParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Funil</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este funil? Esta ação não pode ser desfeita.
              <br />
              <br />
              <strong className="text-destructive">
                Não é possível excluir funis que contenham cards ativos.
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluirFunil}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFunil.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir Funil"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Gerenciar Etapas */}
      {funilParaGerenciar && (
        <EtapasModal
          open={!!funilParaGerenciar}
          onOpenChange={(open) => !open && setFunilParaGerenciar(null)}
          funilId={funilParaGerenciar.id}
          etapas={funilParaGerenciar.etapas}
        />
      )}
    </>
  );
};
