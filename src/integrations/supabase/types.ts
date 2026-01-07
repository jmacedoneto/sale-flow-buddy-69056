export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_config: {
        Row: {
          created_at: string
          id: string
          prompt_assistente_global: string
          prompt_resumo_comercial: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt_assistente_global?: string
          prompt_resumo_comercial?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt_assistente_global?: string
          prompt_resumo_comercial?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          active: boolean | null
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          scopes: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          scopes?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          scopes?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      atividades_cards: {
        Row: {
          card_id: string | null
          chatwoot_contact_id: number | null
          chatwoot_message_id: number | null
          data_conclusao: string | null
          data_criacao: string
          data_prevista: string | null
          descricao: string
          id: string
          observacao: string | null
          privado: boolean | null
          status: string | null
          tipo: string
          user_id: string | null
        }
        Insert: {
          card_id?: string | null
          chatwoot_contact_id?: number | null
          chatwoot_message_id?: number | null
          data_conclusao?: string | null
          data_criacao?: string
          data_prevista?: string | null
          descricao: string
          id?: string
          observacao?: string | null
          privado?: boolean | null
          status?: string | null
          tipo: string
          user_id?: string | null
        }
        Update: {
          card_id?: string | null
          chatwoot_contact_id?: number | null
          chatwoot_message_id?: number | null
          data_conclusao?: string | null
          data_criacao?: string
          data_prevista?: string | null
          descricao?: string
          id?: string
          observacao?: string | null
          privado?: boolean | null
          status?: string | null
          tipo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_trail: {
        Row: {
          campo_alterado: string
          card_id: string
          created_at: string
          id: string
          user_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo_alterado: string
          card_id: string
          created_at?: string
          id?: string
          user_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo_alterado?: string
          card_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_trail_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      automacoes_config: {
        Row: {
          acao: Json
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          gatilho: Json
          id: string
          nome: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          acao: Json
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          gatilho: Json
          id?: string
          nome: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          acao?: Json
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          gatilho?: Json
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      card_produtos: {
        Row: {
          card_id: string
          created_at: string | null
          id: string
          produto_id: string
          quantidade: number | null
          valor: number
        }
        Insert: {
          card_id: string
          created_at?: string | null
          id?: string
          produto_id: string
          quantidade?: number | null
          valor: number
        }
        Update: {
          card_id?: string
          created_at?: string | null
          id?: string
          produto_id?: string
          quantidade?: number | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "card_produtos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      cards_conversas: {
        Row: {
          arquivado: boolean | null
          assigned_to: string | null
          avatar_agente_url: string | null
          avatar_lead_url: string | null
          chatwoot_conversa_id: number | null
          created_at: string
          data_retorno: string | null
          descricao_detalhada: string | null
          etapa_id: string | null
          etapa_origem_id: string | null
          funil_etapa: string | null
          funil_id: string | null
          funil_nome: string | null
          id: string
          last_chatwoot_sync_at: string | null
          lead_score: number | null
          lead_score_categoria: string | null
          motivo_perda_id: string | null
          pausado: boolean | null
          prazo: string | null
          prioridade: string | null
          resumo: string | null
          resumo_comercial: string | null
          resumo_generated_at: string | null
          sla_vencimento: string | null
          status: string | null
          telefone_lead: string | null
          titulo: string
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          arquivado?: boolean | null
          assigned_to?: string | null
          avatar_agente_url?: string | null
          avatar_lead_url?: string | null
          chatwoot_conversa_id?: number | null
          created_at?: string
          data_retorno?: string | null
          descricao_detalhada?: string | null
          etapa_id?: string | null
          etapa_origem_id?: string | null
          funil_etapa?: string | null
          funil_id?: string | null
          funil_nome?: string | null
          id?: string
          last_chatwoot_sync_at?: string | null
          lead_score?: number | null
          lead_score_categoria?: string | null
          motivo_perda_id?: string | null
          pausado?: boolean | null
          prazo?: string | null
          prioridade?: string | null
          resumo?: string | null
          resumo_comercial?: string | null
          resumo_generated_at?: string | null
          sla_vencimento?: string | null
          status?: string | null
          telefone_lead?: string | null
          titulo: string
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          arquivado?: boolean | null
          assigned_to?: string | null
          avatar_agente_url?: string | null
          avatar_lead_url?: string | null
          chatwoot_conversa_id?: number | null
          created_at?: string
          data_retorno?: string | null
          descricao_detalhada?: string | null
          etapa_id?: string | null
          etapa_origem_id?: string | null
          funil_etapa?: string | null
          funil_id?: string | null
          funil_nome?: string | null
          id?: string
          last_chatwoot_sync_at?: string | null
          lead_score?: number | null
          lead_score_categoria?: string | null
          motivo_perda_id?: string | null
          pausado?: boolean | null
          prazo?: string | null
          prioridade?: string | null
          resumo?: string | null
          resumo_comercial?: string | null
          resumo_generated_at?: string | null
          sla_vencimento?: string | null
          status?: string | null
          telefone_lead?: string | null
          titulo?: string
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_conversas_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_conversas_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_conversas_etapa_origem_id_fkey"
            columns: ["etapa_origem_id"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_conversas_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_motivo_perda"
            columns: ["motivo_perda_id"]
            isOneToOne: false
            referencedRelation: "motivos_perda"
            referencedColumns: ["id"]
          },
        ]
      }
      cards_ganhos: {
        Row: {
          card_id: string | null
          created_at: string | null
          data_status: string | null
          funil_id: string | null
          id: string
          motivo: string | null
        }
        Insert: {
          card_id?: string | null
          created_at?: string | null
          data_status?: string | null
          funil_id?: string | null
          id?: string
          motivo?: string | null
        }
        Update: {
          card_id?: string | null
          created_at?: string | null
          data_status?: string | null
          funil_id?: string | null
          id?: string
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_ganhos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_ganhos_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
        ]
      }
      cards_perdidos: {
        Row: {
          card_id: string | null
          created_at: string | null
          data_status: string | null
          funil_id: string | null
          id: string
          motivo: string | null
        }
        Insert: {
          card_id?: string | null
          created_at?: string | null
          data_status?: string | null
          funil_id?: string | null
          id?: string
          motivo?: string | null
        }
        Update: {
          card_id?: string | null
          created_at?: string | null
          data_status?: string | null
          funil_id?: string | null
          id?: string
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_perdidos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_perdidos_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas: {
        Row: {
          cor: string | null
          created_at: string
          funil_id: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          funil_id: string
          id?: string
          nome: string
          ordem: number
          updated_at?: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          funil_id?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapas_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
        ]
      }
      funis: {
        Row: {
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      integracao_chatwoot: {
        Row: {
          account_id: number
          api_key: string | null
          bidir_enabled: boolean | null
          created_at: string
          id: string
          label: string
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          account_id: number
          api_key?: string | null
          bidir_enabled?: boolean | null
          created_at?: string
          id?: string
          label?: string
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          account_id?: number
          api_key?: string | null
          bidir_enabled?: boolean | null
          created_at?: string
          id?: string
          label?: string
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      kanban_colors: {
        Row: {
          coluna: string
          cor: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          coluna: string
          cor: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          coluna?: string
          cor?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      lead_score_config: {
        Row: {
          ativo: boolean | null
          categoria: string
          created_at: string | null
          criterio: string
          descricao: string | null
          funil_id: string | null
          id: string
          pontos: number
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          created_at?: string | null
          criterio: string
          descricao?: string | null
          funil_id?: string | null
          id?: string
          pontos?: number
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          created_at?: string | null
          criterio?: string
          descricao?: string | null
          funil_id?: string | null
          id?: string
          pontos?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_score_config_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
        ]
      }
      mappings_config: {
        Row: {
          active: boolean | null
          chatwoot_key: string
          chatwoot_type: string
          chatwoot_value: string | null
          created_at: string | null
          id: string
          lovable_etapa: string | null
          lovable_funil: string | null
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          chatwoot_key: string
          chatwoot_type: string
          chatwoot_value?: string | null
          created_at?: string | null
          id?: string
          lovable_etapa?: string | null
          lovable_funil?: string | null
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          chatwoot_key?: string
          chatwoot_type?: string
          chatwoot_value?: string | null
          created_at?: string | null
          id?: string
          lovable_etapa?: string | null
          lovable_funil?: string | null
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          atalho: string | null
          ativo: boolean | null
          conteudo: string
          created_at: string
          id: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          atalho?: string | null
          ativo?: boolean | null
          conteudo: string
          created_at?: string
          id?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          atalho?: string | null
          ativo?: boolean | null
          conteudo?: string
          created_at?: string
          id?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      motivos_perda: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          criar_card: boolean | null
          deletar_card: boolean | null
          edit_etapas: boolean | null
          edit_funil: boolean | null
          editar_card: boolean | null
          gerenciar_smtp: boolean | null
          gerenciar_usuarios: boolean | null
          role: string
          ver_dashboard: boolean | null
          ver_relatorios: boolean | null
        }
        Insert: {
          criar_card?: boolean | null
          deletar_card?: boolean | null
          edit_etapas?: boolean | null
          edit_funil?: boolean | null
          editar_card?: boolean | null
          gerenciar_smtp?: boolean | null
          gerenciar_usuarios?: boolean | null
          role: string
          ver_dashboard?: boolean | null
          ver_relatorios?: boolean | null
        }
        Update: {
          criar_card?: boolean | null
          deletar_card?: boolean | null
          edit_etapas?: boolean | null
          edit_funil?: boolean | null
          editar_card?: boolean | null
          gerenciar_smtp?: boolean | null
          gerenciar_usuarios?: boolean | null
          role?: string
          ver_dashboard?: boolean | null
          ver_relatorios?: boolean | null
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
          valor_padrao: number | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
          valor_padrao?: number | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
          valor_padrao?: number | null
        }
        Relationships: []
      }
      system_health: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          last_checked: string
          response_time_ms: number | null
          service: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_checked?: string
          response_time_ms?: number | null
          service: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_checked?: string
          response_time_ms?: number | null
          service?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_funil_access: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          funil_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          funil_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          funil_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_funil_access_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users_crm: {
        Row: {
          approved: boolean | null
          ativo: boolean | null
          avatar_url: string | null
          chatwoot_agent_id: number | null
          created_at: string | null
          criar_card: boolean | null
          deletar_card: boolean | null
          edit_etapas: boolean | null
          edit_funil: boolean | null
          editar_card: boolean | null
          email: string
          gerenciar_usuarios: boolean | null
          id: string
          mover_etapa: boolean | null
          nome: string | null
          role: string | null
          status: string | null
          updated_at: string | null
          ver_cards_outros: boolean | null
          ver_relatorios: boolean | null
        }
        Insert: {
          approved?: boolean | null
          ativo?: boolean | null
          avatar_url?: string | null
          chatwoot_agent_id?: number | null
          created_at?: string | null
          criar_card?: boolean | null
          deletar_card?: boolean | null
          edit_etapas?: boolean | null
          edit_funil?: boolean | null
          editar_card?: boolean | null
          email: string
          gerenciar_usuarios?: boolean | null
          id?: string
          mover_etapa?: boolean | null
          nome?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          ver_cards_outros?: boolean | null
          ver_relatorios?: boolean | null
        }
        Update: {
          approved?: boolean | null
          ativo?: boolean | null
          avatar_url?: string | null
          chatwoot_agent_id?: number | null
          created_at?: string | null
          criar_card?: boolean | null
          deletar_card?: boolean | null
          edit_etapas?: boolean | null
          edit_funil?: boolean | null
          editar_card?: boolean | null
          email?: string
          gerenciar_usuarios?: boolean | null
          id?: string
          mover_etapa?: boolean | null
          nome?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          ver_cards_outros?: boolean | null
          ver_relatorios?: boolean | null
        }
        Relationships: []
      }
      webhook_config: {
        Row: {
          acao: string
          ativo: boolean
          config_adicional: Json | null
          created_at: string
          etapa_destino: string | null
          etapa_origem: string | null
          evento_chatwoot: string
          funil_id: string | null
          headers_customizados: Json | null
          id: string
          nome: string
          updated_at: string
          url_externa: string | null
        }
        Insert: {
          acao: string
          ativo?: boolean
          config_adicional?: Json | null
          created_at?: string
          etapa_destino?: string | null
          etapa_origem?: string | null
          evento_chatwoot: string
          funil_id?: string | null
          headers_customizados?: Json | null
          id?: string
          nome: string
          updated_at?: string
          url_externa?: string | null
        }
        Update: {
          acao?: string
          ativo?: boolean
          config_adicional?: Json | null
          created_at?: string
          etapa_destino?: string | null
          etapa_origem?: string | null
          evento_chatwoot?: string
          funil_id?: string | null
          headers_customizados?: Json | null
          id?: string
          nome?: string
          updated_at?: string
          url_externa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_config_etapa_destino_fkey"
            columns: ["etapa_destino"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_config_etapa_origem_fkey"
            columns: ["etapa_origem"]
            isOneToOne: false
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_config_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_sync_logs: {
        Row: {
          card_id: string | null
          conversation_id: number | null
          created_at: string
          error_message: string | null
          event_type: string | null
          id: string
          latency_ms: number | null
          payload: Json | null
          status: string
          sync_type: string
        }
        Insert: {
          card_id?: string | null
          conversation_id?: number | null
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          latency_ms?: number | null
          payload?: Json | null
          status: string
          sync_type: string
        }
        Update: {
          card_id?: string | null
          conversation_id?: number | null
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          latency_ms?: number | null
          payload?: Json | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_sync_logs_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks_config: {
        Row: {
          active: boolean | null
          created_at: string | null
          events: string[] | null
          id: string
          inbox_path: string
          name: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          events?: string[] | null
          id?: string
          inbox_path: string
          name: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          events?: string[] | null
          id?: string
          inbox_path?: string
          name?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_funil: {
        Args: { _funil_id: string; _require_edit?: boolean; _user_id: string }
        Returns: boolean
      }
      get_user_role: { Args: { _user_email: string }; Returns: string }
      has_crm_role: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      proximo_dia_util: { Args: { data_base?: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "manager" | "agent" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "agent", "viewer"],
    },
  },
} as const
