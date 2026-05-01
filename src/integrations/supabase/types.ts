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
      categories: {
        Row: {
          created_at: string
          game_id: string
          id: string
          max_picks: number
          name: string
          order_index: number | null
          short_name: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          max_picks?: number
          name: string
          order_index?: number | null
          short_name?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          max_picks?: number
          name?: string
          order_index?: number | null
          short_name?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      category_riders: {
        Row: {
          category_id: string
          created_at: string
          id: string
          rider_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          rider_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_riders_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_riders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          game_id: string
          id: string
          subpoule_id: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          game_id: string
          id?: string
          subpoule_id?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          game_id?: string
          id?: string
          subpoule_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      entries: {
        Row: {
          created_at: string
          game_id: string
          id: string
          status: string
          submitted_at: string | null
          team_name: string | null
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          status?: string
          submitted_at?: string | null
          team_name?: string | null
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          status?: string
          submitted_at?: string | null
          team_name?: string | null
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      entry_jokers: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          rider_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          rider_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_jokers_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "admin_entries_overview"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "entry_jokers_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_jokers_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_picks: {
        Row: {
          category_id: string
          created_at: string
          entry_id: string
          id: string
          rider_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          entry_id: string
          id?: string
          rider_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          entry_id?: string
          id?: string
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_picks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_picks_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "admin_entries_overview"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "entry_picks_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_picks_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_predictions: {
        Row: {
          classification: string
          created_at: string
          entry_id: string
          id: string
          position: number
          rider_id: string
        }
        Insert: {
          classification: string
          created_at?: string
          entry_id: string
          id?: string
          position: number
          rider_id: string
        }
        Update: {
          classification?: string
          created_at?: string
          entry_id?: string
          id?: string
          position?: number
          rider_id?: string
        }
        Relationships: []
      }
      game_riders: {
        Row: {
          category_id: string | null
          created_at: string
          game_id: string
          id: string
          rider_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          game_id: string
          id?: string
          rider_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          game_id?: string
          id?: string
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_riders_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_riders_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_riders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          deadline: string | null
          end_date: string | null
          game_type: string | null
          id: string
          name: string
          slug: string | null
          start_date: string | null
          starts_at: string | null
          status: string
          year: number
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          end_date?: string | null
          game_type?: string | null
          id?: string
          name: string
          slug?: string | null
          start_date?: string | null
          starts_at?: string | null
          status?: string
          year: number
        }
        Update: {
          created_at?: string
          deadline?: string | null
          end_date?: string | null
          game_type?: string | null
          id?: string
          name?: string
          slug?: string | null
          start_date?: string | null
          starts_at?: string | null
          status?: string
          year?: number
        }
        Relationships: []
      }
      points_schema: {
        Row: {
          classification: string
          game_id: string
          id: string
          points: number
          position: number
        }
        Insert: {
          classification: string
          game_id: string
          id?: string
          points: number
          position: number
        }
        Update: {
          classification?: string
          game_id?: string
          id?: string
          points?: number
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "points_schema_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_admin: boolean
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          is_admin?: boolean
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_admin?: boolean
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "admin_user_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      riders: {
        Row: {
          country_code: string | null
          created_at: string
          game_id: string | null
          id: string
          name: string
          start_number: number | null
          team: string | null
          team_id: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          name: string
          start_number?: number | null
          team?: string | null
          team_id?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          name?: string
          start_number?: number | null
          team?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "riders_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_points: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          points: number
          stage_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          points?: number
          stage_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          points?: number
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_points_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "admin_entries_overview"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "stage_points_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_points_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_results: {
        Row: {
          created_at: string
          did_finish: boolean | null
          finish_position: number | null
          game_id: string | null
          gc_position: number | null
          id: string
          mountain_position: number | null
          points_position: number | null
          rider_id: string
          rider_name: string | null
          stage_id: string
          start_number: number | null
          youth_position: number | null
        }
        Insert: {
          created_at?: string
          did_finish?: boolean | null
          finish_position?: number | null
          game_id?: string | null
          gc_position?: number | null
          id?: string
          mountain_position?: number | null
          points_position?: number | null
          rider_id: string
          rider_name?: string | null
          stage_id: string
          start_number?: number | null
          youth_position?: number | null
        }
        Update: {
          created_at?: string
          did_finish?: boolean | null
          finish_position?: number | null
          game_id?: string | null
          gc_position?: number | null
          id?: string
          mountain_position?: number | null
          points_position?: number | null
          rider_id?: string
          rider_name?: string | null
          stage_id?: string
          start_number?: number | null
          youth_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_results_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_results_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_results_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          created_at: string
          date: string | null
          game_id: string
          id: string
          name: string | null
          stage_number: number
          stage_type: Database["public"]["Enums"]["stage_type_enum"]
          status: string | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          game_id: string
          id?: string
          name?: string | null
          stage_number: number
          stage_type?: Database["public"]["Enums"]["stage_type_enum"]
          status?: string | null
        }
        Update: {
          created_at?: string
          date?: string | null
          game_id?: string
          id?: string
          name?: string | null
          stage_number?: number
          stage_type?: Database["public"]["Enums"]["stage_type_enum"]
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      startlists: {
        Row: {
          game_id: string
          id: string
          imported_at: string
          raw: Json | null
          source: string | null
        }
        Insert: {
          game_id: string
          id?: string
          imported_at?: string
          raw?: Json | null
          source?: string | null
        }
        Update: {
          game_id?: string
          id?: string
          imported_at?: string
          raw?: Json | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "startlists_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      subpoule_members: {
        Row: {
          id: string
          joined_at: string
          subpoule_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          subpoule_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          subpoule_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subpoule_members_subpoule_id_fkey"
            columns: ["subpoule_id"]
            isOneToOne: false
            referencedRelation: "subpoules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subpoule_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subpoules: {
        Row: {
          code: string
          created_at: string
          game_id: string
          id: string
          name: string
          owner_user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          game_id: string
          id?: string
          name: string
          owner_user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          game_id?: string
          id?: string
          name?: string
          owner_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subpoules_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subpoules_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      teams: {
        Row: {
          country_code: string | null
          created_at: string
          game_id: string | null
          id: string
          name: string
          short_name: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          name: string
          short_name?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          name?: string
          short_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      total_points: {
        Row: {
          entry_id: string
          total_points: number
          updated_at: string
        }
        Insert: {
          entry_id: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          entry_id?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "total_points_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "admin_entries_overview"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "total_points_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      admin_entries_overview: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          entry_id: string | null
          entry_status: string | null
          game_id: string | null
          jokers_count: number | null
          picks_count: number | null
          submitted_at: string | null
          team_name: string | null
          total_points: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_overview"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_user_overview: {
        Row: {
          created_at: string | null
          email: string | null
          is_admin: boolean | null
          teams_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_admin_role: {
        Args: { p_make_admin: boolean; p_user_id: string }
        Returns: undefined
      }
      calculate_stage_scores: {
        Args: { p_stage_id: string }
        Returns: undefined
      }
      full_recalculation: { Args: { p_game_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      save_entry_jokers: {
        Args: { p_entry_id: string; p_rider_ids: string[] }
        Returns: undefined
      }
      save_entry_pick: {
        Args: { p_category_id: string; p_entry_id: string; p_rider_id: string }
        Returns: undefined
      }
      save_entry_predictions: {
        Args: { p_entry_id: string; p_predictions: Json }
        Returns: undefined
      }
      seed_default_points_schema: {
        Args: { p_game_id: string }
        Returns: undefined
      }
      submit_entry: { Args: { p_entry_id: string }; Returns: undefined }
      update_total_ranking: { Args: { p_game_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "user" | "admin"
      stage_type_enum:
        | "vlak"
        | "heuvelachtig"
        | "tijdrit"
        | "bergop"
        | "ploegentijdrit"
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
      app_role: ["user", "admin"],
      stage_type_enum: [
        "vlak",
        "heuvelachtig",
        "tijdrit",
        "bergop",
        "ploegentijdrit",
      ],
    },
  },
} as const
