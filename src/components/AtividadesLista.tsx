import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ExternalLink, CheckCircle2, Clock, Copy, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { AtividadeDetailsModal } from './AtividadeDetailsModal';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AtividadesListaProps {
  filters: {
    produto: string | null;
    funil: string | null;
    usuario: string | null;
  };
  searchTerm: string;
  mostrarConcluidas: boolean;
  isAdmin?: boolean;
}

export const AtividadesLista = ({ filters, searchTerm, mostrarConcluidas, isAdmin = false }: AtividadesListaProps) => {
  const [selectedAtividade, setSelectedAtividade] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const { data: atividades = [], isLoading, refetch } = useQuery({
    queryKey: ['atividades-lista', filters, mostrarConcluidas, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('atividades_cards')
        .select(`
          *,
          cards_conversas(
            id,
            titulo,
            funil_id,
            telefone_lead,
            chatwoot_conversa_id,
            funis(nome)
          )
        `);

      // Só filtrar por data_prevista no modo comercial (não admin)
      if (!isAdmin) {
        query = query.not('data_prevista', 'is', null);
      }
      
      query = query.order('data_prevista', { ascending: true });

      if (!mostrarConcluidas) {
        query = query.eq('status', 'pendente');
      }

      if (filters.usuario) {
        query = query.eq('user_id', filters.usuario);
      }

      if (filters.funil) {
        query = query.eq('cards_conversas.funil_id', filters.funil);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let filtered = data;
      if (searchTerm) {
        filtered = data.filter(a => 
          a.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.cards_conversas?.titulo?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      return filtered;
    },
  });

  const handleMarcarConcluida = async (atividadeId: string) => {
    try {
      const { error } = await supabase
        .from('atividades_cards')
        .update({ 
          status: 'concluida',
          data_conclusao: new Date().toISOString()
        })
        .eq('id', atividadeId);

      if (error) throw error;
      
      toast.success('Atividade concluída');
      queryClient.invalidateQueries({ queryKey: ['atividades-lista'] });
      queryClient.invalidateQueries({ queryKey: ['atividades-kanban'] });
    } catch (error) {
      console.error('Erro ao marcar atividade:', error);
      toast.error('Erro ao marcar atividade como concluída');
    }
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success("Telefone copiado!");
  };

  const handleOpenCard = (cardId: string) => {
    navigate(`/dashboard?cardId=${cardId}`);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === atividades.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(atividades.map(a => a.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      const idsArray = Array.from(selectedIds);
      const batchSize = 50; // Deletar em lotes de 50 para evitar URL muito longa
      
      for (let i = 0; i < idsArray.length; i += batchSize) {
        const batch = idsArray.slice(i, i + batchSize);
        const { error } = await supabase
          .from('atividades_cards')
          .delete()
          .in('id', batch);

        if (error) throw error;
      }
      
      toast.success(`${selectedIds.size} atividade(s) excluída(s)`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['atividades-lista'] });
      queryClient.invalidateQueries({ queryKey: ['atividades-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['atividades-admin'] });
    } catch (error) {
      console.error('Erro ao excluir atividades:', error);
      toast.error('Erro ao excluir atividades');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return <div className="p-4">Carregando atividades...</div>;
  }

  const allSelected = atividades.length > 0 && selectedIds.size === atividades.length;
  const someSelected = selectedIds.size > 0;

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {/* Barra de ações em massa - só aparece no modo admin */}
        {isAdmin && (
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Selecionar todos"
              />
              <span className="text-sm text-muted-foreground">
                {someSelected ? `${selectedIds.size} selecionado(s)` : 'Selecionar todos'}
              </span>
            </div>
            {someSelected && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Excluir ({selectedIds.size})
              </Button>
            )}
          </div>
        )}

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && <TableHead className="w-10"></TableHead>}
                <TableHead>Lead/Card</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Data Retorno</TableHead>
                <TableHead>Funil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atividades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 9 : 8} className="text-center text-muted-foreground py-8">
                    Nenhuma atividade encontrada
                  </TableCell>
                </TableRow>
              ) : (
                atividades.map((atividade) => (
                  <TableRow key={atividade.id} className="cursor-pointer hover:bg-muted/50">
                    {isAdmin && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(atividade.id)}
                          onCheckedChange={() => handleToggleSelect(atividade.id)}
                          aria-label={`Selecionar ${atividade.descricao}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      {atividade.cards_conversas?.titulo || 'Sem título'}
                    </TableCell>
                    <TableCell>
                      {atividade.cards_conversas?.telefone_lead ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-1 font-mono text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyPhone(atividade.cards_conversas.telefone_lead);
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              {atividade.cards_conversas.telefone_lead}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Clique para copiar</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs bg-secondary px-2 py-1 rounded">
                        {atividade.tipo}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {atividade.descricao}
                    </TableCell>
                    <TableCell>
                      {atividade.data_prevista && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(atividade.data_prevista), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {atividade.cards_conversas?.funis?.nome || '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded ${
                        atividade.status === 'concluida' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {atividade.status === 'concluida' ? 'Concluída' : 'Pendente'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenCard(atividade.card_id)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Abrir Card</TooltipContent>
                        </Tooltip>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedAtividade(atividade)}
                        >
                          Ver Detalhes
                        </Button>
                        {atividade.status !== 'concluida' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarcarConcluida(atividade.id);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Marcar como concluída</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedAtividade && (
        <AtividadeDetailsModal
          isOpen={!!selectedAtividade}
          onClose={() => setSelectedAtividade(null)}
          atividade={selectedAtividade}
          onSuccess={() => {
            refetch();
            setSelectedAtividade(null);
          }}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividades</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} atividade(s)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};
