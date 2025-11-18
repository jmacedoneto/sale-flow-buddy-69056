import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCardStatus, CardStatus } from '@/hooks/useCardStatus';

interface CardStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  funilId?: string;
  status: CardStatus;
}

export const CardStatusModal = ({ isOpen, onClose, cardId, funilId, status }: CardStatusModalProps) => {
  const [motivo, setMotivo] = useState('');
  const { mutate: updateStatus, isPending: isLoading } = useCardStatus();

  const handleSubmit = () => {
    if (!motivo.trim()) {
      return;
    }

    updateStatus(
      { cardId, status, motivo, funilId },
      {
        onSuccess: () => {
          setMotivo('');
          onClose();
        },
      }
    );
  };

  const title = status === 'ganho' ? 'Marcar como Ganho' : 'Marcar como Perdido';
  const placeholder = status === 'ganho' 
    ? 'Descreva os detalhes da venda (valor, produto, etc.)'
    : 'Descreva o motivo da perda';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="motivo">Motivo / Detalhes</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={placeholder}
              rows={4}
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !motivo.trim()}>
            {isLoading ? 'Salvando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
