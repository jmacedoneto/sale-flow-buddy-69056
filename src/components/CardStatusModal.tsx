import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCardStatus, CardStatus } from '@/hooks/useCardStatus';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Trophy, X } from 'lucide-react';

interface CardStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  funilId?: string;
  status: CardStatus;
}

export const CardStatusModal = ({ isOpen, onClose, cardId, funilId, status }: CardStatusModalProps) => {
  const [motivoId, setMotivoId] = useState('');
  const [observacao, setObservacao] = useState('');
  const { mutate: updateStatus, isPending: isLoading } = useCardStatus();

  // Buscar motivos de perda
  const { data: motivos } = useQuery({
    queryKey: ['motivos-perda'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('motivos_perda')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data;
    },
    enabled: status === 'perdido' && isOpen,
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMotivoId('');
      setObservacao('');
    }
  }, [isOpen]);

  const handleConfirmGanho = () => {
    updateStatus(
      { cardId, status: 'ganho', motivo: 'Venda confirmada', funilId },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const handleConfirmPerdido = () => {
    if (!motivoId) return;

    const motivoNome = motivos?.find(m => m.id === motivoId)?.nome || '';
    const motivoFinal = observacao.trim() 
      ? `${motivoNome}: ${observacao.trim()}`
      : motivoNome;

    updateStatus(
      { cardId, status: 'perdido', motivo: motivoFinal, funilId },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  // GANHO: AlertDialog simples de confirmação
  if (status === 'ganho') {
    return (
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-success" />
              Confirmar como Ganho?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja marcar este card como GANHO? Esta ação irá arquivar o card.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmGanho}
              disabled={isLoading}
              className="bg-success hover:bg-success/90"
            >
              {isLoading ? 'Salvando...' : '🎉 Confirmar Ganho'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // PERDIDO: Dialog com select de motivos
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="h-5 w-5 text-destructive" />
            Marcar como Perdido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="motivo">Motivo da Perda *</Label>
            <Select value={motivoId} onValueChange={setMotivoId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent>
                {motivos?.map((motivo) => (
                  <SelectItem key={motivo.id} value={motivo.id}>
                    {motivo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="observacao">Observações (opcional)</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Detalhes adicionais sobre a perda..."
              rows={3}
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            variant="destructive"
            onClick={handleConfirmPerdido} 
            disabled={isLoading || !motivoId}
          >
            {isLoading ? 'Salvando...' : 'Confirmar Perda'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
