import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CardWithStatus } from "@/hooks/useFunis";

interface ListaCardsProps {
  cards: CardWithStatus[];
  onRowClick: (card: CardWithStatus) => void;
}

export const ListaCards = ({ cards, onRowClick }: ListaCardsProps) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'vencida': return 'destructive';
      case 'futura': return 'default';
      case 'sem': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold">Título</TableHead>
            <TableHead className="font-semibold">Contato</TableHead>
            <TableHead className="font-semibold">Funil</TableHead>
            <TableHead className="font-semibold">Etapa</TableHead>
            <TableHead className="font-semibold">Status Tarefa</TableHead>
            <TableHead className="font-semibold">Data Retorno</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                Nenhum card encontrado
              </TableCell>
            </TableRow>
          ) : (
            cards.map((card) => (
              <TableRow
                key={card.id}
                onClick={() => onRowClick(card)}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <TableCell className="font-medium">
                  <div className="flex flex-col gap-1">
                    <span className="text-foreground">{card.titulo || 'Sem título'}</span>
                    {card.chatwoot_conversa_id && (
                      <span className="text-xs text-muted-foreground">
                        #{card.chatwoot_conversa_id}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {card.resumo?.slice(0, 30) || 'N/A'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {card.funil_nome || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {card.funil_etapa || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(card.statusInfo.status)} className="text-xs">
                    {card.statusInfo.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {card.data_retorno ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>
                        {format(new Date(card.data_retorno), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem data</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
