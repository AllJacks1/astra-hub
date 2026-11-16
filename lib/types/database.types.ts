export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      astra_hub_channel_members: {
        Row: {
          added_by: string | null;
          channel_id: string;
          joined_at: string;
          membership_role: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          added_by?: string | null;
          channel_id: string;
          joined_at?: string;
          membership_role?: string;
          user_id: string;
        };
        Update: {
          added_by?: string | null;
          channel_id?: string;
          joined_at?: string;
          membership_role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "astra_hub_channel_members_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "astra_hub_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "astra_hub_channel_members_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "astra_hub_channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "astra_hub_channel_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "astra_hub_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      astra_hub_channels: {
        Row: {
          archived_at: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_mandatory: boolean;
          name: string;
          updated_at: string;
          visibility: Database["public"]["Enums"]["astra_hub_channel_visibility"];
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_mandatory?: boolean;
          name: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["astra_hub_channel_visibility"];
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_mandatory?: boolean;
          name?: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["astra_hub_channel_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "astra_hub_channels_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "astra_hub_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      astra_hub_conversation_members: {
        Row: {
          conversation_id: string;
          joined_at: string;
          last_read_at: string | null;
          left_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          conversation_id: string;
          joined_at?: string;
          last_read_at?: string | null;
          left_at?: string | null;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          left_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "astra_hub_conversation_members_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "astra_hub_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "astra_hub_conversation_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "astra_hub_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      astra_hub_conversations: {
        Row: {
          created_at: string;
          created_by: string | null;
          direct_key: string | null;
          id: string;
          title: string | null;
          type: Database["public"]["Enums"]["astra_hub_conversation_type"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          direct_key?: string | null;
          id?: string;
          title?: string | null;
          type: Database["public"]["Enums"]["astra_hub_conversation_type"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          direct_key?: string | null;
          id?: string;
          title?: string | null;
          type?: Database["public"]["Enums"]["astra_hub_conversation_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "astra_hub_conversations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "astra_hub_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      astra_hub_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          role: Database["public"]["Enums"]["astra_hub_user_role"];
          status: Database["public"]["Enums"]["astra_hub_invitation_status"];
          token_hash: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
          invited_by?: string | null;
          role: Database["public"]["Enums"]["astra_hub_user_role"];
          status?: Database["public"]["Enums"]["astra_hub_invitation_status"];
          token_hash: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["astra_hub_user_role"];
          status?: Database["public"]["Enums"]["astra_hub_invitation_status"];
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "astra_hub_invitations_accepted_by_fkey";
            columns: ["accepted_by"];
            isOneToOne: false;
            referencedRelation: "astra_hub_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "astra_hub_invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "astra_hub_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      astra_hub_message_attachments: {
        Row: {
          created_at: string;
          file_size: number;
          id: string;
          message_id: string;
          mime_type: string;
          original_file_name: string;
          storage_path: string;
          uploaded_by: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          file_size: number;
          id?: string;
          message_id: string;
          mime_type: string;
          original_file_name: string;
          storage_path: string;
          uploaded_by: string;
        };
        Update: {
          created_at?: string;
          file_size?: number;
          id?: string;
          message_id?: string;
          mime_type?: string;
          original_file_name?: string;
          storage_path?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "astra_hub_message_attachments_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "astra_hub_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "astra_hub_message_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "astra_hub_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      astra_hub_messages: {
        Row: {
          body: string | null;
          channel_id: string | null;
          conversation_id: string | null;
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          id: string;
          sender_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          channel_id?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          sender_id: string;
          updated_at?: string;
        };
        Update: {
          body?: string | null;
          channel_id?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          sender_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "astra_hub_messages_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "astra_hub_channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "astra_hub_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "astra_hub_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "astra_hub_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "astra_hub_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      astra_hub_notifications: {
        Row: {
          actor_id: string | null;
          body_preview: string | null;
          channel_id: string | null;
          conversation_id: string | null;
          created_at: string;
          id: string;
          message_id: string | null;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          body_preview?: string | null;
          channel_id?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          id?: string;
          message_id?: string | null;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          actor_id?: string | null;
          body_preview?: string | null;
          channel_id?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          id?: string;
          message_id?: string | null;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "astra_hub_notifications_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "astra_hub_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "astra_hub_notifications_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "astra_hub_channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "astra_hub_notifications_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "astra_hub_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "astra_hub_notifications_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "astra_hub_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "astra_hub_notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "astra_hub_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      astra_hub_profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          role: Database["public"]["Enums"]["astra_hub_user_role"];
          status: Database["public"]["Enums"]["astra_hub_user_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          role?: Database["public"]["Enums"]["astra_hub_user_role"];
          status?: Database["public"]["Enums"]["astra_hub_user_status"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["astra_hub_user_role"];
          status?: Database["public"]["Enums"]["astra_hub_user_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      astra_hub_push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          last_seen_at: string | null;
          p256dh: string;
          revoked_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          last_seen_at?: string | null;
          p256dh: string;
          revoked_at?: string | null;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          last_seen_at?: string | null;
          p256dh?: string;
          revoked_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "astra_hub_push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "astra_hub_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      blog_categories: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          parent_id: string | null;
          slug: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          parent_id?: string | null;
          slug: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          parent_id?: string | null;
          slug?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "blog_categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "blog_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      blog_comments: {
        Row: {
          author_email: string | null;
          author_name: string | null;
          content: string;
          created_at: string | null;
          id: string;
          parent_id: string | null;
          post_id: string;
          status: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          author_email?: string | null;
          author_name?: string | null;
          content: string;
          created_at?: string | null;
          id?: string;
          parent_id?: string | null;
          post_id: string;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          author_email?: string | null;
          author_name?: string | null;
          content?: string;
          created_at?: string | null;
          id?: string;
          parent_id?: string | null;
          post_id?: string;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "blog_comments_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "blog_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blog_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      blog_tags: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
          slug: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      calendar_events: {
        Row: {
          color: string | null;
          created_at: string | null;
          description: string | null;
          end_at: string;
          id: string;
          profile_id: number;
          start_at: string;
          title: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          end_at: string;
          id?: string;
          profile_id: number;
          start_at: string;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          end_at?: string;
          id?: string;
          profile_id?: number;
          start_at?: string;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_events_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cash_drawers: {
        Row: {
          branch_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          opening_float: number;
          terminal_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          branch_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          opening_float?: number;
          terminal_id?: string | null;
        };
        Update: {
          branch_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          opening_float?: number;
          terminal_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cash_drawers_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "pos_branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_drawers_terminal_id_fkey";
            columns: ["terminal_id"];
            isOneToOne: false;
            referencedRelation: "pos_terminals";
            referencedColumns: ["id"];
          },
        ];
      };
      cash_expense_categories: {
        Row: {
          branch_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          branch_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          sort_order?: number;
        };
        Update: {
          branch_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "cash_expense_categories_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "pos_branches";
            referencedColumns: ["id"];
          },
        ];
      };
      cash_expenses: {
        Row: {
          amount: number;
          approved_by: string | null;
          branch_id: string;
          category_id: string | null;
          created_at: string;
          description: string;
          drawer_id: string | null;
          id: string;
          incurred_at: string;
          notes: string | null;
          occurred_at: string | null;
          paid_at: string | null;
          paid_by: string | null;
          payment_method: string;
          receipt_path: string | null;
          recorded_by: string;
          reference_number: string | null;
          shift_id: string;
          status: string;
          terminal_id: string | null;
          updated_at: string | null;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          approved_by?: string | null;
          branch_id: string;
          category_id?: string | null;
          created_at?: string;
          description: string;
          drawer_id?: string | null;
          id?: string;
          incurred_at?: string;
          notes?: string | null;
          occurred_at?: string | null;
          paid_at?: string | null;
          paid_by?: string | null;
          payment_method?: string;
          receipt_path?: string | null;
          recorded_by: string;
          reference_number?: string | null;
          shift_id: string;
          status?: string;
          terminal_id?: string | null;
          updated_at?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Update: {
          amount?: number;
          approved_by?: string | null;
          branch_id?: string;
          category_id?: string | null;
          created_at?: string;
          description?: string;
          drawer_id?: string | null;
          id?: string;
          incurred_at?: string;
          notes?: string | null;
          occurred_at?: string | null;
          paid_at?: string | null;
          paid_by?: string | null;
          payment_method?: string;
          receipt_path?: string | null;
          recorded_by?: string;
          reference_number?: string | null;
          shift_id?: string;
          status?: string;
          terminal_id?: string | null;
          updated_at?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cash_expenses_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "cash_expense_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_expenses_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "pos_shifts";
            referencedColumns: ["id"];
          },
        ];
      };
      cash_ledger: {
        Row: {
          amount: number;
          branch_id: string;
          created_at: string;
          drawer_id: string | null;
          id: string;
          idempotency_key: string;
          movement_type: string;
          notes: string | null;
          occurred_at: string;
          recorded_by: string;
          shift_id: string | null;
          source_id: string;
          source_type: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          branch_id: string;
          created_at?: string;
          drawer_id?: string | null;
          id?: string;
          idempotency_key: string;
          movement_type: string;
          notes?: string | null;
          occurred_at?: string;
          recorded_by: string;
          shift_id?: string | null;
          source_id: string;
          source_type: string;
        };
        Update: {
          amount?: number;
          branch_id?: string;
          created_at?: string;
          drawer_id?: string | null;
          id?: string;
          idempotency_key?: string;
          movement_type?: string;
          notes?: string | null;
          occurred_at?: string;
          recorded_by?: string;
          shift_id?: string | null;
          source_id?: string;
          source_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cash_ledger_drawer_id_fkey";
            columns: ["drawer_id"];
            isOneToOne: false;
            referencedRelation: "cash_drawers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_ledger_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "pos_shifts";
            referencedColumns: ["id"];
          },
        ];
      };
      cash_remittance_allocations: {
        Row: {
          allocated_amount: number;
          created_at: string;
          id: string;
          remittance_id: string;
          shift_id: string;
        };
        ComputedFields: never;
        Insert: {
          allocated_amount: number;
          created_at?: string;
          id?: string;
          remittance_id: string;
          shift_id: string;
        };
        Update: {
          allocated_amount?: number;
          created_at?: string;
          id?: string;
          remittance_id?: string;
          shift_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cash_remittance_allocations_remittance_id_fkey";
            columns: ["remittance_id"];
            isOneToOne: false;
            referencedRelation: "cash_remittances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_remittance_allocations_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "pos_shifts";
            referencedColumns: ["id"];
          },
        ];
      };
      cash_remittances: {
        Row: {
          actual_amount: number | null;
          branch_id: string;
          confirmed_at: string | null;
          confirmed_by: string | null;
          difference_amount: number | null;
          drawer_id: string | null;
          expected_amount: number;
          from_shift_id: string | null;
          id: string;
          notes: string | null;
          prepared_at: string;
          prepared_by: string;
          recipient_name: string | null;
          remittance_number: number;
          retained_cash: number;
          status: string;
          to_shift_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          actual_amount?: number | null;
          branch_id: string;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          difference_amount?: number | null;
          drawer_id?: string | null;
          expected_amount?: number;
          from_shift_id?: string | null;
          id?: string;
          notes?: string | null;
          prepared_at?: string;
          prepared_by: string;
          recipient_name?: string | null;
          remittance_number?: never;
          retained_cash?: number;
          status?: string;
          to_shift_id?: string | null;
        };
        Update: {
          actual_amount?: number | null;
          branch_id?: string;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          difference_amount?: number | null;
          drawer_id?: string | null;
          expected_amount?: number;
          from_shift_id?: string | null;
          id?: string;
          notes?: string | null;
          prepared_at?: string;
          prepared_by?: string;
          recipient_name?: string | null;
          remittance_number?: never;
          retained_cash?: number;
          status?: string;
          to_shift_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cash_remittances_drawer_id_fkey";
            columns: ["drawer_id"];
            isOneToOne: false;
            referencedRelation: "cash_drawers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_remittances_from_shift_id_fkey";
            columns: ["from_shift_id"];
            isOneToOne: false;
            referencedRelation: "pos_shifts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_remittances_to_shift_id_fkey";
            columns: ["to_shift_id"];
            isOneToOne: false;
            referencedRelation: "pos_shifts";
            referencedColumns: ["id"];
          },
        ];
      };
      cash_turnovers: {
        Row: {
          branch_id: string;
          counted_cash: number | null;
          created_at: string;
          discrepancy_reason: string | null;
          drawer_id: string;
          expected_cash: number;
          id: string;
          incoming_cashier_id: string;
          incoming_confirmed_at: string | null;
          incoming_shift_id: string;
          notes: string | null;
          outgoing_cashier_id: string;
          outgoing_confirmed_at: string | null;
          outgoing_shift_id: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          branch_id: string;
          counted_cash?: number | null;
          created_at?: string;
          discrepancy_reason?: string | null;
          drawer_id: string;
          expected_cash: number;
          id?: string;
          incoming_cashier_id: string;
          incoming_confirmed_at?: string | null;
          incoming_shift_id: string;
          notes?: string | null;
          outgoing_cashier_id: string;
          outgoing_confirmed_at?: string | null;
          outgoing_shift_id: string;
          status?: string;
        };
        Update: {
          branch_id?: string;
          counted_cash?: number | null;
          created_at?: string;
          discrepancy_reason?: string | null;
          drawer_id?: string;
          expected_cash?: number;
          id?: string;
          incoming_cashier_id?: string;
          incoming_confirmed_at?: string | null;
          incoming_shift_id?: string;
          notes?: string | null;
          outgoing_cashier_id?: string;
          outgoing_confirmed_at?: string | null;
          outgoing_shift_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cash_turnovers_drawer_id_fkey";
            columns: ["drawer_id"];
            isOneToOne: false;
            referencedRelation: "cash_drawers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_turnovers_incoming_shift_id_fkey";
            columns: ["incoming_shift_id"];
            isOneToOne: false;
            referencedRelation: "pos_shifts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_turnovers_outgoing_shift_id_fkey";
            columns: ["outgoing_shift_id"];
            isOneToOne: false;
            referencedRelation: "pos_shifts";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          birthday: string | null;
          client_id: number;
          created_at: string;
          email_address: string | null;
          fullname: string | null;
          mobile_number: string | null;
          voucher_group_id: number | null;
          zone_id: number | null;
        };
        ComputedFields: never;
        Insert: {
          birthday?: string | null;
          client_id?: number;
          created_at?: string;
          email_address?: string | null;
          fullname?: string | null;
          mobile_number?: string | null;
          voucher_group_id?: number | null;
          zone_id?: number | null;
        };
        Update: {
          birthday?: string | null;
          client_id?: number;
          created_at?: string;
          email_address?: string | null;
          fullname?: string | null;
          mobile_number?: string | null;
          voucher_group_id?: number | null;
          zone_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "clients_voucher_group_id_fkey";
            columns: ["voucher_group_id"];
            isOneToOne: false;
            referencedRelation: "voucherGroups";
            referencedColumns: ["voucher_group_id"];
          },
        ];
      };
      cubicles: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          seats: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          seats?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          seats?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      emails: {
        Row: {
          body: string | null;
          code: string | null;
          created_at: string;
          emailId: number;
          subject: string | null;
          userId: string | null;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          code?: string | null;
          created_at?: string;
          emailId?: number;
          subject?: string | null;
          userId?: string | null;
        };
        Update: {
          body?: string | null;
          code?: string | null;
          created_at?: string;
          emailId?: number;
          subject?: string | null;
          userId?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "emails_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["userId"];
          },
        ];
      };
      employee_charges: {
        Row: {
          amount: number;
          charged_at: string;
          charged_by: string | null;
          employee_id: string;
          id: string;
          notes: string | null;
          order_id: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          charged_at?: string;
          charged_by?: string | null;
          employee_id: string;
          id?: string;
          notes?: string | null;
          order_id: string;
          status?: string;
        };
        Update: {
          amount?: number;
          charged_at?: string;
          charged_by?: string | null;
          employee_id?: string;
          id?: string;
          notes?: string | null;
          order_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "employee_charges_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employee_charges_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "pos_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      employee_credit_accounts: {
        Row: {
          created_at: string;
          credit_limit: number;
          employee_id: string;
          id: string;
          is_enabled: boolean;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          credit_limit?: number;
          employee_id: string;
          id?: string;
          is_enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          credit_limit?: number;
          employee_id?: string;
          id?: string;
          is_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "employee_credit_accounts_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: true;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      employee_salary_deductions: {
        Row: {
          amount: number;
          employee_id: string;
          id: string;
          notes: string | null;
          payroll_period_end: string | null;
          payroll_period_start: string | null;
          payroll_reference: string;
          recorded_at: string;
          recorded_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          employee_id: string;
          id?: string;
          notes?: string | null;
          payroll_period_end?: string | null;
          payroll_period_start?: string | null;
          payroll_reference: string;
          recorded_at?: string;
          recorded_by?: string | null;
        };
        Update: {
          amount?: number;
          employee_id?: string;
          id?: string;
          notes?: string | null;
          payroll_period_end?: string | null;
          payroll_period_start?: string | null;
          payroll_reference?: string;
          recorded_at?: string;
          recorded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "employee_salary_deductions_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      employees: {
        Row: {
          created_at: string;
          employee_code: string;
          first_name: string;
          id: string;
          is_active: boolean;
          last_name: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          employee_code: string;
          first_name: string;
          id?: string;
          is_active?: boolean;
          last_name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          employee_code?: string;
          first_name?: string;
          id?: string;
          is_active?: boolean;
          last_name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          created_at: string;
          description: string | null;
          end_date: string | null;
          id: number;
          image: string | null;
          published_at: string | null;
          published_by: string | null;
          start_date: string | null;
          status: string | null;
          title: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          id?: number;
          image?: string | null;
          published_at?: string | null;
          published_by?: string | null;
          start_date?: string | null;
          status?: string | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          id?: number;
          image?: string | null;
          published_at?: string | null;
          published_by?: string | null;
          start_date?: string | null;
          status?: string | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      logs: {
        Row: {
          activity: string | null;
          created_at: string;
          logsId: number;
          transactionId: number | null;
        };
        ComputedFields: never;
        Insert: {
          activity?: string | null;
          created_at?: string;
          logsId?: number;
          transactionId?: number | null;
        };
        Update: {
          activity?: string | null;
          created_at?: string;
          logsId?: number;
          transactionId?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "logs_transactionId_fkey";
            columns: ["transactionId"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["transactionId"];
          },
        ];
      };
      pos_areas: {
        Row: {
          code: string;
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          sort_order: number | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          sort_order?: number | null;
          updated_at?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          sort_order?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      pos_billing_settings: {
        Row: {
          branch_id: string;
          created_at: string;
          id: string;
          service_charge_enabled: boolean;
          service_charge_rate: number;
          service_charge_rounding: string;
          updated_at: string;
          vat_enabled: boolean;
          vat_rate: number;
        };
        ComputedFields: never;
        Insert: {
          branch_id: string;
          created_at?: string;
          id?: string;
          service_charge_enabled?: boolean;
          service_charge_rate?: number;
          service_charge_rounding?: string;
          updated_at?: string;
          vat_enabled?: boolean;
          vat_rate?: number;
        };
        Update: {
          branch_id?: string;
          created_at?: string;
          id?: string;
          service_charge_enabled?: boolean;
          service_charge_rate?: number;
          service_charge_rounding?: string;
          updated_at?: string;
          vat_enabled?: boolean;
          vat_rate?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pos_billing_settings_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: true;
            referencedRelation: "pos_branches";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_branches: {
        Row: {
          code: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          location: string | null;
          name: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          code?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          location?: string | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          location?: string | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pos_categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pos_equipment: {
        Row: {
          available_quantity: number;
          category: string;
          condition: string;
          created_at: string;
          department: string;
          id: string;
          name: string;
          notes: string | null;
          total_quantity: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          available_quantity?: number;
          category: string;
          condition?: string;
          created_at?: string;
          department: string;
          id?: string;
          name: string;
          notes?: string | null;
          total_quantity?: number;
          updated_at?: string;
        };
        Update: {
          available_quantity?: number;
          category?: string;
          condition?: string;
          created_at?: string;
          department?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          total_quantity?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      pos_equipment_history: {
        Row: {
          created_at: string;
          details: string | null;
          equipment_id: string;
          event: string;
          id: string;
          staff_name: string | null;
          staff_user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          details?: string | null;
          equipment_id: string;
          event: string;
          id?: string;
          staff_name?: string | null;
          staff_user_id?: string | null;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          equipment_id?: string;
          event?: string;
          id?: string;
          staff_name?: string | null;
          staff_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pos_equipment_history_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "pos_equipment";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_inventory: {
        Row: {
          branch_id: string;
          id: string;
          product_id: string;
          reorder_level: number;
          stock_quantity: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          branch_id: string;
          id?: string;
          product_id: string;
          reorder_level?: number;
          stock_quantity?: number;
          updated_at?: string;
        };
        Update: {
          branch_id?: string;
          id?: string;
          product_id?: string;
          reorder_level?: number;
          stock_quantity?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pos_inventory_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "pos_branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_inventory_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "pos_products";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_inventory_movements: {
        Row: {
          branch_id: string;
          created_at: string;
          id: string;
          movement_type: string;
          notes: string | null;
          product_id: string;
          quantity: number;
          reference_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          branch_id: string;
          created_at?: string;
          id?: string;
          movement_type: string;
          notes?: string | null;
          product_id: string;
          quantity: number;
          reference_id?: string | null;
        };
        Update: {
          branch_id?: string;
          created_at?: string;
          id?: string;
          movement_type?: string;
          notes?: string | null;
          product_id?: string;
          quantity?: number;
          reference_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pos_inventory_movements_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "pos_branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "pos_products";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_order_area_charges: {
        Row: {
          area_code: string;
          area_id: string;
          created_at: string;
          discount_amount: number;
          id: string;
          order_id: string;
          service_charge_amount: number;
          service_charge_rate: number;
          subtotal: number;
          tax_amount: number;
          taxable_amount: number;
          total_amount: number;
        };
        ComputedFields: never;
        Insert: {
          area_code: string;
          area_id: string;
          created_at?: string;
          discount_amount?: number;
          id?: string;
          order_id: string;
          service_charge_amount?: number;
          service_charge_rate?: number;
          subtotal?: number;
          tax_amount?: number;
          taxable_amount?: number;
          total_amount?: number;
        };
        Update: {
          area_code?: string;
          area_id?: string;
          created_at?: string;
          discount_amount?: number;
          id?: string;
          order_id?: string;
          service_charge_amount?: number;
          service_charge_rate?: number;
          subtotal?: number;
          tax_amount?: number;
          taxable_amount?: number;
          total_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pos_order_area_charges_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "pos_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_order_items: {
        Row: {
          area_code: string | null;
          area_id: string | null;
          created_at: string;
          discount_amount: number;
          discount_reason: string | null;
          id: string;
          is_vat_exempt: boolean;
          line_total: number;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          service_charge: number | null;
          unit_price: number;
          vat_amount: number;
          vat_rate: number;
        };
        ComputedFields: never;
        Insert: {
          area_code?: string | null;
          area_id?: string | null;
          created_at?: string;
          discount_amount?: number;
          discount_reason?: string | null;
          id?: string;
          is_vat_exempt?: boolean;
          line_total?: number;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity?: number;
          service_charge?: number | null;
          unit_price?: number;
          vat_amount?: number;
          vat_rate?: number;
        };
        Update: {
          area_code?: string | null;
          area_id?: string | null;
          created_at?: string;
          discount_amount?: number;
          discount_reason?: string | null;
          id?: string;
          is_vat_exempt?: boolean;
          line_total?: number;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          service_charge?: number | null;
          unit_price?: number;
          vat_amount?: number;
          vat_rate?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pos_order_items_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "pos_areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "pos_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "pos_products";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_order_voids: {
        Row: {
          branch_id: string | null;
          cashier_user_id: string | null;
          created_at: string;
          id: string;
          order_id: string;
          order_number: string | null;
          original_status: string;
          original_total: number;
          reason: string;
          shift_id: string | null;
          voided_at: string;
          voided_by_auth_id: string;
          voided_by_email: string | null;
          voided_by_profile_id: number | null;
        };
        ComputedFields: never;
        Insert: {
          branch_id?: string | null;
          cashier_user_id?: string | null;
          created_at?: string;
          id?: string;
          order_id: string;
          order_number?: string | null;
          original_status?: string;
          original_total?: number;
          reason: string;
          shift_id?: string | null;
          voided_at?: string;
          voided_by_auth_id: string;
          voided_by_email?: string | null;
          voided_by_profile_id?: number | null;
        };
        Update: {
          branch_id?: string | null;
          cashier_user_id?: string | null;
          created_at?: string;
          id?: string;
          order_id?: string;
          order_number?: string | null;
          original_status?: string;
          original_total?: number;
          reason?: string;
          shift_id?: string | null;
          voided_at?: string;
          voided_by_auth_id?: string;
          voided_by_email?: string | null;
          voided_by_profile_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "pos_order_voids_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "pos_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_orders: {
        Row: {
          bar_status: string | null;
          branch_id: string;
          cashier_user_id: string | null;
          client_id: string | null;
          completed_at: string | null;
          created_at: string;
          discount_amount: number;
          id: string;
          kitchen_status: string | null;
          notes: string | null;
          order_number: string;
          order_source: string;
          order_type: string;
          primary_area_id: string | null;
          reservation_id: string | null;
          service_charge_amount: number | null;
          service_charge_rate: number | null;
          session_id: string | null;
          shift_id: string | null;
          status: string;
          subtotal: number;
          tax_amount: number;
          terminal_id: string | null;
          total_amount: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          bar_status?: string | null;
          branch_id: string;
          cashier_user_id?: string | null;
          client_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          discount_amount?: number;
          id?: string;
          kitchen_status?: string | null;
          notes?: string | null;
          order_number: string;
          order_source?: string;
          order_type?: string;
          primary_area_id?: string | null;
          reservation_id?: string | null;
          service_charge_amount?: number | null;
          service_charge_rate?: number | null;
          session_id?: string | null;
          shift_id?: string | null;
          status?: string;
          subtotal?: number;
          tax_amount?: number;
          terminal_id?: string | null;
          total_amount?: number;
          updated_at?: string;
        };
        Update: {
          bar_status?: string | null;
          branch_id?: string;
          cashier_user_id?: string | null;
          client_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          discount_amount?: number;
          id?: string;
          kitchen_status?: string | null;
          notes?: string | null;
          order_number?: string;
          order_source?: string;
          order_type?: string;
          primary_area_id?: string | null;
          reservation_id?: string | null;
          service_charge_amount?: number | null;
          service_charge_rate?: number | null;
          session_id?: string | null;
          shift_id?: string | null;
          status?: string;
          subtotal?: number;
          tax_amount?: number;
          terminal_id?: string | null;
          total_amount?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pos_orders_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "pos_branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_orders_primary_area_id_fkey";
            columns: ["primary_area_id"];
            isOneToOne: false;
            referencedRelation: "pos_areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_orders_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "pos_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_orders_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "pos_shifts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_orders_terminal_id_fkey";
            columns: ["terminal_id"];
            isOneToOne: false;
            referencedRelation: "pos_terminals";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_payments: {
        Row: {
          amount: number | null;
          change_amount: number | null;
          id: string;
          idempotency_key: string | null;
          order_id: string;
          paid_at: string | null;
          payment_method: string | null;
          received_amount: number | null;
          reference_number: string | null;
          status: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount?: number | null;
          change_amount?: number | null;
          id?: string;
          idempotency_key?: string | null;
          order_id: string;
          paid_at?: string | null;
          payment_method?: string | null;
          received_amount?: number | null;
          reference_number?: string | null;
          status?: string | null;
        };
        Update: {
          amount?: number | null;
          change_amount?: number | null;
          id?: string;
          idempotency_key?: string | null;
          order_id?: string;
          paid_at?: string | null;
          payment_method?: string | null;
          received_amount?: number | null;
          reference_number?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_pos_payments_order";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "pos_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_products: {
        Row: {
          area_code: string | null;
          area_id: string | null;
          category_id: string | null;
          cost_price: number;
          created_at: string;
          description: string | null;
          duration_minutes: number | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          item_type: string;
          max_pax: number | null;
          min_pax: number | null;
          name: string;
          package_type: string | null;
          price: number;
          sku: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          area_code?: string | null;
          area_id?: string | null;
          category_id?: string | null;
          cost_price?: number;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          item_type?: string;
          max_pax?: number | null;
          min_pax?: number | null;
          name: string;
          package_type?: string | null;
          price?: number;
          sku?: string | null;
          updated_at?: string;
        };
        Update: {
          area_code?: string | null;
          area_id?: string | null;
          category_id?: string | null;
          cost_price?: number;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          item_type?: string;
          max_pax?: number | null;
          min_pax?: number | null;
          name?: string;
          package_type?: string | null;
          price?: number;
          sku?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pos_products_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "pos_areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "pos_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_sessions: {
        Row: {
          branch_id: string | null;
          created_at: string;
          cubicle_id: string | null;
          expires_at: string;
          id: string;
          is_active: boolean;
          qr_token: string;
          room_id: string | null;
          table_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          branch_id?: string | null;
          created_at?: string;
          cubicle_id?: string | null;
          expires_at: string;
          id?: string;
          is_active?: boolean;
          qr_token: string;
          room_id?: string | null;
          table_id?: string | null;
          updated_at?: string;
        };
        Update: {
          branch_id?: string | null;
          created_at?: string;
          cubicle_id?: string | null;
          expires_at?: string;
          id?: string;
          is_active?: boolean;
          qr_token?: string;
          room_id?: string | null;
          table_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pos_sessions_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "pos_branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_sessions_cubicle_id_fkey";
            columns: ["cubicle_id"];
            isOneToOne: false;
            referencedRelation: "cubicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_sessions_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_sessions_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_shifts: {
        Row: {
          actual_cash: number | null;
          branch_id: string;
          cash_management_notes: string | null;
          cashier_user_id: string | null;
          closed_at: string | null;
          drawer_id: string | null;
          expected_cash: number;
          id: string;
          notes: string | null;
          opened_at: string;
          opening_counted_cash: number | null;
          previous_shift_id: string | null;
          reconciled_at: string | null;
          reconciled_by: string | null;
          retained_cash: number;
          shift_number: string | null;
          starting_cash: number;
          status: string;
          terminal_id: string | null;
          turnover_acknowledged_at: string | null;
          turnover_acknowledged_by: string | null;
          turnover_actual_cash: number | null;
          turnover_difference: number | null;
          turnover_status: string;
          updated_at: string | null;
          variance: number | null;
        };
        ComputedFields: never;
        Insert: {
          actual_cash?: number | null;
          branch_id: string;
          cash_management_notes?: string | null;
          cashier_user_id?: string | null;
          closed_at?: string | null;
          drawer_id?: string | null;
          expected_cash?: number;
          id?: string;
          notes?: string | null;
          opened_at?: string;
          opening_counted_cash?: number | null;
          previous_shift_id?: string | null;
          reconciled_at?: string | null;
          reconciled_by?: string | null;
          retained_cash?: number;
          shift_number?: string | null;
          starting_cash?: number;
          status?: string;
          terminal_id?: string | null;
          turnover_acknowledged_at?: string | null;
          turnover_acknowledged_by?: string | null;
          turnover_actual_cash?: number | null;
          turnover_difference?: number | null;
          turnover_status?: string;
          updated_at?: string | null;
          variance?: number | null;
        };
        Update: {
          actual_cash?: number | null;
          branch_id?: string;
          cash_management_notes?: string | null;
          cashier_user_id?: string | null;
          closed_at?: string | null;
          drawer_id?: string | null;
          expected_cash?: number;
          id?: string;
          notes?: string | null;
          opened_at?: string;
          opening_counted_cash?: number | null;
          previous_shift_id?: string | null;
          reconciled_at?: string | null;
          reconciled_by?: string | null;
          retained_cash?: number;
          shift_number?: string | null;
          starting_cash?: number;
          status?: string;
          terminal_id?: string | null;
          turnover_acknowledged_at?: string | null;
          turnover_acknowledged_by?: string | null;
          turnover_actual_cash?: number | null;
          turnover_difference?: number | null;
          turnover_status?: string;
          updated_at?: string | null;
          variance?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "pos_shifts_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "pos_branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_shifts_previous_shift_id_fkey";
            columns: ["previous_shift_id"];
            isOneToOne: false;
            referencedRelation: "pos_shifts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_shifts_terminal_id_fkey";
            columns: ["terminal_id"];
            isOneToOne: false;
            referencedRelation: "pos_terminals";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_terminals: {
        Row: {
          branch_id: string;
          code: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          terminal_type: string;
        };
        ComputedFields: never;
        Insert: {
          branch_id: string;
          code?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          terminal_type?: string;
        };
        Update: {
          branch_id?: string;
          code?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          terminal_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pos_terminals_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "pos_branches";
            referencedColumns: ["id"];
          },
        ];
      };
      post_tags: {
        Row: {
          created_at: string | null;
          post_id: string;
          tag_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          post_id: string;
          tag_id: string;
        };
        Update: {
          created_at?: string | null;
          post_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "blog_tags";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          author_id: number | null;
          category_id: string | null;
          content: string;
          created_at: string | null;
          featured_image: string | null;
          id: string;
          published_at: string | null;
          slug: string;
          status: string | null;
          summary: string | null;
          title: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          author_id?: number | null;
          category_id?: string | null;
          content: string;
          created_at?: string | null;
          featured_image?: string | null;
          id?: string;
          published_at?: string | null;
          slug: string;
          status?: string | null;
          summary?: string | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          author_id?: number | null;
          category_id?: string | null;
          content?: string;
          created_at?: string | null;
          featured_image?: string | null;
          id?: string;
          published_at?: string | null;
          slug?: string;
          status?: string | null;
          summary?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "blog_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_pos_branches: {
        Row: {
          assigned_at: string;
          branch_id: string;
          profile_id: number;
        };
        ComputedFields: never;
        Insert: {
          assigned_at?: string;
          branch_id: string;
          profile_id: number;
        };
        Update: {
          assigned_at?: string;
          branch_id?: string;
          profile_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "profile_pos_branches_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "pos_branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_pos_branches_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_pos_terminals: {
        Row: {
          assigned_at: string;
          profile_id: number;
          terminal_id: string;
        };
        ComputedFields: never;
        Insert: {
          assigned_at?: string;
          profile_id: number;
          terminal_id: string;
        };
        Update: {
          assigned_at?: string;
          profile_id?: number;
          terminal_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_pos_terminals_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_pos_terminals_terminal_id_fkey";
            columns: ["terminal_id"];
            isOneToOne: false;
            referencedRelation: "pos_terminals";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          auth_user_id: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: number;
          role: string | null;
        };
        ComputedFields: never;
        Insert: {
          auth_user_id?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: number;
          role?: string | null;
        };
        Update: {
          auth_user_id?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: number;
          role?: string | null;
        };
        Relationships: [];
      };
      reservation_rooms: {
        Row: {
          created_at: string | null;
          reservation_id: string;
          room_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          reservation_id: string;
          room_id: string;
        };
        Update: {
          created_at?: string | null;
          reservation_id?: string;
          room_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservation_rooms_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservation_rooms_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      reservation_tables: {
        Row: {
          created_at: string | null;
          reservation_id: string;
          table_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          reservation_id: string;
          table_id: string;
        };
        Update: {
          created_at?: string | null;
          reservation_id?: string;
          table_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservation_tables_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservation_tables_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["id"];
          },
        ];
      };
      reservations: {
        Row: {
          created_at: string | null;
          email: string;
          end_at: string;
          full_name: string;
          id: string;
          notes: string | null;
          pax: number;
          phone: string | null;
          profile_id: number | null;
          start_at: string;
          status: string | null;
          updated_at: string | null;
          zone: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          email: string;
          end_at: string;
          full_name: string;
          id?: string;
          notes?: string | null;
          pax: number;
          phone?: string | null;
          profile_id?: number | null;
          start_at: string;
          status?: string | null;
          updated_at?: string | null;
          zone: string;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          end_at?: string;
          full_name?: string;
          id?: string;
          notes?: string | null;
          pax?: number;
          phone?: string | null;
          profile_id?: number | null;
          start_at?: string;
          status?: string | null;
          updated_at?: string | null;
          zone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rewards: {
        Row: {
          created_at: string;
          unused: boolean | null;
          voucherCode: string | null;
          voucherGroupId: number | null;
          voucherId: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          unused?: boolean | null;
          voucherCode?: string | null;
          voucherGroupId?: number | null;
          voucherId?: number;
        };
        Update: {
          created_at?: string;
          unused?: boolean | null;
          voucherCode?: string | null;
          voucherGroupId?: number | null;
          voucherId?: number;
        };
        Relationships: [
          {
            foreignKeyName: "rewards_voucherGroupId_fkey";
            columns: ["voucherGroupId"];
            isOneToOne: false;
            referencedRelation: "rewardsGroup";
            referencedColumns: ["voucherGroupId"];
          },
        ];
      };
      rewardsGroup: {
        Row: {
          created_at: string;
          description: string | null;
          image: string | null;
          name: string | null;
          neededPoints: string | null;
          perCustomer: boolean | null;
          totalVouchers: number | null;
          type: string | null;
          voucherGroupId: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          image?: string | null;
          name?: string | null;
          neededPoints?: string | null;
          perCustomer?: boolean | null;
          totalVouchers?: number | null;
          type?: string | null;
          voucherGroupId?: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          image?: string | null;
          name?: string | null;
          neededPoints?: string | null;
          perCustomer?: boolean | null;
          totalVouchers?: number | null;
          type?: string | null;
          voucherGroupId?: number;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          seats: number;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          seats: number;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          seats?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      tables: {
        Row: {
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          seats: number;
          table_number: string;
          updated_at: string | null;
          zone: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          seats: number;
          table_number: string;
          updated_at?: string | null;
          zone: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          seats?: number;
          table_number?: string;
          updated_at?: string | null;
          zone?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          adminId: string | null;
          created_at: string;
          description: string | null;
          points: string | null;
          receiptNumber: string | null;
          transactionId: number;
          transactionType: string | null;
          userId: string | null;
          voucherGroupId: number | null;
        };
        ComputedFields: never;
        Insert: {
          adminId?: string | null;
          created_at?: string;
          description?: string | null;
          points?: string | null;
          receiptNumber?: string | null;
          transactionId?: number;
          transactionType?: string | null;
          userId?: string | null;
          voucherGroupId?: number | null;
        };
        Update: {
          adminId?: string | null;
          created_at?: string;
          description?: string | null;
          points?: string | null;
          receiptNumber?: string | null;
          transactionId?: number;
          transactionType?: string | null;
          userId?: string | null;
          voucherGroupId?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["userId"];
          },
          {
            foreignKeyName: "transactions_voucherGroupId_fkey";
            columns: ["voucherGroupId"];
            isOneToOne: false;
            referencedRelation: "rewardsGroup";
            referencedColumns: ["voucherGroupId"];
          },
        ];
      };
      users: {
        Row: {
          address: string | null;
          birthday: string | null;
          contactNumber: string | null;
          created_at: string;
          email: string | null;
          firstname: string | null;
          memberSince: string | null;
          memberUntil: string | null;
          referralCode: string | null;
          secret: string | null;
          surname: string | null;
          updated_at: string | null;
          userId: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          birthday?: string | null;
          contactNumber?: string | null;
          created_at?: string;
          email?: string | null;
          firstname?: string | null;
          memberSince?: string | null;
          memberUntil?: string | null;
          referralCode?: string | null;
          secret?: string | null;
          surname?: string | null;
          updated_at?: string | null;
          userId: string;
        };
        Update: {
          address?: string | null;
          birthday?: string | null;
          contactNumber?: string | null;
          created_at?: string;
          email?: string | null;
          firstname?: string | null;
          memberSince?: string | null;
          memberUntil?: string | null;
          referralCode?: string | null;
          secret?: string | null;
          surname?: string | null;
          updated_at?: string | null;
          userId?: string;
        };
        Relationships: [];
      };
      visits: {
        Row: {
          created_at: string;
          dateTime: string | null;
          id: number;
          userId: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          dateTime?: string | null;
          id?: number;
          userId?: string | null;
        };
        Update: {
          created_at?: string;
          dateTime?: string | null;
          id?: number;
          userId?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "visits_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["userId"];
          },
        ];
      };
      voucherGroups: {
        Row: {
          created_at: string;
          status: string | null;
          voucher_group_id: number;
          vouchers: Json | null;
          zone_id: number | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          status?: string | null;
          voucher_group_id?: number;
          vouchers?: Json | null;
          zone_id?: number | null;
        };
        Update: {
          created_at?: string;
          status?: string | null;
          voucher_group_id?: number;
          vouchers?: Json | null;
          zone_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "voucherGroups_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "zones";
            referencedColumns: ["zone_id"];
          },
        ];
      };
      zones: {
        Row: {
          created_at: string;
          zone: string | null;
          zone_id: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          zone?: string | null;
          zone_id?: number;
        };
        Update: {
          created_at?: string;
          zone?: string | null;
          zone_id?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      astra_hub_is_allowed_invitation_email: { Args: { email: string }; Returns: boolean };
      astra_hub_normalize_email: { Args: { raw: string }; Returns: string };
      rpc_record_payment_and_start_session_timer: {
        Args: {
          p_amount: number;
          p_change_amount: number;
          p_idempotency_key: string;
          p_order_id: string;
          p_payment_method: string;
          p_received_amount: number;
          p_reference_number: string;
          p_staff_user_id: string;
        };
        Returns: Json;
      };
      rpc_void_completed_order: {
        Args: {
          p_cashier_user_id?: string;
          p_manager_auth_user_id: string;
          p_manager_email?: string;
          p_manager_profile_id?: number;
          p_order_id: string;
          p_reason: string;
        };
        Returns: Json;
      };
      update_order_department_status: {
        Args: { p_department: string; p_new_status: string; p_order_id: string };
        Returns: {
          bar_status: string;
          kitchen_status: string;
        }[];
      };
      validate_pos_session: { Args: { p_qr_token: string }; Returns: Json };
    };
    Enums: {
      astra_hub_channel_visibility: "public" | "private";
      astra_hub_conversation_type: "direct" | "group";
      astra_hub_invitation_status: "pending" | "accepted" | "revoked" | "expired";
      astra_hub_user_role: "admin" | "member" | "guest";
      astra_hub_user_status: "invited" | "active" | "suspended";
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      astra_hub_channel_visibility: ["public", "private"],
      astra_hub_conversation_type: ["direct", "group"],
      astra_hub_invitation_status: ["pending", "accepted", "revoked", "expired"],
      astra_hub_user_role: ["admin", "member", "guest"],
      astra_hub_user_status: ["invited", "active", "suspended"],
    },
  },
} as const;
