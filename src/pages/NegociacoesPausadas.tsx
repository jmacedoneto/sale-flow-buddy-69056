import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { ConversaCard } from "@/components/ConversaCard";
import { CardDetailsModal } from "@/components/CardDetailsModal";
import { CardConversa } from "@/types/database";
import { Pause } from "lucide-react";

export default function NegociacoesPausadas() {
  const [selectedCard, setSelectedCard] = useState<CardConversa | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: cardsPausados, isLoading } = useQuery({
    queryKey: ["cards-pausados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards_conversas")
        .select("*")
        .eq("pausado", true)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as CardConversa[];
    },
  });

  const handleCardClick = (card: CardConversa) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Pause className="w-8 h-8 text-warning" />
            <h1 className="text-3xl font-bold">Negociações Pausadas</h1>
          </div>
          <p className="text-muted-foreground">
            Visualize e gerencie as negociações que estão temporariamente pausadas
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : cardsPausados && cardsPausados.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cardsPausados.map((card) => (
              <ConversaCard
                key={card.id}
                id={card.id}
                titulo={card.titulo || "Sem título"}
                resumo={card.resumo}
                chatwootConversaId={card.chatwoot_conversa_id}
                createdAt={card.created_at || new Date().toISOString()}
                statusInfo={{
                  status: 'sem',
                  variant: 'warning',
                  label: 'Pausado'
                }}
                onClick={() => handleCardClick(card)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Pause className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-xl font-semibold mb-2">Nenhuma negociação pausada</p>
            <p className="text-muted-foreground">
              As negociações pausadas aparecerão aqui
            </p>
          </div>
        )}
      </main>

      {selectedCard && (
        <CardDetailsModal
          card={selectedCard}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      )}
    </div>
  );
}
