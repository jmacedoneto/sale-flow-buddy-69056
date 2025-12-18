import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarUpload } from "./AvatarUpload";
import { Save, User, Link2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const AbaPerfilUsuario = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [chatwootAgentId, setChatwootAgentId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
              <Input
                id="chatwoot_agent_id"
                type="number"
                value={chatwootAgentId}
                onChange={(e) => setChatwootAgentId(e.target.value)}
                placeholder="Ex: 123"
              />
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
    </div>
  );
};
