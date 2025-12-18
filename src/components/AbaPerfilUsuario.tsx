import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarUpload } from "./AvatarUpload";
import { Save, User, Link2, Search, Loader2, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatwootAgent {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
  role?: string;
  availability_status?: string;
}

export const AbaPerfilUsuario = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [chatwootAgentId, setChatwootAgentId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estado para modal de agentes
  const [agentsModalOpen, setAgentsModalOpen] = useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [agents, setAgents] = useState<ChatwootAgent[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      const { data, error } = await supabase
        .from('users_crm')
        .select('nome, email, avatar_url, chatwoot_agent_id')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setNome(data.nome || "");
        setEmail(data.email || "");
        setAvatarUrl(data.avatar_url);
        setChatwootAgentId(data.chatwoot_agent_id?.toString() || "");
      }
      
      if (error) {
        console.error("Erro ao buscar dados do usuário:", error);
      }
      
      setIsLoading(false);
    };

    fetchUserData();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    
    try {
      const updateData: { nome: string; chatwoot_agent_id: number | null } = {
        nome: nome.trim(),
        chatwoot_agent_id: chatwootAgentId ? parseInt(chatwootAgentId, 10) : null
      };

      const { error } = await supabase
        .from('users_crm')
        .update(updateData)
        .eq('id', user.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['users_crm'] });
      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao salvar perfil:", error);
      toast.error(error.message || "Erro ao salvar perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = () => {
    // Recarregar dados após upload
    if (user?.id) {
      supabase
        .from('users_crm')
        .select('avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setAvatarUrl(data.avatar_url);
        });
    }
  };

  const handleFetchAgents = async () => {
    setIsLoadingAgents(true);
    setAgentsModalOpen(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-chatwoot-agents');
      
      if (error) throw error;
      
      if (data.success) {
        setAgents(data.agents || []);
        if (data.agents.length === 0) {
          toast.info("Nenhum agente encontrado no Chatwoot");
        }
      } else {
        toast.error(data.error || "Erro ao buscar agentes");
        setAgentsModalOpen(false);
      }
    } catch (error: any) {
      console.error("Erro ao buscar agentes:", error);
      toast.error("Erro ao buscar agentes do Chatwoot");
      setAgentsModalOpen(false);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const handleSelectAgent = (agent: ChatwootAgent) => {
    setChatwootAgentId(agent.id.toString());
    setAgentsModalOpen(false);
    toast.success(`Agente "${agent.name}" selecionado`);
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6" />
          Meu Perfil
        </h2>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e foto de perfil
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card de Avatar */}
        <Card>
          <CardHeader>
            <CardTitle>Foto de Perfil</CardTitle>
            <CardDescription>
              Sua foto será exibida no header e nos cards de atividades
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <AvatarUpload
              currentAvatarUrl={avatarUrl}
              userName={nome || email}
              userId={user?.id || ''}
              size="lg"
              onUploadComplete={handleAvatarUpload}
            />
            <p className="text-xs text-muted-foreground text-center">
              Clique na câmera para alterar sua foto
            </p>
          </CardContent>
        </Card>

        {/* Card de Informações */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>
              Atualize seu nome de exibição e vincule ao Chatwoot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O e-mail não pode ser alterado
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chatwoot_agent_id" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                ID Agente Chatwoot
              </Label>
              <div className="flex gap-2">
                <Input
                  id="chatwoot_agent_id"
                  type="number"
                  value={chatwootAgentId}
                  onChange={(e) => setChatwootAgentId(e.target.value)}
                  placeholder="Ex: 123"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFetchAgents}
                  disabled={isLoadingAgents}
                  className="gap-2"
                >
                  {isLoadingAgents ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Buscar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Vincule seu usuário ao agente do Chatwoot para sincronização automática de cards
              </p>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Agentes do Chatwoot */}
      <Dialog open={agentsModalOpen} onOpenChange={setAgentsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agentes do Chatwoot
            </DialogTitle>
            <DialogDescription>
              Selecione seu usuário correspondente no Chatwoot
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingAgents ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mb-2 opacity-50" />
              <p>Nenhum agente encontrado</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleSelectAgent(agent)}
                  >
                    <Avatar className="h-10 w-10">
                      {agent.avatar_url && (
                        <AvatarImage src={agent.avatar_url} alt={agent.name} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(agent.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{agent.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono text-muted-foreground">ID: {agent.id}</p>
                      {agent.role && (
                        <p className="text-[10px] text-muted-foreground capitalize">{agent.role}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
