import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useWebhooks } from "@/hooks/useWebhooks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const ListaWebhooks = () => {
  const { webhooks, isLoading, deleteWebhook, updateWebhook } = useWebhooks();

  const handleToggleStatus = (webhookId: string, currentStatus: boolean) => {
    updateWebhook({
      id: webhookId,
      updates: { ativo: !currentStatus },
    });
  };

  const handleDelete = (webhookId: string) => {
    deleteWebhook(webhookId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Carregando webhooks...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meus Webhooks ({webhooks.length} total)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {webhooks.length === 0 ? (
          <p className="text-muted-foreground">Nenhum webhook configurado ainda.</p>
        ) : (
          webhooks.map((webhook, index) => (
            <div
              key={webhook.id}
              className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium flex items-center gap-2">
                    {index + 1}️⃣ {webhook.nome}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Evento: {webhook.evento_chatwoot}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ação: {webhook.acao}
                  </p>
                  <button
                    onClick={() => handleToggleStatus(webhook.id, webhook.ativo)}
                    className="text-sm mt-1 hover:opacity-80 transition-opacity"
                  >
                    Status: {webhook.ativo ? '🟢 Ativo' : '🔴 Inativo'}
                  </button>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="icon" title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon" title="Deletar">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja deletar o webhook "{webhook.nome}"? 
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(webhook.id)}>
                          Deletar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
