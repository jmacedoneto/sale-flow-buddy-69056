import { ChatwootMessage } from "@/services/chatwootService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageCircle, User } from "lucide-react";

interface ChatwootMessageTimelineProps {
  messages: ChatwootMessage[];
}

export const ChatwootMessageTimeline = ({ messages }: ChatwootMessageTimelineProps) => {
  if (!messages || messages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Nenhuma mensagem encontrada</p>
      </div>
    );
  }

  // Ordenar mensagens mais recentes primeiro
  const sortedMessages = [...messages].sort((a, b) => b.created_at - a.created_at);

  return (
    <div className="space-y-4">
      {sortedMessages.map((message) => {
        const isAgent = message.message_type === 1; // 1 = outgoing (agent), 0 = incoming (contact)
        const timestamp = new Date(message.created_at * 1000);
        const senderName = message.sender?.name || (isAgent ? 'Agente' : 'Cliente');

        return (
          <div
            key={message.id}
            className={`flex gap-3 ${isAgent ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              isAgent ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              <User className="h-4 w-4" />
            </div>

            {/* Conteúdo da mensagem */}
            <div className={`flex-1 max-w-[80%] ${isAgent ? 'text-right' : 'text-left'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-sm font-medium ${isAgent ? 'order-2' : 'order-1'}`}>
                  {senderName}
                </span>
                <span className={`text-xs text-muted-foreground ${isAgent ? 'order-1' : 'order-2'}`}>
                  {format(timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              
              <div
                className={`inline-block px-4 py-2 rounded-lg ${
                  isAgent
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              </div>

              {/* Anexos */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.attachments.map((attachment: any, idx: number) => (
                    <a
                      key={idx}
                      href={attachment.data_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline block"
                    >
                      📎 {attachment.file_name || 'Anexo'}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
