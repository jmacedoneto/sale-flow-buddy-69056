

# Plano: Integração Bilateral CRM ↔ Chatwoot via postMessage

## Resumo Executivo

Este plano implementa a funcionalidade para o CRM ser embarcado como iframe dentro do Chatwoot, recebendo dados via `postMessage` e permitindo ações de Kanban e Follow-up com retorno de status.

## Parte 1: Infraestrutura de Comunicação postMessage

### 1.1 Criar Hook de Comunicação Chatwoot

**Arquivo:** `src/hooks/useChatwootIframe.ts`

Responsabilidades:
- Listener de `window.addEventListener('message', ...)`
- Validação de origem do evento
- Estado global para dados do Chatwoot (conversationId, contact, authToken)
- Função para enviar respostas via `window.parent.postMessage`

Tipos de mensagens suportadas:
```text
Entrada:
- CHATWOOT_DATA: { conversationId, contact, authToken }
- OPEN_KANBAN_MODAL: { conversationId }
- OPEN_FOLLOWUP_MODAL: { conversationId }

Saída:
- KANBAN_ACTION_COMPLETE: { success, funnelId, stageId, cardId }
- FOLLOWUP_ACTION_COMPLETE: { success, activityId, scheduledDate }
- CRM_ERROR: { error, code }
```

### 1.2 Criar Contexto Global

**Arquivo:** `src/contexts/ChatwootContext.tsx`

Provê dados do Chatwoot para toda a aplicação quando embarcada:
- conversationId
- contactInfo (nome, telefone, email)
- isEmbedded (flag para saber se está em iframe)

## Parte 2: Modal de Kanban para Chatwoot

### 2.1 Componente Modal

**Arquivo:** `src/components/chatwoot/KanbanSelectorModal.tsx`

Funcionalidades:
- Recebe conversationId do contexto
- Busca card existente por `chatwoot_conversa_id`
- Lista todos os funis disponíveis (usa `useFunis()` existente)
- Expande etapas ao selecionar funil (usa `useEtapas()` existente)
- Permite selecionar etapa de destino
- Executa `useMoveCard()` ou cria card novo se não existir
- Envia `KANBAN_ACTION_COMPLETE` via postMessage

Interface visual:
- Lista vertical de funis (cards clicáveis)
- Ao clicar em funil, expande etapas como acordeão
- Botão de confirmação por etapa
- Loading state durante operação
- Feedback visual de sucesso/erro

### 2.2 Serviço de Busca por Conversa

**Arquivo:** `src/services/cardLookupService.ts`

Função: `getCardByConversationId(conversationId: number)`
- Busca card na tabela `cards_conversas` por `chatwoot_conversa_id`
- Retorna card completo ou null
- Usado para verificar se conversa já tem card associado

## Parte 3: Modal de Follow-up para Chatwoot

### 3.1 Componente Modal

**Arquivo:** `src/components/chatwoot/FollowUpModal.tsx`

Funcionalidades:
- Recebe conversationId do contexto
- Busca card associado à conversa
- Formulário de agendamento:
  - Tipo de atividade (Ligação, Email, WhatsApp, Reunião)
  - Data e hora do follow-up
  - Descrição opcional
- Lista de follow-ups pendentes do card
- Salva na tabela `atividades_cards`
- Atualiza `data_retorno` do card
- Envia `FOLLOWUP_ACTION_COMPLETE` via postMessage

### 3.2 Reutilização de Componentes Existentes

O projeto já possui:
- `QuickActivityModal.tsx` - Base para o novo modal
- `FollowUpInline.tsx` - Lógica de criação de follow-up
- `useCreateAtividade()` - Mutation pronta para usar

## Parte 4: Rota Dedicada para Iframe

### 4.1 Nova Página

**Arquivo:** `src/pages/ChatwootEmbed.tsx`

Características:
- Rota: `/chatwoot-embed`
- Sem header/sidebar (layout mínimo)
- Renderiza modais baseado em mensagens recebidas
- Modo "waiting" quando não há ação ativa
- Responde automaticamente com status da operação

### 4.2 Atualização de Rotas

**Arquivo:** `src/App.tsx`

Adicionar rota pública (sem ProtectedRoute) para embed:
```text
/chatwoot-embed → ChatwootEmbed
```

Autenticação será via token passado pelo Chatwoot no postMessage.

## Parte 5: Edge Function para API Externa (Opcional)

Se precisar expor via REST além de postMessage:

**Arquivo:** `supabase/functions/chatwoot-embed-api/index.ts`

Endpoints:
- POST /card-by-conversation - Busca card por conversation_id
- POST /move-card - Move card para funil/etapa
- POST /create-followup - Cria follow-up
- GET /funnels - Lista funis e etapas

Usa mesma autenticação por API Key já existente no `cards-api`.

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useChatwootIframe.ts` | Hook de comunicação postMessage |
| `src/contexts/ChatwootContext.tsx` | Contexto global para dados Chatwoot |
| `src/components/chatwoot/KanbanSelectorModal.tsx` | Modal de seleção de funil/etapa |
| `src/components/chatwoot/FollowUpModal.tsx` | Modal de agendamento de follow-up |
| `src/pages/ChatwootEmbed.tsx` | Página dedicada para iframe |
| `src/services/cardLookupService.ts` | Serviço de busca de card por conversa |

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/App.tsx` | Adicionar rota `/chatwoot-embed` |

## Seção Técnica: Detalhes de Implementação

### Estrutura do postMessage

```typescript
// Mensagem de entrada do Chatwoot
interface ChatwootInboundMessage {
  type: 'CHATWOOT_DATA' | 'OPEN_KANBAN_MODAL' | 'OPEN_FOLLOWUP_MODAL';
  payload: {
    conversationId: number;
    contact?: {
      name: string;
      phone?: string;
      email?: string;
    };
    authToken?: string;
  };
}

// Mensagem de saída para Chatwoot
interface ChatwootOutboundMessage {
  type: 'KANBAN_ACTION_COMPLETE' | 'FOLLOWUP_ACTION_COMPLETE' | 'CRM_ERROR';
  success: boolean;
  data?: {
    funnelId?: string;
    stageId?: string;
    cardId?: string;
    activityId?: string;
    scheduledDate?: string;
  };
  error?: string;
}
```

### Fluxo de Dados

```text
1. Chatwoot abre iframe → /chatwoot-embed
2. Chatwoot envia postMessage com CHATWOOT_DATA
3. CRM armazena dados no contexto
4. Usuário interage com modal (Kanban ou Follow-up)
5. CRM executa operação no banco de dados
6. CRM envia postMessage com resultado
7. Chatwoot recebe e processa resposta
```

### Busca de Card por Conversa

Query utilizada:
```sql
SELECT * FROM cards_conversas 
WHERE chatwoot_conversa_id = $1 
LIMIT 1
```

### Segurança

- Validar `event.origin` no listener de postMessage
- Token de autenticação opcional para operações sensíveis
- Rate limiting na edge function (se criada)

## Dependências

Nenhuma nova dependência necessária. O projeto já possui:
- React Query para estado/cache
- Supabase client para banco de dados
- Radix UI para modais

## Estimativa de Implementação

| Componente | Complexidade |
|------------|--------------|
| Hook postMessage | Baixa |
| Contexto Chatwoot | Baixa |
| Modal Kanban | Média |
| Modal Follow-up | Média |
| Página Embed | Baixa |
| Serviço de busca | Baixa |

