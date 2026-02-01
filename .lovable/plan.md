
# Plano: Correção de Card sem Nome/Foto + Verificação do Colapso

## Diagnóstico dos Problemas

### Problema 1: Card sem Nome e Foto
**Causa Raiz Identificada:**
- Quando o Chatwoot abre o iframe e envia o `postMessage`, ele passa apenas o `conversationId`
- O campo `contact` vem vazio ou incompleto do Chatwoot
- O código atual usa `contact?.name || "Conversa #${conversationId}"`, resultando no fallback
- A foto (avatar_url) também não é populada porque depende dos mesmos dados

**Evidência no código:**
```typescript
// KanbanSelectorModal.tsx - linha 85
const titulo = contact?.name || `Conversa #${conversationId}`;
```

O `contact` depende do que o Chatwoot envia via postMessage, e se não vier, o card é criado com título genérico.

### Problema 2: "Colapso" não aparece
**Análise:**
- O código da sidebar de filtros (`FiltersSidebar.tsx`) tem a funcionalidade de colapso implementada
- O botão de toggle existe e funciona via localStorage
- Possíveis causas: estado inicial, ou o usuário está se referindo a outra funcionalidade de collapse

---

## Solução Proposta

### Parte 1: Enriquecer Dados do Contato via API Chatwoot

**Abordagem:** Quando o card for criado via iframe, buscar os dados do contato diretamente da API do Chatwoot usando o `conversationId`.

**Arquivo a criar:** `supabase/functions/get-chatwoot-contact/index.ts`

Esta Edge Function irá:
1. Receber o `conversationId`
2. Buscar os detalhes da conversa na API do Chatwoot
3. Retornar os dados do contato (nome, telefone, avatar_url)

Estrutura:
```text
GET /get-chatwoot-contact
Body: { conversationId: number }
Response: { 
  success: true, 
  contact: {
    name: string,
    phone: string | null,
    email: string | null,
    avatar_url: string | null
  }
}
```

**Arquivo a modificar:** `src/services/cardLookupService.ts`

Adicionar função `enrichContactFromChatwoot`:
- Chama a Edge Function para buscar dados do contato
- Retorna os dados enriquecidos para uso no modal

**Arquivo a modificar:** `src/components/chatwoot/KanbanSelectorModal.tsx`

Modificar `handleSelectStage`:
- Antes de criar o card, chamar `enrichContactFromChatwoot(conversationId)`
- Usar os dados retornados para popular `titulo` e `avatarUrl`

### Parte 2: Verificar Sidebar Collapsed

**Arquivo a verificar:** `src/pages/Dashboard.tsx`

O estado `sidebarCollapsed` é gerenciado corretamente. Vou verificar se está sendo passado corretamente para o componente `FiltersSidebar`.

Se o problema for visual (botão não visível), ajustar o styling do botão de toggle.

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/get-chatwoot-contact/index.ts` | Edge Function para buscar dados do contato via API Chatwoot |

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/services/cardLookupService.ts` | Adicionar função `enrichContactFromChatwoot` |
| `src/components/chatwoot/KanbanSelectorModal.tsx` | Usar dados enriquecidos ao criar card |
| `src/pages/Dashboard.tsx` | Verificar passagem do estado collapsed (se necessário) |

---

## Seção Técnica: Implementação

### Nova Edge Function: get-chatwoot-contact

```typescript
// Busca dados do contato da conversa no Chatwoot
async function fetchConversationDetails(
  baseUrl: string,
  apiKey: string,
  accountId: string,
  conversationId: number
) {
  const url = `${baseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'api_access_token': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar conversa: ${response.status}`);
  }

  const data = await response.json();
  
  // Extrair dados do contato do meta.sender
  const sender = data.meta?.sender;
  
  return {
    name: sender?.name || null,
    phone: sender?.phone_number || null,
    email: sender?.email || null,
    avatar_url: sender?.thumbnail || null,
  };
}
```

### Modificação no KanbanSelectorModal

```typescript
const handleSelectStage = async (funil, etapa) => {
  // 1. Buscar dados enriquecidos do contato
  let enrichedContact = null;
  try {
    enrichedContact = await enrichContactFromChatwoot(conversationId);
  } catch (error) {
    console.warn('[KanbanModal] Não foi possível enriquecer contato:', error);
  }

  // 2. Usar dados enriquecidos OU fallback
  const titulo = enrichedContact?.name || contact?.name || `Conversa #${conversationId}`;
  const avatarUrl = enrichedContact?.avatar_url || contact?.avatar_url;
  const telefone = enrichedContact?.phone || contact?.phone;

  // 3. Criar ou mover card com dados corretos
  const newCard = await createCardForConversation({
    conversationId,
    titulo,
    etapaId: etapa.id,
    funilId: funil.id,
    funilNome: funil.nome,
    etapaNome: etapa.nome,
    telefone,
    avatarUrl,
  });
};
```

### Fluxo Completo

```text
1. Chatwoot abre iframe → /chatwoot-embed
2. Chatwoot envia postMessage com { conversationId: 3619 }
3. Usuário clica em "Gerenciar no Kanban"
4. Modal abre e busca card existente
5. Se não existe, ao selecionar etapa:
   a. Chama get-chatwoot-contact para buscar nome/avatar
   b. Cria card com dados enriquecidos
6. Card aparece no Kanban com nome e foto corretos
```

---

## Resultado Esperado

1. Cards criados via iframe terão o nome real do contato do Chatwoot (ex: "João Silva" em vez de "Conversa #3619")
2. Cards terão a foto do contato quando disponível
3. Sidebar de filtros funcionará corretamente com o botão de colapso visível
