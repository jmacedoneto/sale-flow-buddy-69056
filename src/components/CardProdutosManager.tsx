import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as cardProdutosService from "@/services/cardProdutosService";
import * as produtosService from "@/services/produtosService";

interface CardProdutosManagerProps {
  cardId: string;
}

export const CardProdutosManager = ({ cardId }: CardProdutosManagerProps) => {
  const queryClient = useQueryClient();
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [valor, setValor] = useState("");

  const { data: produtos } = useQuery({
    queryKey: ["produtos"],
    queryFn: () => produtosService.listarProdutos(true),
  });

  const { data: cardProdutos } = useQuery({
    queryKey: ["card-produtos", cardId],
    queryFn: () => cardProdutosService.listarProdutosCard(cardId),
  });

  const adicionarMutation = useMutation({
    mutationFn: async () => {
      // P6: Verificar duplicata antes de adicionar
      const produtoExistente = cardProdutos?.find(cp => cp.produto_id === produtoSelecionado);
      
      if (produtoExistente) {
        // Produto já existe - incrementar quantidade
        const novaQuantidade = produtoExistente.quantidade + parseInt(quantidade);
        return cardProdutosService.atualizarProdutoCard(produtoExistente.id, {
          quantidade: novaQuantidade
        });
      }

      // Produto novo - adicionar
      const produto = produtos?.find(p => p.id === produtoSelecionado);
      const valorFinal = parseFloat(valor) || produto?.valor_padrao || 0;
      const qtd = parseInt(quantidade) || 1;
      return cardProdutosService.adicionarProdutoCard(cardId, produtoSelecionado, valorFinal, qtd);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["card-produtos", cardId] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      
      const produtoExistente = cardProdutos?.find(cp => cp.produto_id === produtoSelecionado);
      toast.success(produtoExistente ? "Quantidade atualizada" : "Produto adicionado");
      
      setProdutoSelecionado("");
      setQuantidade("1");
      setValor("");
    },
    onError: (error: Error) => {
      // P6: Mensagem específica para constraint de duplicata
      if (error.message?.includes('unique_card_produto')) {
        toast.error("Produto já adicionado - atualize a quantidade existente");
      } else {
        toast.error("Erro ao adicionar produto");
      }
    },
  });

  const atualizarMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      cardProdutosService.atualizarProdutoCard(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-produtos", cardId] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      toast.success("Produto atualizado");
    },
    onError: () => toast.error("Erro ao atualizar produto"),
  });

  const removerMutation = useMutation({
    mutationFn: cardProdutosService.removerProdutoCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-produtos", cardId] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      toast.success("Produto removido");
    },
    onError: () => toast.error("Erro ao remover produto"),
  });

  const handleProdutoChange = (produtoId: string) => {
    setProdutoSelecionado(produtoId);
    const produto = produtos?.find(p => p.id === produtoId);
    if (produto) {
      setValor(produto.valor_padrao.toString());
    }
  };

  const valorTotal = cardProdutos?.reduce((sum, cp) => sum + (cp.valor * cp.quantidade), 0) || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <Label>Produto</Label>
          <Select value={produtoSelecionado} onValueChange={handleProdutoChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {produtos?.map((produto) => (
                <SelectItem key={produto.id} value={produto.id}>
                  {produto.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Quantidade</Label>
          <Input
            type="number"
            min="1"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </div>
        <div>
          <Label>Valor (R$)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
            <Button
              onClick={() => adicionarMutation.mutate()}
              disabled={!produtoSelecionado || adicionarMutation.isPending}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {cardProdutos && cardProdutos.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Valor Unit.</TableHead>
              <TableHead>Subtotal</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cardProdutos.map((cp) => (
              <TableRow key={cp.id}>
                <TableCell className="font-medium">{cp.produtos?.nome}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="1"
                    value={cp.quantidade}
                    onChange={(e) =>
                      atualizarMutation.mutate({
                        id: cp.id,
                        updates: { quantidade: parseInt(e.target.value) || 1 },
                      })
                    }
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={cp.valor}
                    onChange={(e) =>
                      atualizarMutation.mutate({
                        id: cp.id,
                        updates: { valor: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="w-28"
                  />
                </TableCell>
                <TableCell>
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(cp.valor * cp.quantidade)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removerMutation.mutate(cp.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} className="text-right font-bold">
                Total:
              </TableCell>
              <TableCell className="font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(valorTotal)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </div>
  );
};
