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
      accounts_payable: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          description: string | null
          due_date: string
          id: string
          metadata: Json
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          status: string
          vendor: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string
          description?: string | null
          due_date: string
          id?: string
          metadata?: Json
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          vendor: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string
          id?: string
          metadata?: Json
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          vendor?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_public: boolean
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_public?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_public?: boolean
        }
        Relationships: []
      }
      chat_message_attachments: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          message_id: string
          mime_type: string | null
          object_path: string
          size_bytes: number | null
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id?: string
          message_id: string
          mime_type?: string | null
          object_path: string
          size_bytes?: number | null
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          message_id?: string
          mime_type?: string | null
          object_path?: string
          size_bytes?: number | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          kind: string
          metadata: Json
          sender_id: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          sender_id: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          sender_id?: string
        }
        Relationships: []
      }
      chat_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: string
          cost_center: string | null
          created_at: string
          due_day: number | null
          expense_date: string
          id: string
          installments: number | null
          kind: Database["public"]["Enums"]["expense_kind"]
          metadata: Json
          name: string
          notes: string | null
          paid: boolean
          payment_method: string | null
          receipt_url: string | null
          recurring: boolean
          recurring_rule: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: string
          cost_center?: string | null
          created_at?: string
          due_day?: number | null
          expense_date?: string
          id?: string
          installments?: number | null
          kind: Database["public"]["Enums"]["expense_kind"]
          metadata?: Json
          name: string
          notes?: string | null
          paid?: boolean
          payment_method?: string | null
          receipt_url?: string | null
          recurring?: boolean
          recurring_rule?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: string
          cost_center?: string | null
          created_at?: string
          due_day?: number | null
          expense_date?: string
          id?: string
          installments?: number | null
          kind?: Database["public"]["Enums"]["expense_kind"]
          metadata?: Json
          name?: string
          notes?: string | null
          paid?: boolean
          payment_method?: string | null
          receipt_url?: string | null
          recurring?: boolean
          recurring_rule?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cash_balances: {
        Row: {
          account: string
          balance: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account: string
          balance?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account?: string
          balance?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_entries: {
        Row: {
          amount: string | null
          created_at: string
          entry_date: string | null
          id: string
          metadata: Json
          notes: string | null
          service: Database["public"]["Enums"]["service_key"]
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: string | null
          created_at?: string
          entry_date?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          service: Database["public"]["Enums"]["service_key"]
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: string | null
          created_at?: string
          entry_date?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          service?: Database["public"]["Enums"]["service_key"]
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_direct_conversation: {
        Args: { p_other_user_id: string }
        Returns: string
      }
      find_user_by_email: {
        Args: { p_email: string }
        Returns: { id: string; full_name: string | null; avatar_url: string | null }[]
      }
      get_or_create_public_conversation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      expense_kind: "fixed" | "variable" | "provision"
      service_key:
        | "melhores_do_ano"
        | "gestao_midias"
        | "premio_excelencia"
        | "carro_de_som"
        | "revista_factus"
        | "revista_saude"
        | "servicos_variados"
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
