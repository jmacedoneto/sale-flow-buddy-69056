import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { AtividadeRetornoModal } from "./AtividadeRetornoModal";

interface Atividade {
  id: string;
  descricao: string;
  tipo: string;
  data_criacao: string;
  data_prevista?: string;
  status: string;
  user_id?: string;
  observacao?: string;
  card_id: string;
}

interface User {
  id: string;
  nome?: string;
  email: string;
}

interface AtividadesListProps {
  atividades: Atividade[];
  users: User[];
  onRefresh: () => void;
}

export const AtividadesList = ({ atividades, users, onRefresh }: AtividadesListProps) => {
  const [selectedAtividade, setSelectedAtividade] = useState<Atividade | null>(null);

  const getUserName = (userId?: string) => {
    if (!userId) return "Não atribuído";
    const user = users.find(u => u.id === userId);
    return user?.nome || user?.email || "Desconhecido";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluida':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Concluída</Badge>;
      case 'postergada':
        return <Badge variant="secondary"><CalendarIcon className="h-3 w-3 mr-1" />Postergada</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data Criação</TableHead>
              <TableHead>Data Prevista</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {atividades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhuma atividade encontrada
                </TableCell>
              </TableRow>
            ) : (
              atividades.map((atividade) => (
                <TableRow key={atividade.id}>
                  <TableCell className="font-medium">{atividade.descricao}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{atividade.tipo}</Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(atividade.data_criacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {atividade.data_prevista 
                      ? format(new Date(atividade.data_prevista), "dd/MM/yyyy", { locale: ptBR })
                      : "-"}
                  </TableCell>
                  <TableCell>{getUserName(atividade.user_id)}</TableCell>
                  <TableCell>{getStatusBadge(atividade.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedAtividade(atividade)}
                      disabled={atividade.status === 'concluida'}
                    >
                      {atividade.status === 'concluida' ? 'Concluída' : 'Registrar Retorno'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedAtividade && (
        <AtividadeRetornoModal
          isOpen={!!selectedAtividade}
          onClose={() => setSelectedAtividade(null)}
          atividade={selectedAtividade}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
};
