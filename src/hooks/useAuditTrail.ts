import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditEntry {
  id: string;
  card_id: string;
  user_id: string | null;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  created_at: string;
  user?: {
    nome: string | null;
    email: string;
  };
}

const FIELD_LABELS: Record<string, string> = {
  funil_id: "Funil",
  etapa_id: "Etapa",
  valor_total: "Valor Total",
  status: "Status",
  assigned_to: "Responsável",
  prioridade: "Prioridade",
  pausado: "Pausado",
};

export const useAuditTrail = (cardId: string) => {
  return useQuery({
    queryKey: ["audit-trail", cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_trail")
        .select(`
          *,
          user:user_id (
            nome,
            email
          )
        `)
        .eq("card_id", cardId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data as any[]).map((entry) => ({
        ...entry,
        campo_label: FIELD_LABELS[entry.campo_alterado] || entry.campo_alterado,
      }));
    },
  });
};
