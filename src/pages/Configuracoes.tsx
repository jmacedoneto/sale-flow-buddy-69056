import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AbaConfigChatwoot } from "@/components/AbaConfigChatwoot";
import { AbaWebhooks } from "@/components/AbaWebhooks";
import { AbaWebhooksExternos } from "@/components/AbaWebhooksExternos";
import { AbaMappings } from "@/components/AbaMappings";
import { AbaUsuarios } from "@/components/AbaUsuarios";
import { AbaMonitoramento } from "@/components/AbaMonitoramento";
import { AbaConfigIA } from "@/components/AbaConfigIA";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Configuracoes = () => {
  const MASTER_EMAIL = 'jmacedoneto1989@gmail.com';
  
  // Verificar se usuário é master
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('users_crm')
        .select('role, email')
        .eq('id', user.id)
        .single();
      
      return { ...user, role: data?.role, email: data?.email };
    }
  });

  const isMaster = currentUser?.role === 'master' || currentUser?.email === MASTER_EMAIL;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">⚙️ Configurações</h1>
        
        <Tabs defaultValue="chatwoot" className="w-full">
          <TabsList className={`grid w-full ${isMaster ? 'grid-cols-7' : 'grid-cols-6'}`}>
            <TabsTrigger value="chatwoot">Chatwoot</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks Internos</TabsTrigger>
            <TabsTrigger value="externos">Webhooks Externos</TabsTrigger>
            <TabsTrigger value="mappings">Mappings</TabsTrigger>
            <TabsTrigger value="monitoramento">Monitoramento</TabsTrigger>
            <TabsTrigger value="ia">IA</TabsTrigger>
            {isMaster && <TabsTrigger value="usuarios">Usuários</TabsTrigger>}
          </TabsList>

          <TabsContent value="chatwoot" className="mt-6">
            <AbaConfigChatwoot />
          </TabsContent>

          <TabsContent value="webhooks" className="mt-6">
            <AbaWebhooks />
          </TabsContent>

          <TabsContent value="externos" className="mt-6">
            <AbaWebhooksExternos />
          </TabsContent>

          <TabsContent value="mappings" className="mt-6">
            <AbaMappings />
          </TabsContent>

          <TabsContent value="monitoramento" className="mt-6">
            <AbaMonitoramento />
          </TabsContent>

          <TabsContent value="ia" className="mt-6">
            <AbaConfigIA />
          </TabsContent>

          {isMaster && (
            <TabsContent value="usuarios" className="mt-6">
              <AbaUsuarios />
            </TabsContent>
          )}

        </Tabs>
      </div>
    </div>
  );
};

export default Configuracoes;
