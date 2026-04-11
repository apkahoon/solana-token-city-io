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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      boosts: {
        Row: {
          amount: number
          created_at: string
          expires_at: string
          id: string
          token_id: string
          user_wallet: string
        }
        Insert: {
          amount: number
          created_at?: string
          expires_at: string
          id?: string
          token_id: string
          user_wallet: string
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string
          id?: string
          token_id?: string
          user_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "boosts_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidity_pools: {
        Row: {
          created_at: string
          creator_wallet: string
          id: string
          liquidity_locked: boolean
          pool_address: string
          sol_amount: number
          token_amount: number
          token_id: string
        }
        Insert: {
          created_at?: string
          creator_wallet: string
          id?: string
          liquidity_locked?: boolean
          pool_address: string
          sol_amount?: number
          token_amount?: number
          token_id: string
        }
        Update: {
          created_at?: string
          creator_wallet?: string
          id?: string
          liquidity_locked?: boolean
          pool_address?: string
          sol_amount?: number
          token_amount?: number
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liquidity_pools_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      tokens: {
        Row: {
          created_at: string
          creator_wallet: string
          decimals: number
          description: string | null
          id: string
          is_featured: boolean
          is_flagged: boolean
          liquidity_added: boolean
          logo_url: string | null
          mint_address: string | null
          name: string
          pool_address: string | null
          supply: number
          symbol: string
          telegram: string | null
          twitter: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          creator_wallet: string
          decimals?: number
          description?: string | null
          id?: string
          is_featured?: boolean
          is_flagged?: boolean
          liquidity_added?: boolean
          logo_url?: string | null
          mint_address?: string | null
          name: string
          pool_address?: string | null
          supply: number
          symbol: string
          telegram?: string | null
          twitter?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          creator_wallet?: string
          decimals?: number
          description?: string | null
          id?: string
          is_featured?: boolean
          is_flagged?: boolean
          liquidity_added?: boolean
          logo_url?: string | null
          mint_address?: string | null
          name?: string
          pool_address?: string | null
          supply?: number
          symbol?: string
          telegram?: string | null
          twitter?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          status: string
          token_id: string | null
          tx_hash: string | null
          type: Database["public"]["Enums"]["tx_type"]
          user_wallet: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          status?: string
          token_id?: string | null
          tx_hash?: string | null
          type: Database["public"]["Enums"]["tx_type"]
          user_wallet: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          status?: string
          token_id?: string | null
          tx_hash?: string | null
          type?: Database["public"]["Enums"]["tx_type"]
          user_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_stats: {
        Row: {
          buys_24h: number
          id: string
          liquidity: number
          price: number
          price_change_24h: number
          score: number
          token_id: string
          updated_at: string
          volume_24h: number
        }
        Insert: {
          buys_24h?: number
          id?: string
          liquidity?: number
          price?: number
          price_change_24h?: number
          score?: number
          token_id: string
          updated_at?: string
          volume_24h?: number
        }
        Update: {
          buys_24h?: number
          id?: string
          liquidity?: number
          price?: number
          price_change_24h?: number
          score?: number
          token_id?: string
          updated_at?: string
          volume_24h?: number
        }
        Relationships: [
          {
            foreignKeyName: "trending_stats_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      tx_type: "CREATE_TOKEN" | "ADD_LIQUIDITY" | "BOOST" | "SWAP" | "BURN"
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
      app_role: ["admin", "moderator", "user"],
      tx_type: ["CREATE_TOKEN", "ADD_LIQUIDITY", "BOOST", "SWAP", "BURN"],
    },
  },
} as const
