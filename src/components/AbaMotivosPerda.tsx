import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as motivosPerdaService from "@/services/motivosPerdaService";

export const AbaMotivosPerda = () => {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<string | null>(null);
  const [nome, setNome] = useState("");

  const { data: motivos, isLoading } = useQuery({
    queryKey: ["motivos-perda"],
    queryFn: () => motivosPerdaService.listarMotivosPerda(false),
  });

  const criarMutation = useMutation({
    mutationFn: motivosPerdaService.criarMotivoPerda,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["motivos-perda"] });
      toast.success("Motivo de perda criado");
      limparFormulario();
    },
    onError: () => toast.error("Erro ao criar motivo"),
  });

  const atualizarMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<motivosPerdaService.MotivoPerda> }) =>
      motivosPerdaService.atualizarMotivoPerda(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["motivos-perda"] });
      toast.success("Motivo atualizado");
      limparFormulario();
    },
    onError: () => toast.error("Erro ao atualizar motivo"),
  });

  const deletarMutation = useMutation({
    mutationFn: motivosPerdaService.deletarMotivoPerda,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["motivos-perda"] });
      toast.success("Motivo removido");
    },
    onError: () => toast.error("Erro ao remover motivo"),
  });

  const limparFormulario = () => {
    setEditando(null);
    setNome("");
  };

  const handleSalvar = () => {
    if (!nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (editando) {
      atualizarMutation.mutate({
        id: editando,
        updates: { nome: nome.trim() },
      });
    } else {
      criarMutation.mutate({ nome: nome.trim(), ativo: true });
    }
  };

  const handleEditar = (motivo: motivosPerdaService.MotivoPerda) => {
    setEditando(motivo.id);
    setNome(motivo.nome);
  };

  const handleToggleAtivo = (motivo: motivosPerdaService.MotivoPerda) => {
    atualizarMutation.mutate({
      id: motivo.id,
      updates: { ativo: !motivo.ativo },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Motivos de Perda</CardTitle>
        <CardDescription>
          Configure os motivos de perda de vendas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4">
          <Input
            placeholder="Nome do motivo de perda"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSalvar} disabled={criarMutation.isPending || atualizarMutation.isPending}>
            {editando ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {editando ? "Atualizar" : "Adicionar"}
          </Button>
          {editando && (
            <Button variant="outline" onClick={limparFormulario}>
              Cancelar
            </Button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : motivos && motivos.length > 0 ? (
              motivos.map((motivo) => (
                <TableRow key={motivo.id}>
                  <TableCell className="font-medium">{motivo.nome}</TableCell>
                  <TableCell>
                    <Badge
                      variant={motivo.ativo ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleAtivo(motivo)}
                    >
                      {motivo.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditar(motivo)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletarMutation.mutate(motivo.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Nenhum motivo cadastrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
