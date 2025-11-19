import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Calendar, Clock, MessageSquare, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface AtividadeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  atividade: any;
  onSuccess: () => void;
}

export const AtividadeDetailsModal = ({ 
  isOpen, 
  onClose, 
  atividade,
  onSuccess 
}: AtividadeDetailsModalProps) => {
  const [observacao, setObservacao] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!atividade) return null;

  const dataPrevista = atividade.data_prevista ? new Date(atividade.data_prevista) : null;
  const hoje = new Date();
  const diasDiferenca = dataPrevista ? differenceInDays(dataPrevista, hoje) : 0;
  
  const isVencida = diasDiferenca < 0;
  const isHoje = diasDiferenca === 0;
  const cor = isVencida ? "text-red-600" : isHoje ? "text-yellow-600" : "text-green-600";

  const handleConcluir = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('atividades_cards')
        .update({
          status: 'concluida',
          observacao,
          data_conclusao: new Date().toISOString(),
        })
        .eq('id', atividade.id);

      if (error) throw error;

      toast.success("Atividade concluída");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Erro ao concluir:", error);
      toast.error(error.message || "Erro ao concluir atividade");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelar = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('atividades_cards')
        .update({
          status: 'cancelada',
          observacao,
        })
        .eq('id', atividade.id);

      if (error) throw error;

      toast.success("Atividade cancelada");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Erro ao cancelar:", error);
      toast.error(error.message || "Erro ao cancelar atividade");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Detalhes da Atividade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informações da Oportunidade */}
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Oportunidade</h3>
            <p className="text-sm">{atividade.cards_conversas?.titulo || 'Sem título'}</p>
            <div className="flex gap-2 mt-2">
              <Link to={`/?card=${atividade.card_id}`}>
                <Button size="sm" variant="outline">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Abrir Card
                </Button>
              </Link>
              {atividade.cards_conversas?.chatwoot_conversa_id && (
                <Button size="sm" variant="outline" asChild>
                  <a 
                    href={`https://app.chatwoot.com/app/accounts/1/conversations/${atividade.cards_conversas.chatwoot_conversa_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Chatwoot
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Detalhes da Atividade */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline">{atividade.tipo}</Badge>
              {dataPrevista && (
                <span className={`text-sm font-medium ${cor}`}>
                  {isVencida 
                    ? `Vencida há ${Math.abs(diasDiferenca)} dia(s)`
                    : isHoje 
                      ? "Vence hoje"
                      : `Faltam ${diasDiferenca} dia(s)`
                  }
                </span>
              )}
            </div>
            
            <p className="text-sm mb-2">
              <strong>Descrição:</strong> {atividade.descricao}
            </p>
            
            {dataPrevista && (
              <p className="text-sm text-muted-foreground">
                <Calendar className="h-3 w-3 inline mr-1" />
                {format(dataPrevista, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>

          {/* Campo de Observação/Retorno */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Registrar Retorno/Observação
            </label>
            <Textarea
              placeholder="Digite o resultado da atividade, próximos passos, etc..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Ações */}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleConcluir}
              disabled={isLoading}
              className="flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Concluir
            </Button>
            <Button 
              onClick={handleCancelar}
              disabled={isLoading}
              variant="destructive"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
