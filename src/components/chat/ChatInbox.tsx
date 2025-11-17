import { useState, useRef, useEffect } from "react";
import { Send, Loader2, MessageCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
}

export const ChatInbox = ({ conversationId, cardId, funilId }: ChatInboxProps) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { canEditFunil } = usePermissions();
  const canSendMessages = funilId ? canEditFunil(funilId) : false;

  // Buscar mensagens com polling de 10 segundos
  const { data: messages = [], isLoading, refetch } = useChatwootMessages(conversationId);

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Polling quando o componente está montado
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, [refetch]);

  const handleSend = async () => {
    if (!message.trim() || !canSendMessages) return;

    setSending(true);
    try {
      await sendChatwootMessage({
        conversationId,
        content: message.trim(),
        private: false,
      });

      setMessage("");
      toast.success("Mensagem enviada");
      
      // Refetch imediato após enviar
      setTimeout(() => refetch(), 1000);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem");
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
              <MessageBubble key={msg.id} message={msg} />
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
const MessageBubble = ({ message }: { message: ChatwootMessage }) => {
  const isAgent = message.message_type === 1; // 1 = outgoing (agent)
  const timestamp = new Date(message.created_at * 1000);
  const senderName = message.sender?.name || (isAgent ? "Agente" : "Cliente");

  return (
    <div className={`flex gap-3 ${isAgent ? "flex-row-reverse" : "flex-row"} animate-fade-in`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
          isAgent
            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
            : "bg-gradient-to-br from-muted to-muted/80 text-foreground"
        }`}
      >
        <User className="h-5 w-5" />
      </div>

      {/* Conteúdo */}
      <div className={`flex-1 max-w-[75%] ${isAgent ? "text-right" : "text-left"}`}>
        <div className={`flex items-baseline gap-2 mb-1 ${isAgent ? "justify-end" : "justify-start"}`}>
          <span className="text-sm font-medium text-foreground">{senderName}</span>
          <span className="text-xs text-muted-foreground">
            {format(timestamp, "dd/MM 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>

        <div
          className={`inline-block px-4 py-2.5 rounded-2xl shadow-sm ${
            isAgent
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm"
          }`}
        >
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
