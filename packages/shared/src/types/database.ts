// Types générés depuis le projet Supabase THRIVE-CA (kkdcgzvdmipmrgkawnky)
// Regénérer : supabase gen types typescript --project-id kkdcgzvdmipmrgkawnky

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
      access_logs: {
        Row: {
          accessor_id: string | null
          accessor_role: string | null
          action: string
          child_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          accessor_id?: string | null
          accessor_role?: string | null
          action?: string
          child_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          accessor_id?: string | null
          accessor_role?: string | null
          action?: string
          child_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_accessor_id_fkey"
            columns: ["accessor_id"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_accessor_id_fkey"
            columns: ["accessor_id"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "access_logs_accessor_id_fkey"
            columns: ["accessor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_coach_supervision: {
        Row: {
          admin_id: string
          assigned_by: string | null
          coach_id: string
          created_at: string
          id: string
          is_active: boolean
        }
        Insert: {
          admin_id: string
          assigned_by?: string | null
          coach_id: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          admin_id?: string
          assigned_by?: string | null
          coach_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "admin_coach_supervision_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_coach_supervision_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "admin_coach_supervision_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_coach_supervision_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_coach_supervision_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "admin_coach_supervision_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_coach_supervision_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_coach_supervision_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "admin_coach_supervision_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_documents: {
        Row: {
          child_id: string
          created_at: string
          file_name: string | null
          id: string
          kind: string
          mime_type: string | null
          parent_visible: boolean
          size_bytes: number | null
          storage_path: string
          title: string | null
          uploaded_by: string | null
        }
        Insert: {
          child_id: string
          created_at?: string
          file_name?: string | null
          id?: string
          kind: string
          mime_type?: string | null
          parent_visible?: boolean
          size_bytes?: number | null
          storage_path: string
          title?: string | null
          uploaded_by?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string
          file_name?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          parent_visible?: boolean
          size_bytes?: number | null
          storage_path?: string
          title?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_documents_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "athlete_documents_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "athlete_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_identity: {
        Row: {
          certificate_ready: boolean
          child_id: string
          club: string | null
          created_at: string
          focus_word: string | null
          letter: string | null
          life_skill_goal: string | null
          my_actions: string[]
          notes: string | null
          position: string | null
          program_pct_override: number | null
          routine: Json
          season_dream: string | null
          smart_goal: string | null
          sport: string | null
          sport_story: string | null
          strengths: string[]
          toolbox: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          certificate_ready?: boolean
          child_id: string
          club?: string | null
          created_at?: string
          focus_word?: string | null
          letter?: string | null
          life_skill_goal?: string | null
          my_actions?: string[]
          notes?: string | null
          position?: string | null
          program_pct_override?: number | null
          routine?: Json
          season_dream?: string | null
          smart_goal?: string | null
          sport?: string | null
          sport_story?: string | null
          strengths?: string[]
          toolbox?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          certificate_ready?: boolean
          child_id?: string
          club?: string | null
          created_at?: string
          focus_word?: string | null
          letter?: string | null
          life_skill_goal?: string | null
          my_actions?: string[]
          notes?: string | null
          position?: string | null
          program_pct_override?: number | null
          routine?: Json
          season_dream?: string | null
          smart_goal?: string | null
          sport?: string | null
          sport_story?: string | null
          strengths?: string[]
          toolbox?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_identity_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "athlete_identity_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_identity_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_identity_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "athlete_identity_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_next_steps: {
        Row: {
          child_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          label: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          label: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          label?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_next_steps_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "athlete_next_steps_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_next_steps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_next_steps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "athlete_next_steps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_objectives: {
        Row: {
          child_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          kind: string
          progress: number
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          kind?: string
          progress?: number
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          kind?: string
          progress?: number
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_objectives_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "athlete_objectives_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_objectives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_objectives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "athlete_objectives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          category: string | null
          color: string | null
          condition_type: string | null
          condition_value: number | null
          created_at: string
          description: string | null
          icon: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          condition_type?: string | null
          condition_value?: number | null
          created_at?: string
          description?: string | null
          icon?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          category?: string | null
          color?: string | null
          condition_type?: string | null
          condition_value?: number | null
          created_at?: string
          description?: string | null
          icon?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      child_badges: {
        Row: {
          awarded_by: string | null
          badge_id: string
          child_id: string
          earned_at: string
          id: string
          note: string | null
        }
        Insert: {
          awarded_by?: string | null
          badge_id: string
          child_id: string
          earned_at?: string
          id?: string
          note?: string | null
        }
        Update: {
          awarded_by?: string | null
          badge_id?: string
          child_id?: string
          earned_at?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_badges_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_badges_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "child_badges_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "analytics_badge_distribution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_badges_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "child_badges_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string
          family_id: string
          first_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          is_active: boolean
          last_name: string
          notes: string | null
          sport: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth: string
          family_id: string
          first_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_active?: boolean
          last_name: string
          notes?: string | null
          sport?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string
          family_id?: string
          first_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_active?: boolean
          last_name?: string
          notes?: string | null
          sport?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["family_id"]
          },
          {
            foreignKeyName: "children_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_assignments: {
        Row: {
          assigned_by: string | null
          child_id: string
          coach_id: string
          created_at: string
          id: string
          is_active: boolean
        }
        Insert: {
          assigned_by?: string | null
          child_id: string
          coach_id: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          assigned_by?: string | null
          child_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "coach_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "coach_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_assignments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "coach_assignments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_assignments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_assignments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "coach_assignments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_reports: {
        Row: {
          age_group: string | null
          child_id: string
          coach_id: string
          coach_message_parent: string | null
          created_at: string
          forces_via: string | null
          home_recommendations: string | null
          id: string
          life_skill_target: string | null
          performance_summary: string | null
          rpe: number | null
          session_id: string | null
          success_count: number | null
          transfer_notes: string | null
          updated_at: string
        }
        Insert: {
          age_group?: string | null
          child_id: string
          coach_id: string
          coach_message_parent?: string | null
          created_at?: string
          forces_via?: string | null
          home_recommendations?: string | null
          id?: string
          life_skill_target?: string | null
          performance_summary?: string | null
          rpe?: number | null
          session_id?: string | null
          success_count?: number | null
          transfer_notes?: string | null
          updated_at?: string
        }
        Update: {
          age_group?: string | null
          child_id?: string
          coach_id?: string
          coach_message_parent?: string | null
          created_at?: string
          forces_via?: string | null
          home_recommendations?: string | null
          id?: string
          life_skill_target?: string | null
          performance_summary?: string | null
          rpe?: number | null
          session_id?: string | null
          success_count?: number | null
          transfer_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_reports_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "coach_reports_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_reports_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_reports_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "coach_reports_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          created_at: string
          granted: boolean
          granted_at: string
          id: string
          ip_address: unknown
          policy_version: string
          profile_id: string
          purpose: string
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          granted?: boolean
          granted_at?: string
          id?: string
          ip_address?: unknown
          policy_version: string
          profile_id: string
          purpose: string
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          granted?: boolean
          granted_at?: string
          id?: string
          ip_address?: unknown
          policy_version?: string
          profile_id?: string
          purpose?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "consents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"] | null
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          tags: string[] | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          age_group?: Database["public"]["Enums"]["age_group"] | null
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          tags?: string[] | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"] | null
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "content_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          family_id: string | null
          id: string
          last_message_at: string | null
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string | null
          family_id?: string | null
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string | null
          family_id?: string | null
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["family_id"]
          },
          {
            foreignKeyName: "conversations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_requests: {
        Row: {
          id: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          requested_at: string
          requested_by: string
          status: string
          target_profile_id: string
        }
        Insert: {
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string
          requested_by: string
          status?: string
          target_profile_id: string
        }
        Update: {
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string
          requested_by?: string
          status?: string
          target_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deletion_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deletion_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "deletion_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deletion_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deletion_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "deletion_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deletion_requests_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deletion_requests_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "deletion_requests_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_reminders: {
        Row: {
          child_id: string
          last_pct: number | null
          last_sent_at: string
        }
        Insert: {
          child_id: string
          last_pct?: number | null
          last_sent_at?: string
        }
        Update: {
          child_id?: string
          last_pct?: number | null
          last_sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_reminders_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "dossier_reminders_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      emotion_logs: {
        Row: {
          child_id: string
          context: string | null
          created_at: string
          created_by: string | null
          emotion: string
          id: string
          intensity: number | null
          session_number: number | null
        }
        Insert: {
          child_id: string
          context?: string | null
          created_at?: string
          created_by?: string | null
          emotion: string
          id?: string
          intensity?: number | null
          session_number?: number | null
        }
        Update: {
          child_id?: string
          context?: string | null
          created_at?: string
          created_by?: string | null
          emotion?: string
          id?: string
          intensity?: number | null
          session_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "emotion_logs_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "emotion_logs_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emotion_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emotion_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "emotion_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          created_at: string
          expires_at: string | null
          family_id: string
          id: string
          plan_id: string | null
          revenuecat_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["entitlement_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          family_id: string
          id?: string
          plan_id?: string | null
          revenuecat_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["entitlement_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          family_id?: string
          id?: string
          plan_id?: string | null
          revenuecat_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["entitlement_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["family_id"]
          },
          {
            foreignKeyName: "entitlements_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          name: string
          pack: string
          parent_id: string
          postal_code: string | null
          province: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name: string
          pack?: string
          parent_id: string
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          pack?: string
          parent_id?: string
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "families_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "families_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "families_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_word_history: {
        Row: {
          child_id: string
          created_at: string
          created_by: string | null
          id: string
          is_current: boolean
          note: string | null
          word: string
        }
        Insert: {
          child_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          note?: string | null
          word: string
        }
        Update: {
          child_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          note?: string | null
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_word_history_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "focus_word_history_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "focus_word_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "focus_word_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "focus_word_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lsss_items: {
        Row: {
          id: string
          is_active: boolean
          item_number: number
          lang: string
          local_number: number
          prompt: string
          sort_order: number
          subscale: string
          subscale_label: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          item_number: number
          lang?: string
          local_number: number
          prompt: string
          sort_order?: number
          subscale: string
          subscale_label: string
        }
        Update: {
          id?: string
          is_active?: boolean
          item_number?: number
          lang?: string
          local_number?: number
          prompt?: string
          sort_order?: number
          subscale?: string
          subscale_label?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string | null
          created_at: string
          family_id: string | null
          id: string
          read_at: string | null
          receiver_id: string
          reply_to_id: string | null
          sender_id: string
          status: Database["public"]["Enums"]["message_status"]
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          read_at?: string | null
          receiver_id: string
          reply_to_id?: string | null
          sender_id: string
          status?: Database["public"]["Enums"]["message_status"]
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string
          family_id?: string | null
          id?: string
          read_at?: string | null
          receiver_id?: string
          reply_to_id?: string | null
          sender_id?: string
          status?: Database["public"]["Enums"]["message_status"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["family_id"]
          },
          {
            foreignKeyName: "messages_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_reports: {
        Row: {
          child_id: string
          coach_report_id: string
          created_at: string
          detail_level: number
          id: string
          language: string
          parent_visible_body: Json
          seen_at: string | null
        }
        Insert: {
          child_id: string
          coach_report_id: string
          created_at?: string
          detail_level?: number
          id?: string
          language?: string
          parent_visible_body?: Json
          seen_at?: string | null
        }
        Update: {
          child_id?: string
          coach_report_id?: string
          created_at?: string
          detail_level?: number
          id?: string
          language?: string
          parent_visible_body?: Json
          seen_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_reports_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "parent_reports_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_reports_coach_report_id_fkey"
            columns: ["coach_report_id"]
            isOneToOne: false
            referencedRelation: "coach_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          agreed_at: string | null
          agreed_to_terms: boolean | null
          avatar_url: string | null
          bio: string | null
          children_count: number | null
          city: string | null
          created_at: string
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          expo_push_token: string | null
          first_name: string | null
          id: string
          is_active: boolean
          last_name: string | null
          notifications_enabled: boolean | null
          phone_number: string | null
          postal_code: string | null
          province: string | null
          registration_notes: string | null
          registration_status: string | null
          role: Database["public"]["Enums"]["user_role"]
          speciality: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          agreed_at?: string | null
          agreed_to_terms?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          children_count?: number | null
          city?: string | null
          created_at?: string
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          expo_push_token?: string | null
          first_name?: string | null
          id: string
          is_active?: boolean
          last_name?: string | null
          notifications_enabled?: boolean | null
          phone_number?: string | null
          postal_code?: string | null
          province?: string | null
          registration_notes?: string | null
          registration_status?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          speciality?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          agreed_at?: string | null
          agreed_to_terms?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          children_count?: number | null
          city?: string | null
          created_at?: string
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          expo_push_token?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          notifications_enabled?: boolean | null
          phone_number?: string | null
          postal_code?: string | null
          province?: string | null
          registration_notes?: string | null
          registration_status?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          speciality?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      program_enrollments: {
        Row: {
          child_id: string
          completed_at: string | null
          enrolled_at: string
          id: string
          program_id: string
        }
        Insert: {
          child_id: string
          completed_at?: string | null
          enrolled_at?: string
          id?: string
          program_id: string
        }
        Update: {
          child_id?: string
          completed_at?: string | null
          enrolled_at?: string
          id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_enrollments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "program_enrollments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"]
          coach_id: string
          created_at: string
          description: string | null
          id: string
          status: Database["public"]["Enums"]["program_status"]
          title: string
          total_sessions: number
          updated_at: string
        }
        Insert: {
          age_group: Database["public"]["Enums"]["age_group"]
          coach_id: string
          created_at?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["program_status"]
          title: string
          total_sessions?: number
          updated_at?: string
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"]
          coach_id?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["program_status"]
          title?: string
          total_sessions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "programs_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_log: {
        Row: {
          child_id: string
          created_at: string
          delta_scores: Json
          event_type: string
          id: string
          summary: string | null
          title: string
        }
        Insert: {
          child_id: string
          created_at?: string
          delta_scores?: Json
          event_type: string
          id?: string
          summary?: string | null
          title: string
        }
        Update: {
          child_id?: string
          created_at?: string
          delta_scores?: Json
          event_type?: string
          id?: string
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_log_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "progress_log_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaires: {
        Row: {
          access_token: string | null
          answers: Json
          child_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: string
          lang: string
          moment: string | null
          program_id: string | null
          session_id: string | null
          session_number: number | null
          status: Database["public"]["Enums"]["questionnaire_status"]
          title: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          answers?: Json
          child_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          lang?: string
          moment?: string | null
          program_id?: string | null
          session_id?: string | null
          session_number?: number | null
          status?: Database["public"]["Enums"]["questionnaire_status"]
          title?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          answers?: Json
          child_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          lang?: string
          moment?: string | null
          program_id?: string | null
          session_id?: string | null
          session_number?: number | null
          status?: Database["public"]["Enums"]["questionnaire_status"]
          title?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaires_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "questionnaires_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaires_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaires_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "questionnaires_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaires_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaires_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string | null
          id: string
          options: Json | null
          order_index: number | null
          questionnaire_id: string | null
          text: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          options?: Json | null
          order_index?: number | null
          questionnaire_id?: string | null
          text: string
          type?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          options?: Json | null
          order_index?: number | null
          questionnaire_id?: string | null
          text?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          age_group: string | null
          body_template: Json
          created_at: string
          id: string
          lang: string
          pack_level: string | null
          session_number: number | null
          updated_at: string
        }
        Insert: {
          age_group?: string | null
          body_template?: Json
          created_at?: string
          id?: string
          lang?: string
          pack_level?: string | null
          session_number?: number | null
          updated_at?: string
        }
        Update: {
          age_group?: string | null
          body_template?: Json
          created_at?: string
          id?: string
          lang?: string
          pack_level?: string | null
          session_number?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          child_id: string
          content: Json
          created_at: string
          generated_by: string
          id: string
          pdf_url: string | null
          program_id: string
        }
        Insert: {
          child_id: string
          content?: Json
          created_at?: string
          generated_by: string
          id?: string
          pdf_url?: string | null
          program_id: string
        }
        Update: {
          child_id?: string
          content?: Json
          created_at?: string
          generated_by?: string
          id?: string
          pdf_url?: string | null
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "reports_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          child_id: string
          coach_notes: string | null
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          program_id: string
          scheduled_at: string | null
          session_number: number
          status: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at: string
        }
        Insert: {
          child_id: string
          coach_notes?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          program_id: string
          scheduled_at?: string | null
          session_number: number
          status?: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          coach_notes?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          program_id?: string
          scheduled_at?: string | null
          session_number?: number
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "sessions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_scores: {
        Row: {
          child_id: string
          created_at: string
          id: string
          skill_key: string
          source: string
          source_id: string | null
          value: number
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          skill_key: string
          source: string
          source_id?: string | null
          value: number
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          skill_key?: string
          source?: string
          source_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "skill_scores_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "skill_scores_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      video_interaction_points: {
        Row: {
          answers: Json
          created_at: string
          id: string
          question_text: string
          timecode_seconds: number
          video_session_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          question_text: string
          timecode_seconds: number
          video_session_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          question_text?: string
          timecode_seconds?: number
          video_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_interaction_points_video_session_id_fkey"
            columns: ["video_session_id"]
            isOneToOne: false
            referencedRelation: "video_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      video_session_runs: {
        Row: {
          answers_log: Json
          child_id: string
          completed_at: string | null
          created_at: string
          id: string
          parent_id: string
          progress_seconds: number
          rpe: number | null
          started_at: string
          updated_at: string
          video_session_id: string
        }
        Insert: {
          answers_log?: Json
          child_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          parent_id: string
          progress_seconds?: number
          rpe?: number | null
          started_at?: string
          updated_at?: string
          video_session_id: string
        }
        Update: {
          answers_log?: Json
          child_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          parent_id?: string
          progress_seconds?: number
          rpe?: number | null
          started_at?: string
          updated_at?: string
          video_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_session_runs_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "analytics_child_progress"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "video_session_runs_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_session_runs_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "admin_coaches_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_session_runs_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "analytics_coach_performance"
            referencedColumns: ["coach_id"]
          },
          {
            foreignKeyName: "video_session_runs_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_session_runs_video_session_id_fkey"
            columns: ["video_session_id"]
            isOneToOne: false
            referencedRelation: "video_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      video_sessions: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"]
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          is_free: boolean
          lang: string
          life_skill: string | null
          phase: string
          session_number: number
          sort_order: number | null
          subtitle: string | null
          theme: string
          thrive_action: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          age_group: Database["public"]["Enums"]["age_group"]
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_free?: boolean
          lang?: string
          life_skill?: string | null
          phase: string
          session_number: number
          sort_order?: number | null
          subtitle?: string | null
          theme: string
          thrive_action?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"]
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_free?: boolean
          lang?: string
          life_skill?: string | null
          phase?: string
          session_number?: number
          sort_order?: number | null
          subtitle?: string | null
          theme?: string
          thrive_action?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_coaches_view: {
        Row: {
          avatar_url: string | null
          bio: string | null
          children_count: number | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          is_active: boolean | null
          last_name: string | null
          phone: string | null
          program_count: number | null
          session_count: number | null
          speciality: string | null
        }
        Relationships: []
      }
      analytics_badge_distribution: {
        Row: {
          awarded_count: number | null
          category: string | null
          icon: string | null
          id: string | null
          name: string | null
          unique_children: number | null
        }
        Relationships: []
      }
      analytics_child_progress: {
        Row: {
          age: number | null
          badges_count: number | null
          child_id: string | null
          completed_sessions: number | null
          family_id: string | null
          family_name: string | null
          first_name: string | null
          last_name: string | null
          last_session_at: string | null
          total_sessions: number | null
        }
        Relationships: []
      }
      analytics_coach_performance: {
        Row: {
          badges_awarded: number | null
          cancelled_sessions: number | null
          coach_id: string | null
          completed_sessions: number | null
          completion_rate: number | null
          first_name: string | null
          last_name: string | null
          total_messages: number | null
          total_programs: number | null
          total_sessions: number | null
        }
        Relationships: []
      }
      analytics_global_kpis: {
        Row: {
          active_programs: number | null
          completed_sessions: number | null
          messages_this_month: number | null
          sessions_this_month: number | null
          total_badges_awarded: number | null
          total_children: number | null
          total_coaches: number | null
          total_families: number | null
          total_messages: number | null
          total_parents: number | null
          total_programs: number | null
          total_sessions: number | null
        }
        Relationships: []
      }
      analytics_monthly_activity: {
        Row: {
          badges: number | null
          messages: number | null
          month: string | null
          new_programs: number | null
          sessions: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      complete_parent_registration: {
        Args: {
          p_address?: string
          p_children?: Json
          p_city?: string
          p_family_name: string
          p_postal_code?: string
          p_province?: string
        }
        Returns: Json
      }
      create_thrive_program: {
        Args: { p_child: string; p_coach: string }
        Returns: undefined
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      dossier_completeness: { Args: { p_child: string }; Returns: Json }
      export_sessions_csv: {
        Args: never
        Returns: {
          csv_row: string
        }[]
      }
      gauge_summary: { Args: { p_child_id: string }; Returns: Json }
      get_my_role: { Args: never; Returns: string }
      list_dossiers: {
        Args: never
        Returns: {
          admin_id: string
          admin_name: string
          child_id: string
          coach_id: string
          coach_name: string
          first_name: string
          last_name: string
          missing_count: number
          pct: number
          pending_lsss: boolean
          sessions_completed: number
          total_sessions: number
          updated_at: string
        }[]
      }
      log_data_access: {
        Args: {
          p_action?: string
          p_child_id?: string
          p_resource_id?: string
          p_resource_type: string
        }
        Returns: undefined
      }
      lsss_get: { Args: { p_token: string }; Returns: Json }
      lsss_progression: { Args: { p_child: string }; Returns: Json }
      lsss_send: { Args: { p_child: string; p_moment: string }; Returns: Json }
      lsss_submit: { Args: { p_answers: Json; p_token: string }; Returns: Json }
      notify_incomplete_dossiers: { Args: { p_days?: number }; Returns: number }
      perma_progression: { Args: { p_child: string }; Returns: Json }
      perma_send: { Args: { p_child: string; p_lang?: string; p_session: number }; Returns: Json }
      questionnaire_get: { Args: { p_token: string }; Returns: Json }
      questionnaire_submit: { Args: { p_answers: Json; p_token: string }; Returns: Json }
    }
    Enums: {
      age_group: "8-11" | "12-14" | "15-17"
      entitlement_status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "TRIAL"
      gender_type: "MALE" | "FEMALE" | "NON_BINARY" | "PREFER_NOT_TO_SAY"
      message_status: "SENT" | "DELIVERED" | "READ"
      notification_type:
        | "SESSION_REMINDER"
        | "PROGRESS_UPDATE"
        | "MESSAGE_RECEIVED"
        | "BADGE_EARNED"
        | "PROGRAM_UPDATED"
        | "REPORT_READY"
        | "DOSSIER_INCOMPLET"
        | "QUESTIONNAIRE_PENDING"
        | "QUESTIONNAIRE_COMPLETED"
        | "DOCUMENT_ADDED"
      program_status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED"
      questionnaire_status: "PENDING" | "IN_PROGRESS" | "COMPLETED"
      session_status:
        | "SCHEDULED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CANCELLED"
        | "MISSED"
        | "POSTPONED"
      user_role: "SUPER_ADMIN" | "ADMIN" | "COACH" | "PARENT" | "CHILD"
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
      age_group: ["8-11", "12-14", "15-17"],
      entitlement_status: ["ACTIVE", "EXPIRED", "CANCELLED", "TRIAL"],
      gender_type: ["MALE", "FEMALE", "NON_BINARY", "PREFER_NOT_TO_SAY"],
      message_status: ["SENT", "DELIVERED", "READ"],
      notification_type: [
        "SESSION_REMINDER",
        "PROGRESS_UPDATE",
        "MESSAGE_RECEIVED",
        "BADGE_EARNED",
        "PROGRAM_UPDATED",
        "REPORT_READY",
        "DOSSIER_INCOMPLET",
        "QUESTIONNAIRE_PENDING",
        "QUESTIONNAIRE_COMPLETED",
        "DOCUMENT_ADDED",
      ],
      program_status: ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"],
      questionnaire_status: ["PENDING", "IN_PROGRESS", "COMPLETED"],
      session_status: [
        "SCHEDULED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
        "MISSED",
        "POSTPONED",
      ],
      user_role: ["SUPER_ADMIN", "ADMIN", "COACH", "PARENT", "CHILD"],
    },
  },
} as const

