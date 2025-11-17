import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAtividades } from "@/hooks/useAtividades";
import { AtividadeTimeline } from "@/components/AtividadeTimeline";
import { AtividadesList } from "@/components/AtividadesList";
import { Button } from "@/components/ui/button";
import { LayoutList, LayoutGrid, Home, BarChart3, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { isToday, isTomorrow, isThisWeek, isPast } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type FilterType = 'all' | 'hoje' | 'amanha' | 'semana' | 'vencidas';

export default function Atividades() {
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showConcluidas, setShowConcluidas] = useState(false);
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

  // Filtrar atividades
  const atividadesFiltradas = atividades.filter(atividade => {
    // Filtro de concluídas
    if (!showConcluidas && atividade.status === 'concluida') {
      return false;
    }

    // Filtro por data
    if (filterType === 'all') return true;
    
    if (!atividade.data_prevista) return false;
    
    const dataPrevista = new Date(atividade.data_prevista);
    
    switch (filterType) {
      case 'hoje':
        return isToday(dataPrevista);
      case 'amanha':
        return isTomorrow(dataPrevista);
      case 'semana':
        return isThisWeek(dataPrevista);
      case 'vencidas':
        return isPast(dataPrevista) && !isToday(dataPrevista) && atividade.status === 'pendente';
      default:
        return true;
    }
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
              <Link to="/">
                <Button variant="outline" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link to="/dashboard-comercial">
                <Button variant="outline" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Comercial
                </Button>
              </Link>
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
            {/* Filtros */}
            <div className="mb-6 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('all')}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Todas
                </Button>
                <Button
                  variant={filterType === 'hoje' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('hoje')}
                >
                  Hoje
                </Button>
                <Button
                  variant={filterType === 'amanha' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('amanha')}
                >
                  Amanhã
                </Button>
                <Button
                  variant={filterType === 'semana' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('semana')}
                >
                  Esta Semana
                </Button>
                <Button
                  variant={filterType === 'vencidas' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('vencidas')}
                >
                  Vencidas
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="concluidas" 
                  checked={showConcluidas}
                  onCheckedChange={(checked) => setShowConcluidas(checked as boolean)}
                />
                <Label htmlFor="concluidas" className="text-sm cursor-pointer">
                  Mostrar atividades concluídas
                </Label>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando atividades...</p>
                </div>
              </div>
            ) : viewMode === 'kanban' ? (
              <AtividadeTimeline atividades={atividadesFiltradas} />
            ) : (
              <AtividadesList 
                atividades={atividadesFiltradas} 
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
