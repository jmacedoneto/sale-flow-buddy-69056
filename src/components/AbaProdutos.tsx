import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as produtosService from "@/services/produtosService";

export const AbaProdutos = () => {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [valorPadrao, setValorPadrao] = useState("");

  const { data: produtos, isLoading } = useQuery({
    queryKey: ["produtos"],
    queryFn: () => produtosService.listarProdutos(false),
  });

  const criarMutation = useMutation({
    mutationFn: produtosService.criarProduto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto criado com sucesso");
      limparFormulario();
    },
    onError: () => toast.error("Erro ao criar produto"),
  });

  const atualizarMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<produtosService.Produto> }) =>
      produtosService.atualizarProduto(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto atualizado");
      limparFormulario();
    },
    onError: () => toast.error("Erro ao atualizar produto"),
  });

  const deletarMutation = useMutation({
    mutationFn: produtosService.deletarProduto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto removido");
    },
    onError: () => toast.error("Erro ao remover produto"),
  });

  const limparFormulario = () => {
    setEditando(null);
    setNome("");
    setValorPadrao("");
  };

  const handleSalvar = () => {
    if (!nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    const valor = parseFloat(valorPadrao) || 0;

    if (editando) {
      atualizarMutation.mutate({
        id: editando,
        updates: { nome: nome.trim(), valor_padrao: valor },
      });
    } else {
      criarMutation.mutate({ nome: nome.trim(), valor_padrao: valor, ativo: true });
    }
  };

  const handleEditar = (produto: produtosService.Produto) => {
    setEditando(produto.id);
    setNome(produto.nome);
    setValorPadrao(produto.valor_padrao.toString());
  };

  const handleToggleAtivo = (produto: produtosService.Produto) => {
    atualizarMutation.mutate({
      id: produto.id,
      updates: { ativo: !produto.ativo },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Produtos</CardTitle>
        <CardDescription>
          Configure os produtos disponíveis para associar aos cards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4">
          <Input
            placeholder="Nome do produto"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="Valor padrão (R$)"
            value={valorPadrao}
            onChange={(e) => setValorPadrao(e.target.value)}
            className="w-40"
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
              <TableHead>Valor Padrão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : produtos && produtos.length > 0 ? (
              produtos.map((produto) => (
                <TableRow key={produto.id}>
                  <TableCell className="font-medium">{produto.nome}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(produto.valor_padrao)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={produto.ativo ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleAtivo(produto)}
                    >
                      {produto.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditar(produto)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletarMutation.mutate(produto.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhum produto cadastrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
