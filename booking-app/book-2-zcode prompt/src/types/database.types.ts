export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          balance_due_cents: number
          cancelled_reason: string | null
          client_id: string
          created_at: string | null
          date: string
          deposit_cents: number
          end_time: string
          id: string
          inspiration_photos: string[]
          notes: string | null
          policy_consented_at: string | null
          rebook_prompt_sent_at: string | null
          reminder_24h_sent_at: string | null
          reminder_2h_sent_at: string | null
          reschedule_of: string | null
          review_request_sent_at: string | null
          service_id: string
          service_tier_id: string | null
          service_total_cents: number
          start_time: string
          status: string
          stylist_id: string
          tax_cents: number
          time_range: unknown
          updated_at: string | null
        }
        Insert: {
          balance_due_cents?: number
          cancelled_reason?: string | null
          client_id: string
          created_at?: string | null
          date: string
          deposit_cents?: number
          end_time: string
          id?: string
          inspiration_photos?: string[]
          notes?: string | null
          policy_consented_at?: string | null
          rebook_prompt_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          reminder_2h_sent_at?: string | null
          reschedule_of?: string | null
          review_request_sent_at?: string | null
          service_id: string
          service_tier_id?: string | null
          service_total_cents?: number
          start_time: string
          status?: string
          stylist_id: string
          tax_cents?: number
          time_range?: unknown
          updated_at?: string | null
        }
        Update: {
          balance_due_cents?: number
          cancelled_reason?: string | null
          client_id?: string
          created_at?: string | null
          date?: string
          deposit_cents?: number
          end_time?: string
          id?: string
          inspiration_photos?: string[]
          notes?: string | null
          policy_consented_at?: string | null
          rebook_prompt_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          reminder_2h_sent_at?: string | null
          reschedule_of?: string | null
          review_request_sent_at?: string | null
          service_id?: string
          service_tier_id?: string | null
          service_total_cents?: number
          start_time?: string
          status?: string
          stylist_id?: string
          tax_cents?: number
          time_range?: unknown
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_reschedule_of_fkey"
            columns: ["reschedule_of"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_tier_id_fkey"
            columns: ["service_tier_id"]
            isOneToOne: false
            referencedRelation: "service_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_stylist_id_fkey"
            columns: ["stylist_id"]
            isOneToOne: false
            referencedRelation: "stylists"
            referencedColumns: ["id"]
          },
        ]
      }
      availability: {
        Row: {
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          stylist_id: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          stylist_id: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          stylist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_stylist_id_fkey"
            columns: ["stylist_id"]
            isOneToOne: false
            referencedRelation: "stylists"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_overrides: {
        Row: {
          date: string
          end_time: string | null
          id: string
          is_available: boolean
          reason: string | null
          start_time: string | null
          stylist_id: string
        }
        Insert: {
          date: string
          end_time?: string | null
          id?: string
          is_available?: boolean
          reason?: string | null
          start_time?: string | null
          stylist_id: string
        }
        Update: {
          date?: string
          end_time?: string | null
          id?: string
          is_available?: boolean
          reason?: string | null
          start_time?: string | null
          stylist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_overrides_stylist_id_fkey"
            columns: ["stylist_id"]
            isOneToOne: false
            referencedRelation: "stylists"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_policy: {
        Row: {
          blow_dry_fee_cents: number
          cancel_notice_hours: number
          grace_minutes: number
          late_cancel_fee_percent: number
          late_fee_cents: number
          no_show_fee_percent: number
          policy_text: string
          reschedule_notice_hours: number
          stylist_id: string
          updated_at: string | null
        }
        Insert: {
          blow_dry_fee_cents?: number
          cancel_notice_hours?: number
          grace_minutes?: number
          late_cancel_fee_percent?: number
          late_fee_cents?: number
          no_show_fee_percent?: number
          policy_text?: string
          reschedule_notice_hours?: number
          stylist_id: string
          updated_at?: string | null
        }
        Update: {
          blow_dry_fee_cents?: number
          cancel_notice_hours?: number
          grace_minutes?: number
          late_cancel_fee_percent?: number
          late_fee_cents?: number
          no_show_fee_percent?: number
          policy_text?: string
          reschedule_notice_hours?: number
          stylist_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_policy_stylist_id_fkey"
            columns: ["stylist_id"]
            isOneToOne: true
            referencedRelation: "stylists"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          allergies: string | null
          created_at: string | null
          email: string
          id: string
          lifetime_spend: number
          name: string
          notes: string | null
          phone: string | null
          preferences: string | null
          stylist_id: string
          tags: string[]
          user_id: string | null
        }
        Insert: {
          allergies?: string | null
          created_at?: string | null
          email: string
          id?: string
          lifetime_spend?: number
          name: string
          notes?: string | null
          phone?: string | null
          preferences?: string | null
          stylist_id: string
          tags?: string[]
          user_id?: string | null
        }
        Update: {
          allergies?: string | null
          created_at?: string | null
          email?: string
          id?: string
          lifetime_spend?: number
          name?: string
          notes?: string | null
          phone?: string | null
          preferences?: string | null
          stylist_id?: string
          tags?: string[]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_stylist_id_fkey"
            columns: ["stylist_id"]
            isOneToOne: false
            referencedRelation: "stylists"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_responses: {
        Row: {
          answer: string
          appointment_id: string
          id: string
          question: string
        }
        Insert: {
          answer: string
          appointment_id: string
          id?: string
          question: string
        }
        Update: {
          answer?: string
          appointment_id?: string
          id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_responses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          appointment_id: string | null
          content: string
          created_at: string | null
          id: string
          read: boolean
          receiver_id: string | null
          sender_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          read?: boolean
          receiver_id?: string | null
          sender_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          read?: boolean
          receiver_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string | null
          currency: string
          id: string
          status: string
          stripe_payment_id: string | null
          stripe_refund_id: string | null
          type: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          status?: string
          stripe_payment_id?: string | null
          stripe_refund_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          status?: string
          stripe_payment_id?: string | null
          stripe_refund_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          created_at: string | null
          description: string | null
          hair_length: string | null
          id: string
          image_url: string
          service_category: string | null
          sort_order: number
          stylist_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          hair_length?: string | null
          id?: string
          image_url: string
          service_category?: string | null
          sort_order?: number
          stylist_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          hair_length?: string | null
          id?: string
          image_url?: string
          service_category?: string | null
          sort_order?: number
          stylist_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_stylist_id_fkey"
            columns: ["stylist_id"]
            isOneToOne: false
            referencedRelation: "stylists"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_stripe_events: {
        Row: {
          event_id: string
          processed_at: string | null
        }
        Insert: {
          event_id: string
          processed_at?: string | null
        }
        Update: {
          event_id?: string
          processed_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          appointment_id: string | null
          author_name: string
          client_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          is_published: boolean
          rating: number
          stylist_id: string
          stylist_response: string | null
        }
        Insert: {
          appointment_id?: string | null
          author_name?: string
          client_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean
          rating: number
          stylist_id: string
          stylist_response?: string | null
        }
        Update: {
          appointment_id?: string | null
          author_name?: string
          client_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean
          rating?: number
          stylist_id?: string
          stylist_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_stylist_id_fkey"
            columns: ["stylist_id"]
            isOneToOne: false
            referencedRelation: "stylists"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          sort_order: number
          stylist_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number
          stylist_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number
          stylist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_stylist_id_fkey"
            columns: ["stylist_id"]
            isOneToOne: false
            referencedRelation: "stylists"
            referencedColumns: ["id"]
          },
        ]
      }
      service_tiers: {
        Row: {
          description: string | null
          duration_addon: number
          id: string
          kind: string
          name: string
          price_addon: number
          service_id: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          duration_addon?: number
          id?: string
          kind?: string
          name: string
          price_addon?: number
          service_id: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          duration_addon?: number
          id?: string
          kind?: string
          name?: string
          price_addon?: number
          service_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_tiers_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number
          buffer_minutes: number
          care_notes: string | null
          category: string
          created_at: string | null
          deposit_flat_cents: number | null
          deposit_percent: number
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          images: string[]
          is_active: boolean
          name: string
          prep_notes: string | null
          requires_deposit: boolean
          sort_order: number
          stylist_id: string
          tax_rate: number
        }
        Insert: {
          base_price: number
          buffer_minutes?: number
          care_notes?: string | null
          category: string
          created_at?: string | null
          deposit_flat_cents?: number | null
          deposit_percent?: number
          description?: string | null
          duration_minutes: number
          id?: string
          image_url?: string | null
          images?: string[]
          is_active?: boolean
          name: string
          prep_notes?: string | null
          requires_deposit?: boolean
          sort_order?: number
          stylist_id: string
          tax_rate?: number
        }
        Update: {
          base_price?: number
          buffer_minutes?: number
          care_notes?: string | null
          category?: string
          created_at?: string | null
          deposit_flat_cents?: number | null
          deposit_percent?: number
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          images?: string[]
          is_active?: boolean
          name?: string
          prep_notes?: string | null
          requires_deposit?: boolean
          sort_order?: number
          stylist_id?: string
          tax_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_stylist_id_fkey"
            columns: ["stylist_id"]
            isOneToOne: false
            referencedRelation: "stylists"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_holds: {
        Row: {
          balance_due_cents: number
          client_email: string
          client_name: string
          client_phone: string | null
          created_at: string | null
          date: string
          deposit_cents: number
          end_time: string
          expires_at: string
          id: string
          inspiration_photos: string[]
          intake: Json
          notes: string | null
          policy_consented: boolean
          service_id: string
          service_tier_id: string | null
          service_total_cents: number
          start_time: string
          stripe_payment_intent_id: string | null
          stylist_id: string
          tax_cents: number
          time_range: unknown
        }
        Insert: {
          balance_due_cents?: number
          client_email: string
          client_name?: string
          client_phone?: string | null
          created_at?: string | null
          date: string
          deposit_cents?: number
          end_time: string
          expires_at: string
          id?: string
          inspiration_photos?: string[]
          intake?: Json
          notes?: string | null
          policy_consented?: boolean
          service_id: string
          service_tier_id?: string | null
          service_total_cents?: number
          start_time: string
          stripe_payment_intent_id?: string | null
          stylist_id: string
          tax_cents?: number
          time_range?: unknown
        }
        Update: {
          balance_due_cents?: number
          client_email?: string
          client_name?: string
          client_phone?: string | null
          created_at?: string | null
          date?: string
          deposit_cents?: number
          end_time?: string
          expires_at?: string
          id?: string
          inspiration_photos?: string[]
          intake?: Json
          notes?: string | null
          policy_consented?: boolean
          service_id?: string
          service_tier_id?: string | null
          service_total_cents?: number
          start_time?: string
          stripe_payment_intent_id?: string | null
          stylist_id?: string
          tax_cents?: number
          time_range?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "slot_holds_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_holds_service_tier_id_fkey"
            columns: ["service_tier_id"]
            isOneToOne: false
            referencedRelation: "service_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_holds_stylist_id_fkey"
            columns: ["stylist_id"]
            isOneToOne: false
            referencedRelation: "stylists"
            referencedColumns: ["id"]
          },
        ]
      }
      stylists: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string
          id: string
          instagram: string | null
          name: string
          phone: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email: string
          id?: string
          instagram?: string | null
          name: string
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string
          id?: string
          instagram?: string | null
          name?: string
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      waitlist_entries: {
        Row: {
          client_email: string
          client_name: string
          client_phone: string | null
          created_at: string | null
          desired_date: string | null
          flexibility: string
          id: string
          notified_at: string | null
          service_id: string | null
          service_tier_id: string | null
          status: string
          stylist_id: string
        }
        Insert: {
          client_email: string
          client_name: string
          client_phone?: string | null
          created_at?: string | null
          desired_date?: string | null
          flexibility?: string
          id?: string
          notified_at?: string | null
          service_id?: string | null
          service_tier_id?: string | null
          status?: string
          stylist_id: string
        }
        Update: {
          client_email?: string
          client_name?: string
          client_phone?: string | null
          created_at?: string | null
          desired_date?: string | null
          flexibility?: string
          id?: string
          notified_at?: string | null
          service_id?: string | null
          service_tier_id?: string | null
          status?: string
          stylist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_service_tier_id_fkey"
            columns: ["service_tier_id"]
            isOneToOne: false
            referencedRelation: "service_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_stylist_id_fkey"
            columns: ["stylist_id"]
            isOneToOne: false
            referencedRelation: "stylists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_holds: { Args: never; Returns: number }
      confirm_booking_from_hold: {
        Args: { p_hold_id: string; p_payment_intent: string }
        Returns: string
      }
      current_stylist_id: { Args: never; Returns: string }
      hold_slot: {
        Args: {
          p_client_email: string
          p_client_name: string
          p_client_phone: string
          p_date: string
          p_intake: Json
          p_notes: string
          p_photos: string[]
          p_policy_consented: boolean
          p_service: string
          p_start: string
          p_stylist: string
          p_tier: string
          p_ttl_minutes: number
        }
        Returns: {
          balance_due_cents: number
          client_email: string
          client_name: string
          client_phone: string | null
          created_at: string | null
          date: string
          deposit_cents: number
          end_time: string
          expires_at: string
          id: string
          inspiration_photos: string[]
          intake: Json
          notes: string | null
          policy_consented: boolean
          service_id: string
          service_tier_id: string | null
          service_total_cents: number
          start_time: string
          stripe_payment_intent_id: string | null
          stylist_id: string
          tax_cents: number
          time_range: unknown
        }
        SetofOptions: {
          from: "*"
          to: "slot_holds"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_admin: { Args: never; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

