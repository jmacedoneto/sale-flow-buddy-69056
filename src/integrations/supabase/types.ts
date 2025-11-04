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
      atividades_cards: {
        Row: {
          card_id: string
          chatwoot_message_id: number | null
          data_criacao: string
          descricao: string
          id: string
          privado: boolean | null
          tipo: string
        }
        Insert: {
          card_id: string
          chatwoot_message_id?: number | null
          data_criacao?: string
          descricao: string
          id?: string
          privado?: boolean | null
          tipo: string
        }
        Update: {
          card_id?: string
          chatwoot_message_id?: number | null
          data_criacao?: string
          descricao?: string
          id?: string
          privado?: boolean | null
          tipo?: string
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
      cards_conversas: {
        Row: {
          assigned_to: string | null
          chatwoot_conversa_id: number | null
          created_at: string
          data_retorno: string | null
          descricao_detalhada: string | null
          etapa_id: string | null
          funil_etapa: string | null
          funil_id: string | null
          funil_nome: string | null
          id: string
          prazo: string | null
          prioridade: string | null
          resumo: string | null
          resumo_comercial: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          chatwoot_conversa_id?: number | null
          created_at?: string
          data_retorno?: string | null
          descricao_detalhada?: string | null
          etapa_id?: string | null
          funil_etapa?: string | null
          funil_id?: string | null
          funil_nome?: string | null
          id?: string
          prazo?: string | null
          prioridade?: string | null
          resumo?: string | null
          resumo_comercial?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          chatwoot_conversa_id?: number | null
          created_at?: string
          data_retorno?: string | null
          descricao_detalhada?: string | null
          etapa_id?: string | null
          funil_etapa?: string | null
          funil_id?: string | null
          funil_nome?: string | null
          id?: string
          prazo?: string | null
          prioridade?: string | null
          resumo?: string | null
          resumo_comercial?: string | null
          titulo?: string
          updated_at?: string
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
            foreignKeyName: "cards_conversas_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas: {
        Row: {
          created_at: string
          funil_id: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          funil_id: string
          id?: string
          nome: string
          ordem: number
          updated_at?: string
        }
        Update: {
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
      users_crm: {
        Row: {
          approved: boolean | null
          ativo: boolean | null
          created_at: string | null
          criar_card: boolean | null
          deletar_card: boolean | null
          edit_etapas: boolean | null
          edit_funil: boolean | null
          editar_card: boolean | null
          email: string
          id: string
          nome: string | null
          role: string | null
          updated_at: string | null
          ver_relatorios: boolean | null
        }
        Insert: {
          approved?: boolean | null
          ativo?: boolean | null
          created_at?: string | null
          criar_card?: boolean | null
          deletar_card?: boolean | null
          edit_etapas?: boolean | null
          edit_funil?: boolean | null
          editar_card?: boolean | null
          email: string
          id?: string
          nome?: string | null
          role?: string | null
          updated_at?: string | null
          ver_relatorios?: boolean | null
        }
        Update: {
          approved?: boolean | null
          ativo?: boolean | null
          created_at?: string | null
          criar_card?: boolean | null
          deletar_card?: boolean | null
          edit_etapas?: boolean | null
          edit_funil?: boolean | null
          editar_card?: boolean | null
          email?: string
          id?: string
          nome?: string | null
          role?: string | null
          updated_at?: string | null
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
          evento_chatwoot: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          acao: string
          ativo?: boolean
          config_adicional?: Json | null
          created_at?: string
          evento_chatwoot: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          acao?: string
          ativo?: boolean
          config_adicional?: Json | null
          created_at?: string
          evento_chatwoot?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
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
      get_user_role: { Args: { _user_email: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
