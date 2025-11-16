import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  onConfirm: (motivoId: string, observacao?: string) => void;
}

export const ModalMotivoPerda = ({ open, onOpenChange, onConfirm }: ModalMotivoPerdaProps) => {
  const [motivoId, setMotivoId] = useState("");
  const [observacao, setObservacao] = useState("");

  const { data: motivos } = useQuery({
    queryKey: ["motivos-perda"],
    queryFn: () => motivosPerdaService.listarMotivosPerda(true),
  });

  const handleConfirm = () => {
    if (!motivoId) return;
    onConfirm(motivoId, observacao.trim() || undefined);
    setMotivoId("");
    setObservacao("");
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
          <Button onClick={handleConfirm} disabled={!motivoId} variant="destructive">
            Confirmar Perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
