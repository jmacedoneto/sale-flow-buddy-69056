import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCardStatus } from "@/hooks/useCardStatus";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import * as motivosPerdaService from "@/services/motivosPerdaService";

interface ModalMotivoPerdaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  funilId?: string;
  onConfirm?: () => void;
}

export const ModalMotivoPerda = ({ open, onOpenChange, cardId, funilId, onConfirm }: ModalMotivoPerdaProps) => {
  const [motivoId, setMotivoId] = useState("");
  const [observacao, setObservacao] = useState("");
  const updateStatus = useCardStatus();

  const { data: motivos } = useQuery({
    queryKey: ["motivos-perda"],
    queryFn: () => motivosPerdaService.listarMotivosPerda(true),
  });

  // GRUPO A.3: Usar useCardStatus unificado
  const handleConfirm = async () => {
    if (!motivoId) return;
    
    await updateStatus.mutateAsync({
      cardId,
      status: 'perdido',
      motivo: motivoId,
      funilId,
    });
    
    setMotivoId("");
    setObservacao("");
    onOpenChange(false);
    onConfirm?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como Perdido</DialogTitle>
          <DialogDescription>
            Selecione o motivo da perda desta venda
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da Perda *</Label>
            <Select value={motivoId} onValueChange={setMotivoId}>
              <SelectTrigger id="motivo">
                <SelectValue placeholder="Selecione um motivo" />
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

          <div className="space-y-2">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Textarea
              id="observacao"
              placeholder="Adicione detalhes sobre a perda..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!motivoId || updateStatus.isPending} 
            variant="destructive"
          >
            {updateStatus.isPending ? "Processando..." : "Confirmar Perda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
