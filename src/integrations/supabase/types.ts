export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string;
          description: string;
          icon: string;
          id: string;
          sort_order: number;
          title: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          icon?: string;
          id: string;
          sort_order?: number;
          title: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          icon?: string;
          id?: string;
          sort_order?: number;
          title?: string;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: {
          created_at: string;
          event: string;
          id: number;
          meta: Json | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          event: string;
          id?: number;
          meta?: Json | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          event?: string;
          id?: number;
          meta?: Json | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      billing_history: {
        Row: {
          amount_cents: number;
          billing_interval: Database["public"]["Enums"]["billing_interval_kind"];
          created_at: string;
          currency: string;
          id: string;
          method: Database["public"]["Enums"]["payment_method_kind"] | null;
          period_end: string;
          period_start: string;
          plan: string;
          submission_id: string | null;
          user_id: string;
        };
        Insert: {
          amount_cents: number;
          billing_interval: Database["public"]["Enums"]["billing_interval_kind"];
          created_at?: string;
          currency?: string;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method_kind"] | null;
          period_end: string;
          period_start: string;
          plan: string;
          submission_id?: string | null;
          user_id: string;
        };
        Update: {
          amount_cents?: number;
          billing_interval?: Database["public"]["Enums"]["billing_interval_kind"];
          created_at?: string;
          currency?: string;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method_kind"] | null;
          period_end?: string;
          period_start?: string;
          plan?: string;
          submission_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "billing_history_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "payment_submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      email_send_log: {
        Row: {
          created_at: string;
          error_message: string | null;
          id: string;
          message_id: string | null;
          metadata: Json | null;
          recipient_email: string;
          status: string;
          template_name: string;
        };
        Insert: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          message_id?: string | null;
          metadata?: Json | null;
          recipient_email: string;
          status: string;
          template_name: string;
        };
        Update: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          message_id?: string | null;
          metadata?: Json | null;
          recipient_email?: string;
          status?: string;
          template_name?: string;
        };
        Relationships: [];
      };
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number;
          batch_size: number;
          id: number;
          retry_after_until: string | null;
          send_delay_ms: number;
          transactional_email_ttl_minutes: number;
          updated_at: string;
        };
        Insert: {
          auth_email_ttl_minutes?: number;
          batch_size?: number;
          id?: number;
          retry_after_until?: string | null;
          send_delay_ms?: number;
          transactional_email_ttl_minutes?: number;
          updated_at?: string;
        };
        Update: {
          auth_email_ttl_minutes?: number;
          batch_size?: number;
          id?: number;
          retry_after_until?: string | null;
          send_delay_ms?: number;
          transactional_email_ttl_minutes?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_unsubscribe_tokens: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          token: string;
          used_at: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          token: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          token?: string;
          used_at?: string | null;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          breathing_tip: string | null;
          common_mistakes: string[];
          created_at: string;
          difficulty: Database["public"]["Enums"]["difficulty_level"];
          enabled: boolean;
          equipment: string | null;
          id: string;
          image_url: string | null;
          instructions: string[];
          muscle_group: string;
          name: string;
          safety_tip: string | null;
          updated_at: string;
        };
        Insert: {
          breathing_tip?: string | null;
          common_mistakes?: string[];
          created_at?: string;
          difficulty: Database["public"]["Enums"]["difficulty_level"];
          enabled?: boolean;
          equipment?: string | null;
          id?: string;
          image_url?: string | null;
          instructions?: string[];
          muscle_group: string;
          name: string;
          safety_tip?: string | null;
          updated_at?: string;
        };
        Update: {
          breathing_tip?: string | null;
          common_mistakes?: string[];
          created_at?: string;
          difficulty?: Database["public"]["Enums"]["difficulty_level"];
          enabled?: boolean;
          equipment?: string | null;
          id?: string;
          image_url?: string | null;
          instructions?: string[];
          muscle_group?: string;
          name?: string;
          safety_tip?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      foods: {
        Row: {
          budget_level: Database["public"]["Enums"]["budget_level"];
          calories_per_100g: number;
          carbs_per_100g: number;
          category: Database["public"]["Enums"]["meal_category"];
          country: string;
          created_at: string;
          enabled: boolean;
          fat_per_100g: number;
          fiber_per_100g: number;
          id: string;
          name: string;
          protein_per_100g: number;
          updated_at: string;
        };
        Insert: {
          budget_level: Database["public"]["Enums"]["budget_level"];
          calories_per_100g: number;
          carbs_per_100g?: number;
          category: Database["public"]["Enums"]["meal_category"];
          country?: string;
          created_at?: string;
          enabled?: boolean;
          fat_per_100g?: number;
          fiber_per_100g?: number;
          id?: string;
          name: string;
          protein_per_100g: number;
          updated_at?: string;
        };
        Update: {
          budget_level?: Database["public"]["Enums"]["budget_level"];
          calories_per_100g?: number;
          carbs_per_100g?: number;
          category?: Database["public"]["Enums"]["meal_category"];
          country?: string;
          created_at?: string;
          enabled?: boolean;
          fat_per_100g?: number;
          fiber_per_100g?: number;
          id?: string;
          name?: string;
          protein_per_100g?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      food_log_entries: {
        Row: {
          calories: number;
          carbs: number;
          created_at: string;
          fat: number;
          food_id: string | null;
          grams: number;
          id: string;
          logged_date: string;
          meal_category: Database["public"]["Enums"]["meal_category"];
          name: string;
          protein: number;
          user_id: string;
        };
        Insert: {
          calories: number;
          carbs: number;
          created_at?: string;
          fat: number;
          food_id?: string | null;
          grams: number;
          id?: string;
          logged_date: string;
          meal_category: Database["public"]["Enums"]["meal_category"];
          name: string;
          protein: number;
          user_id: string;
        };
        Update: {
          calories?: number;
          carbs?: number;
          created_at?: string;
          fat?: number;
          food_id?: string | null;
          grams?: number;
          id?: string;
          logged_date?: string;
          meal_category?: Database["public"]["Enums"]["meal_category"];
          name?: string;
          protein?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      food_favorites: {
        Row: {
          created_at: string;
          food_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          food_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          food_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      meal_plans: {
        Row: {
          calories_target: number;
          carbs_target: number | null;
          created_at: string;
          fat_target: number | null;
          id: string;
          is_active: boolean;
          meals: Json;
          protein_target: number;
          user_id: string;
        };
        Insert: {
          calories_target: number;
          carbs_target?: number | null;
          created_at?: string;
          fat_target?: number | null;
          id?: string;
          is_active?: boolean;
          meals: Json;
          protein_target: number;
          user_id: string;
        };
        Update: {
          calories_target?: number;
          carbs_target?: number | null;
          created_at?: string;
          fat_target?: number | null;
          id?: string;
          is_active?: boolean;
          meals?: Json;
          protein_target?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          category: string;
          created_at: string;
          id: string;
          link: string | null;
          read_at: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          category: string;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      payment_approvals: {
        Row: {
          action: string;
          actor_id: string;
          actor_role: string;
          created_at: string;
          id: string;
          notes: string | null;
          submission_id: string;
        };
        Insert: {
          action: string;
          actor_id: string;
          actor_role: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          submission_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string;
          actor_role?: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          submission_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_approvals_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "payment_submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_settings: {
        Row: {
          annual_price_cents: number;
          bank_account_holder: string | null;
          bank_account_number: string | null;
          bank_enabled: boolean;
          bank_instructions: string | null;
          bank_name: string | null;
          bank_va_number: string | null;
          created_at: string;
          currency: string;
          id: string;
          ls_annual_checkout_url: string | null;
          ls_annual_variant_id: string | null;
          ls_enabled: boolean;
          ls_monthly_checkout_url: string | null;
          ls_monthly_variant_id: string | null;
          ls_store_id: string | null;
          monthly_price_cents: number;
          payment_instructions: string | null;
          paypal_email: string | null;
          paypal_instructions: string | null;
          qris_image_path: string | null;
          qris_instructions: string | null;
          singleton: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          annual_price_cents?: number;
          bank_account_holder?: string | null;
          bank_account_number?: string | null;
          bank_enabled?: boolean;
          bank_instructions?: string | null;
          bank_name?: string | null;
          bank_va_number?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          ls_annual_checkout_url?: string | null;
          ls_annual_variant_id?: string | null;
          ls_enabled?: boolean;
          ls_monthly_checkout_url?: string | null;
          ls_monthly_variant_id?: string | null;
          ls_store_id?: string | null;
          monthly_price_cents?: number;
          payment_instructions?: string | null;
          paypal_email?: string | null;
          paypal_instructions?: string | null;
          qris_image_path?: string | null;
          qris_instructions?: string | null;
          singleton?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          annual_price_cents?: number;
          bank_account_holder?: string | null;
          bank_account_number?: string | null;
          bank_enabled?: boolean;
          bank_instructions?: string | null;
          bank_name?: string | null;
          bank_va_number?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          ls_annual_checkout_url?: string | null;
          ls_annual_variant_id?: string | null;
          ls_enabled?: boolean;
          ls_monthly_checkout_url?: string | null;
          ls_monthly_variant_id?: string | null;
          ls_store_id?: string | null;
          monthly_price_cents?: number;
          payment_instructions?: string | null;
          paypal_email?: string | null;
          paypal_instructions?: string | null;
          qris_image_path?: string | null;
          qris_instructions?: string | null;
          singleton?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      payment_submissions: {
        Row: {
          amount_cents: number;
          billing_interval: Database["public"]["Enums"]["billing_interval_kind"];
          created_at: string;
          currency: string;
          id: string;
          method: Database["public"]["Enums"]["payment_method_kind"];
          payer_email: string | null;
          paypal_transaction_id: string | null;
          plan: string;
          proof_path: string | null;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["payment_submission_status"];
          submitted_at: string;
          transaction_ref: string | null;
          updated_at: string;
          user_id: string;
          user_notes: string | null;
        };
        Insert: {
          amount_cents: number;
          billing_interval: Database["public"]["Enums"]["billing_interval_kind"];
          created_at?: string;
          currency?: string;
          id?: string;
          method: Database["public"]["Enums"]["payment_method_kind"];
          payer_email?: string | null;
          paypal_transaction_id?: string | null;
          plan?: string;
          proof_path?: string | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["payment_submission_status"];
          submitted_at?: string;
          transaction_ref?: string | null;
          updated_at?: string;
          user_id: string;
          user_notes?: string | null;
        };
        Update: {
          amount_cents?: number;
          billing_interval?: Database["public"]["Enums"]["billing_interval_kind"];
          created_at?: string;
          currency?: string;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method_kind"];
          payer_email?: string | null;
          paypal_transaction_id?: string | null;
          plan?: string;
          proof_path?: string | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["payment_submission_status"];
          submitted_at?: string;
          transaction_ref?: string | null;
          updated_at?: string;
          user_id?: string;
          user_notes?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          activity_level: Database["public"]["Enums"]["activity_level"] | null;
          age: number | null;
          available_equipment: string[];
          avatar_url: string | null;
          banned: boolean;
          budget_level: Database["public"]["Enums"]["budget_level"] | null;
          country: string | null;
          created_at: string;
          email: string | null;
          experience_level: string | null;
          gender: Database["public"]["Enums"]["gender"] | null;
          goal: Database["public"]["Enums"]["fitness_goal"] | null;
          height_cm: number | null;
          id: string;
          last_workout_date: string | null;
          name: string | null;
          needs_plan_regeneration: boolean;
          onboarded: boolean;
          streak_current: number;
          streak_longest: number;
          updated_at: string;
          weight_kg: number | null;
          workout_location: string;
        };
        Insert: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null;
          age?: number | null;
          available_equipment?: string[];
          avatar_url?: string | null;
          banned?: boolean;
          budget_level?: Database["public"]["Enums"]["budget_level"] | null;
          country?: string | null;
          created_at?: string;
          email?: string | null;
          experience_level?: string | null;
          gender?: Database["public"]["Enums"]["gender"] | null;
          goal?: Database["public"]["Enums"]["fitness_goal"] | null;
          height_cm?: number | null;
          id: string;
          last_workout_date?: string | null;
          name?: string | null;
          needs_plan_regeneration?: boolean;
          onboarded?: boolean;
          streak_current?: number;
          streak_longest?: number;
          updated_at?: string;
          weight_kg?: number | null;
          workout_location?: string;
        };
        Update: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null;
          age?: number | null;
          available_equipment?: string[];
          avatar_url?: string | null;
          banned?: boolean;
          budget_level?: Database["public"]["Enums"]["budget_level"] | null;
          country?: string | null;
          created_at?: string;
          email?: string | null;
          experience_level?: string | null;
          gender?: Database["public"]["Enums"]["gender"] | null;
          goal?: Database["public"]["Enums"]["fitness_goal"] | null;
          height_cm?: number | null;
          id?: string;
          last_workout_date?: string | null;
          name?: string | null;
          needs_plan_regeneration?: boolean;
          onboarded?: boolean;
          streak_current?: number;
          streak_longest?: number;
          updated_at?: string;
          weight_kg?: number | null;
          workout_location?: string;
        };
        Relationships: [];
      };
      progress_entries: {
        Row: {
          arm_cm: number | null;
          body_fat_pct: number | null;
          chest_cm: number | null;
          created_at: string;
          hips_cm: number | null;
          id: string;
          neck_cm: number | null;
          note: string | null;
          recorded_at: string;
          shoulder_cm: number | null;
          thigh_cm: number | null;
          user_id: string;
          waist_cm: number | null;
          weight_kg: number;
        };
        Insert: {
          arm_cm?: number | null;
          body_fat_pct?: number | null;
          chest_cm?: number | null;
          created_at?: string;
          hips_cm?: number | null;
          id?: string;
          neck_cm?: number | null;
          note?: string | null;
          recorded_at?: string;
          shoulder_cm?: number | null;
          thigh_cm?: number | null;
          user_id: string;
          waist_cm?: number | null;
          weight_kg: number;
        };
        Update: {
          arm_cm?: number | null;
          body_fat_pct?: number | null;
          chest_cm?: number | null;
          created_at?: string;
          hips_cm?: number | null;
          id?: string;
          neck_cm?: number | null;
          note?: string | null;
          recorded_at?: string;
          shoulder_cm?: number | null;
          thigh_cm?: number | null;
          user_id?: string;
          waist_cm?: number | null;
          weight_kg?: number;
        };
        Relationships: [];
      };
      progress_photos: {
        Row: {
          created_at: string;
          id: string;
          image_path: string;
          note: string | null;
          recorded_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_path: string;
          note?: string | null;
          recorded_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_path?: string;
          note?: string | null;
          recorded_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          billing_interval: string | null;
          cancel_at_period_end: boolean;
          current_period_end: string | null;
          current_period_start: string | null;
          ends_at: string | null;
          expiry_date: string | null;
          plan_count_used: number;
          plan_type: Database["public"]["Enums"]["subscription_plan"];
          provider: string | null;
          provider_ref: string | null;
          renews_at: string | null;
          status: Database["public"]["Enums"]["subscription_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          billing_interval?: string | null;
          cancel_at_period_end?: boolean;
          current_period_end?: string | null;
          current_period_start?: string | null;
          ends_at?: string | null;
          expiry_date?: string | null;
          plan_count_used?: number;
          plan_type?: Database["public"]["Enums"]["subscription_plan"];
          provider?: string | null;
          provider_ref?: string | null;
          renews_at?: string | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          billing_interval?: string | null;
          cancel_at_period_end?: boolean;
          current_period_end?: string | null;
          current_period_start?: string | null;
          ends_at?: string | null;
          expiry_date?: string | null;
          plan_count_used?: number;
          plan_type?: Database["public"]["Enums"]["subscription_plan"];
          provider?: string | null;
          provider_ref?: string | null;
          renews_at?: string | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      support_ticket_messages: {
        Row: {
          author_id: string;
          author_role: string;
          body: string;
          created_at: string;
          id: string;
          ticket_id: string;
        };
        Insert: {
          author_id: string;
          author_role: string;
          body: string;
          created_at?: string;
          id?: string;
          ticket_id: string;
        };
        Update: {
          author_id?: string;
          author_role?: string;
          body?: string;
          created_at?: string;
          id?: string;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "support_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          last_activity_at: string;
          priority: string;
          status: Database["public"]["Enums"]["ticket_status"];
          subject: string;
          user_id: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          id?: string;
          last_activity_at?: string;
          priority?: string;
          status?: Database["public"]["Enums"]["ticket_status"];
          subject: string;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          last_activity_at?: string;
          priority?: string;
          status?: Database["public"]["Enums"]["ticket_status"];
          subject?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      suppressed_emails: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          metadata: Json | null;
          reason: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          metadata?: Json | null;
          reason: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          metadata?: Json | null;
          reason?: string;
        };
        Relationships: [];
      };
      user_achievements: {
        Row: {
          achievement_id: string;
          id: string;
          unlocked_at: string;
          user_id: string;
        };
        Insert: {
          achievement_id: string;
          id?: string;
          unlocked_at?: string;
          user_id: string;
        };
        Update: {
          achievement_id?: string;
          id?: string;
          unlocked_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      water_logs: {
        Row: {
          amount_ml: number;
          created_at: string;
          id: string;
          logged_date: string;
          user_id: string;
        };
        Insert: {
          amount_ml: number;
          created_at?: string;
          id?: string;
          logged_date: string;
          user_id: string;
        };
        Update: {
          amount_ml?: number;
          created_at?: string;
          id?: string;
          logged_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          error_message: string | null;
          event_id: string;
          event_name: string;
          id: string;
          payload: Json;
          processed_at: string | null;
          provider: string;
          received_at: string;
          status: string;
          user_id: string | null;
        };
        Insert: {
          error_message?: string | null;
          event_id: string;
          event_name: string;
          id?: string;
          payload: Json;
          processed_at?: string | null;
          provider: string;
          received_at?: string;
          status?: string;
          user_id?: string | null;
        };
        Update: {
          error_message?: string | null;
          event_id?: string;
          event_name?: string;
          id?: string;
          payload?: Json;
          processed_at?: string | null;
          provider?: string;
          received_at?: string;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      workout_plans: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          schedule: Json;
          template_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          schedule: Json;
          template_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          schedule?: Json;
          template_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_plans_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "workout_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_sessions: {
        Row: {
          created_at: string;
          duration_min: number | null;
          focus: string | null;
          id: string;
          notes: string | null;
          performed_on: string;
          planned_sets: number | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          duration_min?: number | null;
          focus?: string | null;
          id?: string;
          notes?: string | null;
          performed_on?: string;
          planned_sets?: number | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          duration_min?: number | null;
          focus?: string | null;
          id?: string;
          notes?: string | null;
          performed_on?: string;
          planned_sets?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };
      workout_set_logs: {
        Row: {
          created_at: string;
          exercise_name: string;
          id: string;
          notes: string | null;
          reps: number | null;
          session_id: string;
          set_number: number;
          user_id: string;
          weight_kg: number | null;
        };
        Insert: {
          created_at?: string;
          exercise_name: string;
          id?: string;
          notes?: string | null;
          reps?: number | null;
          session_id: string;
          set_number: number;
          user_id: string;
          weight_kg?: number | null;
        };
        Update: {
          created_at?: string;
          exercise_name?: string;
          id?: string;
          notes?: string | null;
          reps?: number | null;
          session_id?: string;
          set_number?: number;
          user_id?: string;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      workout_templates: {
        Row: {
          created_at: string;
          enabled: boolean;
          goal: Database["public"]["Enums"]["fitness_goal"];
          id: string;
          level: Database["public"]["Enums"]["difficulty_level"];
          name: string;
          schedule: Json;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          goal: Database["public"]["Enums"]["fitness_goal"];
          id?: string;
          level: Database["public"]["Enums"]["difficulty_level"];
          name: string;
          schedule?: Json;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          goal?: Database["public"]["Enums"]["fitness_goal"];
          id?: string;
          level?: Database["public"]["Enums"]["difficulty_level"];
          name?: string;
          schedule?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      consume_plan_generation_credit: {
        Args: { p_free_limit: number; p_unlimited: boolean; p_user_id: string };
        Returns: {
          allowed: boolean;
          plan_count_used: number;
        }[];
      };
      delete_email: {
        Args: { message_id: number; queue_name: string };
        Returns: boolean;
      };
      enqueue_email: {
        Args: { payload: Json; queue_name: string };
        Returns: number;
      };
      has_active_subscription: {
        Args: { _env?: string; _user_id: string };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_owner: { Args: { _user_id: string }; Returns: boolean };
      move_to_dlq: {
        Args: {
          dlq_name: string;
          message_id: number;
          payload: Json;
          source_queue: string;
        };
        Returns: number;
      };
      plan_type_from_price: {
        Args: { _price_id: string };
        Returns: Database["public"]["Enums"]["subscription_plan"];
      };
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number };
        Returns: {
          message: Json;
          msg_id: number;
          read_ct: number;
        }[];
      };
      refund_plan_generation_credit: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      transfer_ownership: { Args: { _new_owner: string }; Returns: boolean };
    };
    Enums: {
      activity_level: "sedentary" | "light" | "moderate" | "active";
      app_role: "admin" | "user" | "owner";
      billing_interval_kind: "monthly" | "annual";
      budget_level: "low" | "medium" | "high";
      difficulty_level: "beginner" | "intermediate" | "advanced";
      fitness_goal: "lose_fat" | "build_muscle" | "maintain";
      gender: "male" | "female" | "other";
      meal_category: "breakfast" | "lunch" | "dinner" | "snack";
      payment_method_kind: "qris" | "paypal" | "bank_transfer" | "lemon_squeezy";
      payment_submission_status: "pending" | "approved" | "rejected" | "expired";
      subscription_plan: "free" | "pro" | "premium" | "elite";
      subscription_status: "active" | "expired" | "cancelled" | "past_due";
      ticket_status: "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      activity_level: ["sedentary", "light", "moderate", "active"],
      app_role: ["admin", "user", "owner"],
      billing_interval_kind: ["monthly", "annual"],
      budget_level: ["low", "medium", "high"],
      difficulty_level: ["beginner", "intermediate", "advanced"],
      fitness_goal: ["lose_fat", "build_muscle", "maintain"],
      gender: ["male", "female", "other"],
      meal_category: ["breakfast", "lunch", "dinner", "snack"],
      payment_method_kind: ["qris", "paypal", "bank_transfer", "lemon_squeezy"],
      payment_submission_status: ["pending", "approved", "rejected", "expired"],
      subscription_plan: ["free", "pro", "premium", "elite"],
      subscription_status: [
        "active",
        "expired",
        "cancelled",
        "past_due",
        "trialing",
        "incomplete",
        "incomplete_expired",
        "unpaid",
        "paused",
        "canceled",
      ],
      ticket_status: ["open", "in_progress", "waiting_user", "resolved", "closed"],
    },
  },
} as const;
