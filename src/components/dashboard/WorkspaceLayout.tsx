import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  Plus, Search, Filter, Calendar, 
  Phone, Mail, Video, ArrowRight,
  TrendingUp, TrendingDown
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CardWithStatus } from "@/hooks/useFunis";
import { cn } from "@/lib/utils";

interface WorkspaceLayoutProps {
  cards: CardWithStatus[];
  onCardClick: (card: CardWithStatus) => void;
  onNewCard: () => void;
  stats: {
    totalDeals: number;
    won: number;
    lost: number;
  };
  isLoading?: boolean;
}

const getInitials = (name: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const filterTags = [
  { id: "all", label: "Todos", active: true },
  { id: "hot", label: "Hot Client", icon: "🔥" },
  { id: "great", label: "Alta Prioridade" },
  { id: "medium", label: "Média Prioridade" },
  { id: "low", label: "Baixa Prioridade" },
];

const taskFilterTags = [
  { id: "all", label: "Todos", active: true },
  { id: "hot", label: "Hot", icon: "🔥" },
  { id: "today", label: "Hoje" },
  { id: "overdue", label: "Atrasadas" },
  { id: "completed", label: "Concluídas" },
];

export const WorkspaceLayout = ({ 
  cards, 
  onCardClick, 
  onNewCard,
  stats,
  isLoading 
}: WorkspaceLayoutProps) => {
  const [activeLeadFilter, setActiveLeadFilter] = useState("all");
  const [activeTaskFilter, setActiveTaskFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const today = new Date();
  
  const leads = useMemo(() => {
    return cards.filter(c => !c.data_retorno).slice(0, 8);
  }, [cards]);

  const tasks = useMemo(() => {
    return cards
      .filter(c => c.data_retorno)
      .sort((a, b) => {
        const dateA = new Date(a.data_retorno!).getTime();
        const dateB = new Date(b.data_retorno!).getTime();
        return dateA - dateB;
      })
      .slice(0, 6);
  }, [cards]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">WORKSPACE</h1>
          <Button onClick={onNewCard} className="gap-2" variant="gradient">
            <Plus className="h-4 w-4" />
            Novo Card
          </Button>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold">{stats.totalDeals}</span>
            <span className="text-muted-foreground">Deals</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-success">{stats.won}</span>
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-success" />
              won
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-destructive">{stats.lost}</span>
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-4 w-4 text-destructive" />
              lost
            </span>
          </div>
        </div>
      </div>

      {/* New Leads Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Novos Leads</h2>
            <Badge variant="muted" className="rounded-full">
              {leads.length} Leads
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar..." 
                className="pl-9 w-40 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter Tags */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {filterTags.map((tag) => (
            <Button
              key={tag.id}
              variant={activeLeadFilter === tag.id ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setActiveLeadFilter(tag.id)}
            >
              {tag.icon && <span className="mr-1">{tag.icon}</span>}
              {tag.label}
            </Button>
          ))}
        </div>

        {/* Leads Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {leads.map((lead, index) => {
            const avatarUrl = (lead as any).avatar_lead_url;
            return (
              <Card 
                key={lead.id}
                className={cn(
                  "p-4 cursor-pointer card-hover group",
                  index === 0 && "ring-2 ring-accent"
                )}
                onClick={() => onCardClick(lead)}
              >
                <div className="flex items-start justify-between mb-3">
                  <Avatar className="h-12 w-12">
                    {avatarUrl && <AvatarImage src={avatarUrl} />}
                    <AvatarFallback className="text-sm">
                      {getInitials(lead.titulo)}
                    </AvatarFallback>
                  </Avatar>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                  {lead.titulo}
                </h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                  {lead.funil_etapa || "Novo Lead"}
                </p>
                
                <div className="flex items-center gap-1 flex-wrap">
                  {lead.prioridade && (
                    <Badge 
                      variant={lead.prioridade === 'alta' ? 'destructive' : 'muted'} 
                      className="text-xs"
                    >
                      {lead.prioridade === 'alta' ? '🔥' : ''} {lead.prioridade}
                    </Badge>
                  )}
                  {lead.telefone_lead && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Phone className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Your Day's Tasks Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Tarefas do Dia</h2>
            <Badge variant="muted" className="rounded-full">
              {tasks.length} Tasks
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Task Filter Tags */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {taskFilterTags.map((tag) => (
            <Button
              key={tag.id}
              variant={activeTaskFilter === tag.id ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setActiveTaskFilter(tag.id)}
            >
              {tag.icon && <span className="mr-1">{tag.icon}</span>}
              {tag.label}
            </Button>
          ))}
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task, index) => {
            const isFirst = index === 0;
            const taskDate = task.data_retorno ? new Date(task.data_retorno) : null;
            const isOverdue = taskDate && taskDate < today;
            const isToday = taskDate && format(taskDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
            const avatarUrl = (task as any).avatar_lead_url;

            return (
              <Card 
                key={task.id}
                className={cn(
                  "p-4 cursor-pointer card-hover",
                  isFirst && "bg-accent/20 border-accent",
                  isOverdue && !isFirst && "border-destructive/50"
                )}
                onClick={() => onCardClick(task)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      {avatarUrl && <AvatarImage src={avatarUrl} />}
                      <AvatarFallback className="text-xs">
                        {getInitials(task.titulo)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {task.funil_nome || "Lead"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>

                <h3 className="font-semibold mb-2 line-clamp-1">{task.titulo}</h3>

                {taskDate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Calendar className="h-4 w-4" />
                    <span>{format(taskDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                    {isToday && <Badge variant="accent" className="text-xs">Hoje</Badge>}
                    {isOverdue && !isToday && <Badge variant="destructive" className="text-xs">Atrasada</Badge>}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Badge variant={isFirst ? "accent" : "outline"} className="text-xs">
                    {task.status || "Agendado"}
                  </Badge>
                  
                  <div className="flex items-center gap-1">
                    {task.telefone_lead && (
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Phone className="h-3 w-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Mail className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Video className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
};