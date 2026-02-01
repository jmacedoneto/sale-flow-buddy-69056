
# Plano: Correções da Integração Chatwoot + API para Agente IA

## Resumo das Alterações

Este plano resolve 3 problemas identificados e adiciona novos endpoints para automação com agentes IA:

1. **Card sem nome/foto do contato** - Enriquecer dados ao criar card
2. **Follow-up aparece mas precisa garantir `user_id`** - Garantir que o campo está preenchido
3. **API expandida para agentes IA** - Novos endpoints HTTP para automação
4. **Documentação atualizada** - Novos endpoints na aba API Docs

---

## Parte 1: Corrigir Dados do Card (Nome e Avatar)

### Problema Atual
O `KanbanSelectorModal.tsx` cria cards usando `contact?.name` do `postMessage`, mas pode receber dados incompletos.

### Solução
Modificar o `cardLookupService.ts` para aceitar `avatarUrl` ao criar o card.

**Arquivo:** `src/services/cardLookupService.ts`

Modificações:
- Adicionar parâmetro `avatarUrl?: string` na função `createCardForConversation`
- Popular campo `avatar_lead_url` no insert

**Arquivo:** `src/components/chatwoot/KanbanSelectorModal.tsx`

Modificações:
- Passar `avatarUrl: contact?.avatar_url` para o serviço

---

## Parte 2: Garantir Follow-up com `user_id`

### Diagnóstico
O `createFollowUpActivity` já recebe `userId` como parâmetro opcional, mas precisamos garantir que está sempre preenchido quando disponível.

**Arquivo:** `src/components/chatwoot/FollowUpModal.tsx`

Verificar se `user?.id` está sendo passado corretamente (já está implementado na linha 87).

O código atual já está correto:
```typescript
userId: user?.id,
```

Nenhuma modificação necessária neste arquivo.

---

## Parte 3: Expandir API para Agentes IA

### Novos Endpoints

**Arquivo:** `supabase/functions/cards-api/index.ts`

Adicionar 4 novas actions:

| Action | Descrição | Parâmetros |
|--------|-----------|------------|
| `getByConversation` | Busca card por `chatwoot_conversa_id` | `conversationId` |
| `createFromConversation` | Cria card vinculado a conversa Chatwoot | `conversationId, titulo, telefone?, avatarUrl?, funilId, etapaId` |
| `createActivity` | Cria atividade/follow-up | `cardId? ou conversationId?, tipo, descricao, dataPrevista?, funilNome?` |
| `listFunnels` | Lista todos os funis com etapas | nenhum |

### Lógica de Atividades
- Se `funilNome` contém "comercial" → criar `FOLLOW_UP` com `data_prevista` (+3 dias úteis se não informada)
- Senão → criar `NOTA_ADMIN` com `privado: true`

### Estrutura das Novas Actions

```typescript
// getByConversation
case 'getByConversation': {
  const { conversationId } = body;
  const { data: card } = await supabase
    .from('cards_conversas')
    .select('*')
    .eq('chatwoot_conversa_id', conversationId)
    .maybeSingle();
  return { success: true, card };
}

// createFromConversation
case 'createFromConversation': {
  const { conversationId, titulo, telefone, avatarUrl, funilId, etapaId } = body;
  
  // Verificar se já existe
  const { data: existing } = await supabase
    .from('cards_conversas')
    .select('id')
    .eq('chatwoot_conversa_id', conversationId)
    .maybeSingle();
    
  if (existing) {
    return { success: false, error: 'Card já existe para esta conversa', cardId: existing.id };
  }
  
  // Buscar nomes do funil e etapa
  const [funilRes, etapaRes] = await Promise.all([
    supabase.from('funis').select('nome').eq('id', funilId).single(),
    supabase.from('etapas').select('nome').eq('id', etapaId).single()
  ]);
  
  // Criar card
  const { data: card } = await supabase.from('cards_conversas').insert({
    chatwoot_conversa_id: conversationId,
    titulo: titulo || `Conversa #${conversationId}`,
    telefone_lead: telefone,
    avatar_lead_url: avatarUrl,
    funil_id: funilId,
    etapa_id: etapaId,
    funil_nome: funilRes.data?.nome,
    funil_etapa: etapaRes.data?.nome,
    status: 'em_andamento',
    data_retorno: addDays(new Date(), 7)
  }).select().single();
  
  // Criar atividade de criação
  await supabase.from('atividades_cards').insert({
    card_id: card.id,
    tipo: 'CRIACAO',
    descricao: 'Card criado via API'
  });
  
  return { success: true, card };
}

// createActivity
case 'createActivity': {
  const { cardId, conversationId, tipo, descricao, dataPrevista, funilNome } = body;
  
  // Resolver cardId se necessário
  let resolvedCardId = cardId;
  if (!resolvedCardId && conversationId) {
    const { data: card } = await supabase
      .from('cards_conversas')
      .select('id, funil_nome')
      .eq('chatwoot_conversa_id', conversationId)
      .single();
    resolvedCardId = card?.id;
    // Usar funil_nome do card se não informado
    if (!funilNome && card?.funil_nome) {
      funilNome = card.funil_nome;
    }
  }
  
  if (!resolvedCardId) {
    return { success: false, error: 'Card não encontrado' };
  }
  
  // Determinar tipo baseado no funil
  const isComercial = funilNome?.toLowerCase().includes('comercial');
  const activityType = tipo || (isComercial ? 'FOLLOW_UP' : 'NOTA_ADMIN');
  const isPrivate = !isComercial;
  
  // Calcular data prevista se comercial e não informada
  let resolvedDataPrevista = dataPrevista;
  if (isComercial && !dataPrevista) {
    resolvedDataPrevista = addBusinessDays(new Date(), 3);
  }
  
  const { data: activity } = await supabase.from('atividades_cards').insert({
    card_id: resolvedCardId,
    tipo: activityType,
    descricao: descricao || `Atividade: ${activityType}`,
    data_prevista: resolvedDataPrevista,
    privado: isPrivate,
    status: 'pendente'
  }).select().single();
  
  // Atualizar data_retorno do card se comercial
  if (isComercial && resolvedDataPrevista) {
    await supabase.from('cards_conversas')
      .update({ data_retorno: resolvedDataPrevista })
      .eq('id', resolvedCardId);
  }
  
  return { success: true, activity };
}

// listFunnels
case 'listFunnels': {
  const { data: funis } = await supabase
    .from('funis')
    .select('id, nome')
    .eq('ativo', true)
    .order('ordem');
    
  const funisWithEtapas = await Promise.all(funis.map(async (funil) => {
    const { data: etapas } = await supabase
      .from('etapas')
      .select('id, nome, ordem, cor')
      .eq('funil_id', funil.id)
      .order('ordem');
    return { ...funil, etapas };
  }));
  
  return { success: true, funnels: funisWithEtapas };
}
```

---

## Parte 4: Atualizar Documentação da API

**Arquivo:** `src/components/AbaApiDocs.tsx`

Adicionar novos endpoints na lista `endpoints`:

```typescript
{
  method: "POST",
  path: "/getByConversation",
  description: "Busca card por ID da conversa Chatwoot",
  body: { action: "getByConversation", conversationId: 4406 }
},
{
  method: "POST",
  path: "/createFromConversation",
  description: "Cria card vinculado a uma conversa Chatwoot",
  body: { 
    action: "createFromConversation",
    conversationId: 4406,
    titulo: "João Silva",
    telefone: "+5571999999999",
    funilId: "uuid",
    etapaId: "uuid"
  }
},
{
  method: "POST",
  path: "/createActivity",
  description: "Cria atividade/follow-up para um card",
  body: { 
    action: "createActivity",
    conversationId: 4406,
    tipo: "FOLLOW_UP",
    descricao: "Retornar sobre proposta",
    dataPrevista: "2026-02-05"
  }
},
{
  method: "POST",
  path: "/listFunnels",
  description: "Lista todos os funis e etapas disponíveis",
  body: { action: "listFunnels" }
}
```

Adicionar seção de exemplos para agentes IA com curl commands.

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `supabase/functions/cards-api/index.ts` | Adicionar 4 novas actions |
| `src/services/cardLookupService.ts` | Adicionar `avatarUrl` ao criar card |
| `src/components/chatwoot/KanbanSelectorModal.tsx` | Passar `avatarUrl` para o serviço |
| `src/components/AbaApiDocs.tsx` | Documentar novos endpoints + exemplos IA |

---

## Seção Técnica: Exemplos de Uso pelo Agente IA

### 1. Verificar se conversa já tem card

```bash
curl -X POST https://sjrmpojssvfgquroywys.supabase.co/functions/v1/cards-api \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua_api_key" \
  -d '{"action": "getByConversation", "conversationId": 4406}'
```

**Resposta:**
```json
{
  "success": true,
  "card": { "id": "uuid", "titulo": "João Silva", "funil_nome": "Comercial", ... }
}
```

### 2. Criar card para conversa

```bash
curl -X POST https://sjrmpojssvfgquroywys.supabase.co/functions/v1/cards-api \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua_api_key" \
  -d '{
    "action": "createFromConversation",
    "conversationId": 4406,
    "titulo": "João Silva",
    "telefone": "+5571999999999",
    "avatarUrl": "https://...",
    "funilId": "uuid-do-funil",
    "etapaId": "uuid-da-etapa"
  }'
```

### 3. Criar follow-up comercial

```bash
curl -X POST https://sjrmpojssvfgquroywys.supabase.co/functions/v1/cards-api \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua_api_key" \
  -d '{
    "action": "createActivity",
    "conversationId": 4406,
    "tipo": "FOLLOW_UP",
    "descricao": "Retornar sobre proposta enviada",
    "dataPrevista": "2026-02-05",
    "funilNome": "Comercial"
  }'
```

### 4. Criar nota administrativa (privada)

```bash
curl -X POST https://sjrmpojssvfgquroywys.supabase.co/functions/v1/cards-api \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua_api_key" \
  -d '{
    "action": "createActivity",
    "conversationId": 4406,
    "descricao": "Cliente solicitou suporte técnico",
    "funilNome": "Suporte"
  }'
```

### 5. Listar funis disponíveis

```bash
curl -X POST https://sjrmpojssvfgquroywys.supabase.co/functions/v1/cards-api \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua_api_key" \
  -d '{"action": "listFunnels"}'
```

**Resposta:**
```json
{
  "success": true,
  "funnels": [
    {
      "id": "uuid-1",
      "nome": "Comercial",
      "etapas": [
        { "id": "uuid-e1", "nome": "Novo Lead", "ordem": 1, "cor": "#3b82f6" },
        { "id": "uuid-e2", "nome": "Qualificação", "ordem": 2, "cor": "#eab308" }
      ]
    },
    {
      "id": "uuid-2",
      "nome": "Suporte",
      "etapas": [...]
    }
  ]
}
```

---

## Fluxo do Agente IA

```text
1. Recebe mensagem do cliente no Chatwoot
2. Analisa conteúdo e decide criar card/follow-up
3. Chama GET /listFunnels para obter IDs
4. Chama POST /getByConversation para verificar se card existe
5. Se não existe → POST /createFromConversation
6. Chama POST /createActivity para agendar follow-up
7. Responde ao cliente e registra no Chatwoot
```

---

## Resultado Esperado

1. Cards criados pelo iframe/API terão nome e foto do contato
2. Follow-ups aparecerão corretamente na aba Atividades
3. Agente IA poderá criar cards e atividades via HTTP requests
4. Documentação completa na aba Configurações → API Docs
