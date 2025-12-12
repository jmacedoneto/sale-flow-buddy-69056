import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Phone, Calendar, User, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CardWithStatus } from "@/hooks/useFunis";

interface ListaCardsProps {
  cards: CardWithStatus[];
  onRowClick: (card: CardWithStatus) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
}

export const ListaCards = ({ 
  cards, 
  onRowClick,
  selectedIds = new Set(),
  onToggleSelect,
  onSelectAll,
}: ListaCardsProps) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'vencida': return 'destructive';
      case 'futura': return 'default';
      case 'sem': return 'secondary';
      default: return 'outline';
    }
  };

  const allSelected = cards.length > 0 && cards.every(c => selectedIds.has(c.id));
  const someSelected = cards.some(c => selectedIds.has(c.id)) && !allSelected;

  const handleSelectAllChange = (checked: boolean) => {
    if (onSelectAll) {
      onSelectAll(checked ? cards.map(c => c.id) : []);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onToggleSelect?.(id);
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {onToggleSelect && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAllChange}
                  aria-label="Selecionar todos"
                  className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                />
              </TableHead>
            )}
            <TableHead className="font-semibold">Nome</TableHead>
            <TableHead className="font-semibold">Etapa</TableHead>
            <TableHead className="font-semibold">Valor</TableHead>
            <TableHead className="font-semibold">Responsável</TableHead>
            <TableHead className="font-semibold">Data Retorno</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.length === 0 ? (
            <TableRow>
              <TableCell colSpan={onToggleSelect ? 7 : 6} className="text-center py-8 text-muted-foreground">
                Nenhum card encontrado
              </TableCell>
            </TableRow>
          ) : (
            cards.map((card) => (
              <TableRow
                key={card.id}
                onClick={() => onRowClick(card)}
                className={`cursor-pointer hover:bg-muted/50 transition-colors ${selectedIds.has(card.id) ? 'bg-primary/10' : ''}`}
              >
                {onToggleSelect && (
                  <TableCell>
                    <div onClick={(e) => handleCheckboxClick(e, card.id)}>
                      <Checkbox
                        checked={selectedIds.has(card.id)}
                        aria-label={`Selecionar ${card.titulo}`}
                      />
                    </div>
                  </TableCell>
                )}
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
                  <Badge variant="secondary" className="text-xs">
                    {card.funil_etapa || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span>
                      {card.valor_total 
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.valor_total)
                        : 'R$ 0,00'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {card.resumo?.slice(0, 20) || 'Não atribuído'}
                    </span>
                  </div>
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
                <TableCell>
                  <Badge variant={getStatusVariant(card.statusInfo.status)} className="text-xs">
                    {card.statusInfo.label}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
