

## Plano: Webhook Direto do Chatwoot (Sem N8N)

### Parte 1: Configuração no Chatwoot (manual)

1. Acessar **Settings → Integrations → Webhooks**
2. Adicionar novo webhook:
   - **URL**: `https://sjrmpojssvfgquroywys.supabase.co/functions/v1/dispatcher-multi`
   - **Events**: Selecionar `message_created` (e `conversation_updated` se desejado)
3. Salvar e testar

### Parte 2: Simplificar dispatcher-multi

**Arquivo:** `supabase/functions/dispatcher-multi/index.ts`

1. **Remover** a lógica de workaround que chama a API do Chatwoot para buscar mensagens privadas (linhas 924-1020 aproximadamente)
2. **Manter** a lógica existente de detecção de `private: true` que já funciona
3. **Adicionar** deduplicação por `chatwoot_message_id` para evitar processar a mesma mensagem duas vezes (caso N8N e webhook direto coexistam)

### Parte 3: Lógica de atividades (já implementada)

O código já tem a lógica correta:
- Detectar `isPrivate` em múltiplos locais do payload
- Buscar funil do card existente
- Criar `FOLLOW_UP` com data prevista (+3 dias úteis) se funil = "Comercial"
- Criar `NOTA_ADMIN` privada para outros funis

### Resultado esperado

1. Mensagem privada enviada no Chatwoot
2. Chatwoot dispara webhook direto para dispatcher-multi
3. Payload chega com `private: true`
4. Atividade é criada automaticamente (FOLLOW_UP ou NOTA_ADMIN)
5. Visual amarelo já aparece no histórico de conversas

### Arquivos a modificar

- `supabase/functions/dispatcher-multi/index.ts` - Simplificar removendo workaround e adicionando deduplicação

