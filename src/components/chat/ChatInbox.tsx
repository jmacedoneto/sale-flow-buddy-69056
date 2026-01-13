import { useState, useRef, useEffect } from "react";
import { Send, Loader2, MessageCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useChatwootMessages } from "@/hooks/useChatwootMessages";
import { sendChatwootMessage } from "@/services/chatwootMessagingService";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChatwootMessage } from "@/services/chatwootService";

interface ChatInboxProps {
  conversationId: number;
  cardId: string;
  funilId: string | null;
  avatarLeadUrl?: string | null;
  avatarAgenteUrl?: string | null;
}

export const ChatInbox = ({ conversationId, cardId, funilId, avatarLeadUrl, avatarAgenteUrl }: ChatInboxProps) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(10000);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { canEditFunil } = usePermissions();
  const canSendMessages = funilId ? canEditFunil(funilId) : false;

  // Buscar mensagens
  const { data: messages = [], isLoading, error, refetch } = useChatwootMessages(conversationId);

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // P7: Polling com exponential backoff
  useEffect(() => {
    if (error) {
      // Se houver erro, aumentar intervalo progressivamente (máx 60s)
      setPollingInterval(prev => Math.min(prev * 1.5, 60000));
      return;
    }

    // Reset para intervalo base se não houver erro
    setPollingInterval(10000);
    
    const interval = setInterval(() => {
      refetch();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [refetch, error, pollingInterval]);

  const handleSend = async () => {
    if (!message.trim() || !canSendMessages) return;

    const messageToSend = message;
    setMessage("");
    setSending(true);

    try {
      const result = await sendChatwootMessage({
        conversationId,
        content: messageToSend,
        private: false,
      });

      if (!result.success) {
        throw new Error(result.error || "Erro ao enviar mensagem");
      }

      toast.success("Mensagem enviada");
      
      // Refetch imediato após enviar
      setTimeout(() => refetch(), 1000);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar mensagem");
      setMessage(messageToSend); // Restaurar mensagem em caso de erro
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Exibir erro amigável se a conversa não existir
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <MessageCircle className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
        <h3 className="font-semibold text-foreground mb-2">Conversa não encontrada</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          A conversa #{conversationId} não foi encontrada no Chatwoot. 
          Ela pode ter sido deletada ou o ID pode estar incorreto.
        </p>
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription className="text-xs">
            {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const sortedMessages = [...messages].sort((a, b) => a.created_at - b.created_at);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Histórico de Conversas</h3>
          <span className="text-xs text-muted-foreground ml-auto">
            {messages.length} mensagens
          </span>
        </div>
      </div>

      {/* Mensagens */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {sortedMessages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma mensagem ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedMessages.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                avatarLeadUrl={avatarLeadUrl}
                avatarAgenteUrl={avatarAgenteUrl}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input de envio */}
      <div className="p-4 border-t border-border bg-muted/20">
        {!canSendMessages ? (
          <Alert className="mb-0">
            <AlertDescription className="text-sm">
              Você não tem permissão para enviar mensagens neste funil
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para quebrar linha)"
              className="resize-none min-h-[60px] max-h-[120px]"
              disabled={sending}
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sending}
              className="self-end"
              size="icon"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente de bubble de mensagem
const MessageBubble = ({ 
  message, 
  avatarLeadUrl, 
  avatarAgenteUrl 
}: { 
  message: ChatwootMessage;
  avatarLeadUrl?: string | null;
  avatarAgenteUrl?: string | null;
}) => {
  const isAgent = message.message_type === 1; // 1 = outgoing (agent)
  const isPrivate = message.private === true; // Mensagem privada
  const timestamp = new Date(message.created_at * 1000);
  const senderName = message.sender?.name || (isAgent ? "Agente" : "Cliente");
  const avatarUrl = isAgent ? avatarAgenteUrl : avatarLeadUrl;
  const initials = senderName.substring(0, 2).toUpperCase();

  // Definir estilos baseado no tipo de mensagem
  const getBubbleStyles = () => {
    if (isPrivate) {
      // Mensagem privada: fundo amarelo/âmbar (como no Chatwoot)
      return "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-700 rounded-tr-sm";
    }
    if (isAgent) {
      return "bg-primary text-primary-foreground rounded-tr-sm";
    }
    return "bg-muted text-foreground rounded-tl-sm";
  };

  return (
    <div className={`flex gap-3 ${isAgent ? "flex-row-reverse" : "flex-row"} animate-fade-in`}>
      {/* Avatar */}
      <Avatar className={`flex-shrink-0 w-10 h-10 shadow-sm ${
        isPrivate 
          ? "ring-2 ring-amber-400/50" 
          : isAgent 
            ? "ring-2 ring-primary/20" 
            : "ring-2 ring-muted/50"
      }`}>
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={senderName} />
        ) : null}
        <AvatarFallback className={`${
          isPrivate
            ? "bg-gradient-to-br from-amber-400 to-amber-500 text-amber-900"
            : isAgent
              ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
              : "bg-gradient-to-br from-muted to-muted/80 text-foreground"
        }`}>
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Conteúdo */}
      <div className={`flex-1 max-w-[75%] ${isAgent ? "text-right" : "text-left"}`}>
        <div className={`flex items-center gap-2 mb-1 ${isAgent ? "justify-end" : "justify-start"}`}>
          <span className="text-sm font-medium text-foreground">{senderName}</span>
          {isPrivate && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600">
              <Lock className="h-2.5 w-2.5 mr-0.5" />
              Privada
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {format(timestamp, "dd/MM 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>

        <div className={`inline-block px-4 py-2.5 rounded-2xl shadow-sm ${getBubbleStyles()}`}>
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </p>
        </div>

        {/* Anexos */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment: any, idx: number) => {
              const fileType = attachment.file_type || '';
              const isImage = fileType.startsWith('image/');
              const isAudio = fileType.startsWith('audio/');
              const isVideo = fileType.startsWith('video/');

              if (isImage) {
                return (
                  <a
                    key={idx}
                    href={attachment.data_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={attachment.data_url}
                      alt={attachment.file_name || "Imagem"}
                      className="max-w-xs rounded-lg shadow-sm hover:opacity-90 transition-opacity"
                      loading="lazy"
                    />
                  </a>
                );
              }

              if (isAudio) {
                return (
                  <audio
                    key={idx}
                    controls
                    className="max-w-xs"
                    preload="metadata"
                  >
                    <source src={attachment.data_url} type={fileType} />
                    Seu navegador não suporta áudio.
                  </audio>
                );
              }

              if (isVideo) {
                return (
                  <video
                    key={idx}
                    controls
                    className="max-w-xs rounded-lg shadow-sm"
                    preload="metadata"
                  >
                    <source src={attachment.data_url} type={fileType} />
                    Seu navegador não suporta vídeo.
                  </video>
                );
              }

              // Outros tipos de arquivo (PDF, documentos, etc.)
              return (
                <a
                  key={idx}
                  href={attachment.data_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  📎 {attachment.file_name || "Anexo"}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
