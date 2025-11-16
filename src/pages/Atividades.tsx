import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAtividades } from "@/hooks/useAtividades";
import { AtividadeTimeline } from "@/components/AtividadeTimeline";
import { AtividadesList } from "@/components/AtividadesList";
import { Button } from "@/components/ui/button";
import { LayoutList, LayoutGrid } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Atividades() {
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');
  const { atividades, loading, refetch } = useAtividades();

  // Buscar usuários para exibir nomes
  const { data: users = [] } = useQuery({
    queryKey: ['users-crm'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users_crm')
        .select('id, nome, email');
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Header />
      <div className="container mx-auto p-8">
        <Card className="shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Atividades
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('kanban')}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Kanban
              </Button>
              <Button
                variant={viewMode === 'lista' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('lista')}
              >
                <LayoutList className="h-4 w-4 mr-2" />
                Lista
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando atividades...</p>
                </div>
              </div>
            ) : viewMode === 'kanban' ? (
              <AtividadeTimeline atividades={atividades} />
            ) : (
              <AtividadesList 
                atividades={atividades} 
                users={users}
                onRefresh={refetch}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
