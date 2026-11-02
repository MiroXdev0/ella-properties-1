export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      inquiries: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          message: string;
          name: string;
          phone: string | null;
          property_id: string | null;
          status: Database["public"]["Enums"]["inquiry_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          message: string;
          name: string;
          phone?: string | null;
          property_id?: string | null;
          status?: Database["public"]["Enums"]["inquiry_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          message?: string;
          name?: string;
          phone?: string | null;
          property_id?: string | null;
          status?: Database["public"]["Enums"]["inquiry_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inquiries_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      inquiry_rate_limits: {
        Row: {
          bucket_key: string;
          hits: number;
          window_start: string;
        };
        Insert: {
          bucket_key: string;
          hits?: number;
          window_start?: string;
        };
        Update: {
          bucket_key?: string;
          hits?: number;
          window_start?: string;
        };
        Relationships: [];
      };
      honeypot_visitors: {
        Row: {
          as_organization: string | null;
          asn: number | null;
          browser: string | null;
          browser_version: string | null;
          city: string | null;
          country: string | null;
          country_code: string | null;
          created_at: string;
          device_type: string | null;
          first_seen: string;
          hosting_classification: string | null;
          id: string;
          identity_purged_at: string | null;
          ip_address: string | null;
          is_trusted: boolean;
          last_seen: string;
          metadata_sources: Json;
          operating_system: string | null;
          region: string | null;
          request_count: number;
          review_status: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          source_hash: string;
          updated_at: string;
          user_agent: string | null;
        };
        Insert: {
          as_organization?: string | null;
          asn?: number | null;
          browser?: string | null;
          browser_version?: string | null;
          city?: string | null;
          country?: string | null;
          country_code?: string | null;
          created_at?: string;
          device_type?: string | null;
          first_seen?: string;
          hosting_classification?: string | null;
          id?: string;
          identity_purged_at?: string | null;
          ip_address?: string | null;
          is_trusted?: boolean;
          last_seen?: string;
          metadata_sources?: Json;
          operating_system?: string | null;
          region?: string | null;
          request_count?: number;
          review_status?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source_hash: string;
          updated_at?: string;
          user_agent?: string | null;
        };
        Update: {
          as_organization?: string | null;
          asn?: number | null;
          browser?: string | null;
          browser_version?: string | null;
          city?: string | null;
          country?: string | null;
          country_code?: string | null;
          created_at?: string;
          device_type?: string | null;
          first_seen?: string;
          hosting_classification?: string | null;
          id?: string;
          identity_purged_at?: string | null;
          ip_address?: string | null;
          is_trusted?: boolean;
          last_seen?: string;
          metadata_sources?: Json;
          operating_system?: string | null;
          region?: string | null;
          request_count?: number;
          review_status?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          source_hash?: string;
          updated_at?: string;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      honeypot_events: {
        Row: {
          created_at: string;
          detected_at: string;
          detection_reason: string;
          endpoint: string;
          id: string;
          hostname: string;
          referrer: string | null;
          request_method: string;
          status: string;
          user_agent: string | null;
          visitor_id: string;
        };
        Insert: {
          created_at?: string;
          detected_at?: string;
          detection_reason: string;
          endpoint: string;
          id?: string;
          hostname: string;
          referrer?: string | null;
          request_method: string;
          status?: string;
          user_agent?: string | null;
          visitor_id: string;
        };
        Update: {
          created_at?: string;
          detected_at?: string;
          detection_reason?: string;
          endpoint?: string;
          id?: string;
          hostname?: string;
          referrer?: string | null;
          request_method?: string;
          status?: string;
          user_agent?: string | null;
          visitor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "honeypot_events_visitor_id_fkey";
            columns: ["visitor_id"];
            isOneToOne: false;
            referencedRelation: "honeypot_visitors";
            referencedColumns: ["id"];
          },
        ];
      };
      honeypot_activity: {
        Row: {
          activity_type: string;
          created_at: string;
          event_id: string;
          id: string;
          occurred_at: string;
          visitor_id: string;
        };
        Insert: {
          activity_type?: string;
          created_at?: string;
          event_id: string;
          id?: string;
          occurred_at?: string;
          visitor_id: string;
        };
        Update: {
          activity_type?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          occurred_at?: string;
          visitor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "honeypot_activity_event_visitor_fkey";
            columns: ["event_id", "visitor_id"];
            isOneToOne: true;
            referencedRelation: "honeypot_events";
            referencedColumns: ["id", "visitor_id"];
          },
        ];
      };
      honeypot_ip_restrictions: {
        Row: {
          administrator_id: string;
          cloudflare_rule_id: string | null;
          created_at: string;
          duration: string;
          enforcement_mode: string;
          expires_at: string | null;
          id: string;
          ip_address: string | null;
          last_verified_at: string | null;
          reason: string;
          released_at: string | null;
          status: string;
          updated_at: string;
          visitor_id: string | null;
        };
        Insert: {
          administrator_id: string;
          cloudflare_rule_id?: string | null;
          created_at?: string;
          duration: string;
          enforcement_mode?: string;
          expires_at?: string | null;
          id?: string;
          ip_address?: string | null;
          last_verified_at?: string | null;
          reason: string;
          released_at?: string | null;
          status?: string;
          updated_at?: string;
          visitor_id?: string | null;
        };
        Update: {
          administrator_id?: string;
          cloudflare_rule_id?: string | null;
          created_at?: string;
          duration?: string;
          enforcement_mode?: string;
          expires_at?: string | null;
          id?: string;
          ip_address?: string | null;
          last_verified_at?: string | null;
          reason?: string;
          released_at?: string | null;
          status?: string;
          updated_at?: string;
          visitor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "honeypot_ip_restrictions_visitor_id_fkey";
            columns: ["visitor_id"];
            isOneToOne: false;
            referencedRelation: "honeypot_visitors";
            referencedColumns: ["id"];
          },
        ];
      };
      honeypot_admin_notes: {
        Row: {
          administrator_id: string;
          created_at: string;
          event_id: string | null;
          id: string;
          note: string;
          visitor_id: string;
        };
        Insert: {
          administrator_id: string;
          created_at?: string;
          event_id?: string | null;
          id?: string;
          note: string;
          visitor_id: string;
        };
        Update: {
          administrator_id?: string;
          created_at?: string;
          event_id?: string | null;
          id?: string;
          note?: string;
          visitor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "honeypot_admin_notes_event_visitor_fkey";
            columns: ["event_id", "visitor_id"];
            isOneToOne: false;
            referencedRelation: "honeypot_events";
            referencedColumns: ["id", "visitor_id"];
          },
          {
            foreignKeyName: "honeypot_admin_notes_visitor_id_fkey";
            columns: ["visitor_id"];
            isOneToOne: false;
            referencedRelation: "honeypot_visitors";
            referencedColumns: ["id"];
          },
        ];
      };
      honeypot_admin_audit: {
        Row: {
          action: string;
          administrator_id: string | null;
          created_at: string;
          details: Json;
          event_id: string | null;
          id: string;
          outcome: string;
          restriction_id: string | null;
          visitor_id: string | null;
        };
        Insert: {
          action: string;
          administrator_id?: string | null;
          created_at?: string;
          details?: Json;
          event_id?: string | null;
          id?: string;
          outcome?: string;
          restriction_id?: string | null;
          visitor_id?: string | null;
        };
        Update: {
          action?: string;
          administrator_id?: string | null;
          created_at?: string;
          details?: Json;
          event_id?: string | null;
          id?: string;
          outcome?: string;
          restriction_id?: string | null;
          visitor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "honeypot_admin_audit_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "honeypot_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "honeypot_admin_audit_restriction_id_fkey";
            columns: ["restriction_id"];
            isOneToOne: false;
            referencedRelation: "honeypot_ip_restrictions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "honeypot_admin_audit_visitor_id_fkey";
            columns: ["visitor_id"];
            isOneToOne: false;
            referencedRelation: "honeypot_visitors";
            referencedColumns: ["id"];
          },
        ];
      };
      site_security_events: {
        Row: {
          category: string;
          correlation_id: string;
          created_at: string;
          dedupe_key: string;
          event_type: string;
          first_seen: string;
          http_status: number;
          id: string;
          last_seen: string;
          occurrence_count: number;
          observed_requests: number;
          request_method: string;
          review_status: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          risk_score: number;
          route: string;
          severity: string;
          signals: Json;
          source_hash: string;
          visitor_id: string | null;
          window_started_at: string;
        };
        Insert: {
          category: string;
          correlation_id: string;
          created_at?: string;
          dedupe_key: string;
          event_type: string;
          first_seen?: string;
          http_status: number;
          id?: string;
          last_seen?: string;
          occurrence_count?: number;
          observed_requests?: number;
          request_method: string;
          review_status?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          risk_score: number;
          route: string;
          severity: string;
          signals: Json;
          source_hash: string;
          visitor_id?: string | null;
          window_started_at: string;
        };
        Update: {
          category?: string;
          correlation_id?: string;
          created_at?: string;
          dedupe_key?: string;
          event_type?: string;
          first_seen?: string;
          http_status?: number;
          id?: string;
          last_seen?: string;
          occurrence_count?: number;
          observed_requests?: number;
          request_method?: string;
          review_status?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          risk_score?: number;
          route?: string;
          severity?: string;
          signals?: Json;
          source_hash?: string;
          visitor_id?: string | null;
          window_started_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "site_security_events_visitor_id_fkey";
            columns: ["visitor_id"];
            isOneToOne: false;
            referencedRelation: "honeypot_visitors";
            referencedColumns: ["id"];
          },
        ];
      };
      site_security_admin_audit: {
        Row: {
          action: string;
          administrator_id: string | null;
          created_at: string;
          details: Json;
          event_id: string | null;
          id: string;
          new_status: string;
          previous_status: string | null;
          visitor_id: string | null;
        };
        Insert: {
          action: string;
          administrator_id?: string | null;
          created_at?: string;
          details?: Json;
          event_id?: string | null;
          id?: string;
          new_status: string;
          previous_status?: string | null;
          visitor_id?: string | null;
        };
        Update: {
          action?: string;
          administrator_id?: string | null;
          created_at?: string;
          details?: Json;
          event_id?: string | null;
          id?: string;
          new_status?: string;
          previous_status?: string | null;
          visitor_id?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          address: string | null;
          area: number | null;
          city: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          description: string | null;
          district: string | null;
          floor: string | null;
          id: string;
          is_featured: boolean;
          is_published: boolean;
          layout: string | null;
          main_image: string | null;
          map_lat: number | null;
          map_lng: number | null;
          price: number;
          rooms: number | null;
          seo_description: string | null;
          seo_keywords: string | null;
          seo_title: string | null;
          slug: string | null;
          status: Database["public"]["Enums"]["property_status"];
          title: string;
          type: Database["public"]["Enums"]["property_type"];
          updated_at: string;
          video_url: string | null;
          yard_area: number | null;
        };
        Insert: {
          address?: string | null;
          area?: number | null;
          city?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          district?: string | null;
          floor?: string | null;
          id?: string;
          is_featured?: boolean;
          is_published?: boolean;
          layout?: string | null;
          main_image?: string | null;
          map_lat?: number | null;
          map_lng?: number | null;
          price?: number;
          rooms?: number | null;
          seo_description?: string | null;
          seo_keywords?: string | null;
          seo_title?: string | null;
          slug?: string | null;
          status?: Database["public"]["Enums"]["property_status"];
          title: string;
          type: Database["public"]["Enums"]["property_type"];
          updated_at?: string;
          video_url?: string | null;
          yard_area?: number | null;
        };
        Update: {
          address?: string | null;
          area?: number | null;
          city?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          district?: string | null;
          floor?: string | null;
          id?: string;
          is_featured?: boolean;
          is_published?: boolean;
          layout?: string | null;
          main_image?: string | null;
          map_lat?: number | null;
          map_lng?: number | null;
          price?: number;
          rooms?: number | null;
          seo_description?: string | null;
          seo_keywords?: string | null;
          seo_title?: string | null;
          slug?: string | null;
          status?: Database["public"]["Enums"]["property_status"];
          title?: string;
          type?: Database["public"]["Enums"]["property_type"];
          updated_at?: string;
          video_url?: string | null;
          yard_area?: number | null;
        };
        Relationships: [];
      };
      property_images: {
        Row: {
          created_at: string;
          id: string;
          property_id: string;
          sort_order: number;
          storage_path: string | null;
          url: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          property_id: string;
          sort_order?: number;
          storage_path?: string | null;
          url: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          property_id?: string;
          sort_order?: number;
          storage_path?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      site_pages: {
        Row: {
          content: Json;
          id: string;
          is_published: boolean;
          seo_description: string | null;
          seo_keywords: string | null;
          seo_title: string | null;
          slug: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          content?: Json;
          id?: string;
          is_published?: boolean;
          seo_description?: string | null;
          seo_keywords?: string | null;
          seo_title?: string | null;
          slug: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          content?: Json;
          id?: string;
          is_published?: boolean;
          seo_description?: string | null;
          seo_keywords?: string | null;
          seo_title?: string | null;
          slug?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          content_en: Json;
          og_image_url: string | null;
          services_image_url: string;
          services_image_heading: string;
          working_hours: Json;
          about_eyebrow: string | null;
          about_stat4_label: string | null;
          about_stat4_value: string | null;
          about_text: string | null;
          about_text_secondary: string | null;
          about_title: string | null;
          accent_color: string | null;
          address: string | null;
          allow_registration: boolean;
          brand_name: string | null;
          brand_tagline: string | null;
          catalog_eyebrow: string | null;
          catalog_title: string | null;
          contact_eyebrow: string | null;
          contact_map_embed: string | null;
          contact_map_url: string | null;
          contact_subtitle: string | null;
          contact_title: string | null;
          email: string | null;
          facebook_url: string | null;
          footer_copyright: string | null;
          footer_description: string | null;
          hero_cta_label: string | null;
          hero_cta_link: string | null;
          hero_eyebrow: string | null;
          hero_image_url: string | null;
          hero_secondary_cta_label: string | null;
          hero_secondary_cta_link: string | null;
          hero_subtitle: string | null;
          hero_title: string | null;
          id: number;
          instagram_url: string | null;
          tiktok_url: string | null;
          logo_url: string | null;
          nav_links: Json | null;
          phone1: string | null;
          phone2: string | null;
          primary_color: string | null;
          seo_home_description: string | null;
          seo_home_keywords: string | null;
          seo_home_title: string | null;
          services: Json | null;
          services_eyebrow: string | null;
          services_subtitle: string | null;
          services_title: string | null;
          stat1_label: string | null;
          stat1_value: string | null;
          stat2_label: string | null;
          stat2_value: string | null;
          stat3_label: string | null;
          stat3_value: string | null;
          testimonials: Json | null;
          testimonials_eyebrow: string | null;
          testimonials_title: string | null;
          updated_at: string;
          viber_number: string | null;
          whatsapp_number: string | null;
          why_eyebrow: string | null;
          why_reasons: Json | null;
          why_title: string | null;
        };
        Insert: {
          content_en?: Json;
          og_image_url?: string | null;
          services_image_url?: string;
          services_image_heading?: string;
          working_hours?: Json;
          about_eyebrow?: string | null;
          about_stat4_label?: string | null;
          about_stat4_value?: string | null;
          about_text?: string | null;
          about_text_secondary?: string | null;
          about_title?: string | null;
          accent_color?: string | null;
          address?: string | null;
          allow_registration?: boolean;
          brand_name?: string | null;
          brand_tagline?: string | null;
          catalog_eyebrow?: string | null;
          catalog_title?: string | null;
          contact_eyebrow?: string | null;
          contact_map_embed?: string | null;
          contact_map_url?: string | null;
          contact_subtitle?: string | null;
          contact_title?: string | null;
          email?: string | null;
          facebook_url?: string | null;
          footer_copyright?: string | null;
          footer_description?: string | null;
          hero_cta_label?: string | null;
          hero_cta_link?: string | null;
          hero_eyebrow?: string | null;
          hero_image_url?: string | null;
          hero_secondary_cta_label?: string | null;
          hero_secondary_cta_link?: string | null;
          hero_subtitle?: string | null;
          hero_title?: string | null;
          id?: number;
          instagram_url?: string | null;
          tiktok_url?: string | null;
          logo_url?: string | null;
          nav_links?: Json | null;
          phone1?: string | null;
          phone2?: string | null;
          primary_color?: string | null;
          seo_home_description?: string | null;
          seo_home_keywords?: string | null;
          seo_home_title?: string | null;
          services?: Json | null;
          services_eyebrow?: string | null;
          services_subtitle?: string | null;
          services_title?: string | null;
          stat1_label?: string | null;
          stat1_value?: string | null;
          stat2_label?: string | null;
          stat2_value?: string | null;
          stat3_label?: string | null;
          stat3_value?: string | null;
          testimonials?: Json | null;
          testimonials_eyebrow?: string | null;
          testimonials_title?: string | null;
          updated_at?: string;
          viber_number?: string | null;
          whatsapp_number?: string | null;
          why_eyebrow?: string | null;
          why_reasons?: Json | null;
          why_title?: string | null;
        };
        Update: {
          content_en?: Json;
          og_image_url?: string | null;
          services_image_url?: string;
          services_image_heading?: string;
          working_hours?: Json;
          about_eyebrow?: string | null;
          about_stat4_label?: string | null;
          about_stat4_value?: string | null;
          about_text?: string | null;
          about_text_secondary?: string | null;
          about_title?: string | null;
          accent_color?: string | null;
          address?: string | null;
          allow_registration?: boolean;
          brand_name?: string | null;
          brand_tagline?: string | null;
          catalog_eyebrow?: string | null;
          catalog_title?: string | null;
          contact_eyebrow?: string | null;
          contact_map_embed?: string | null;
          contact_map_url?: string | null;
          contact_subtitle?: string | null;
          contact_title?: string | null;
          email?: string | null;
          facebook_url?: string | null;
          footer_copyright?: string | null;
          footer_description?: string | null;
          hero_cta_label?: string | null;
          hero_cta_link?: string | null;
          hero_eyebrow?: string | null;
          hero_image_url?: string | null;
          hero_secondary_cta_label?: string | null;
          hero_secondary_cta_link?: string | null;
          hero_subtitle?: string | null;
          hero_title?: string | null;
          id?: number;
          instagram_url?: string | null;
          tiktok_url?: string | null;
          logo_url?: string | null;
          nav_links?: Json | null;
          phone1?: string | null;
          phone2?: string | null;
          primary_color?: string | null;
          seo_home_description?: string | null;
          seo_home_keywords?: string | null;
          seo_home_title?: string | null;
          services?: Json | null;
          services_eyebrow?: string | null;
          services_subtitle?: string | null;
          services_title?: string | null;
          stat1_label?: string | null;
          stat1_value?: string | null;
          stat2_label?: string | null;
          stat2_value?: string | null;
          stat3_label?: string | null;
          stat3_value?: string | null;
          testimonials?: Json | null;
          testimonials_eyebrow?: string | null;
          testimonials_title?: string | null;
          updated_at?: string;
          viber_number?: string | null;
          whatsapp_number?: string | null;
          why_eyebrow?: string | null;
          why_reasons?: Json | null;
          why_title?: string | null;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          created_at: string;
          description: string | null;
          email: string | null;
          id: string;
          is_active: boolean;
          name: string;
          phone: string | null;
          photo_url: string | null;
          role: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          phone?: string | null;
          photo_url?: string | null;
          role?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          phone?: string | null;
          photo_url?: string | null;
          role?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      submit_inquiry: {
        Args: {
          _client_key: string;
          _email: string;
          _message: string;
          _name: string;
          _phone: string;
          _property_id: string;
        };
        Returns: string;
      };
      record_honeypot_detection: {
        Args: {
          p_as_organization: string | null;
          p_asn: number | null;
          p_browser: string | null;
          p_browser_version: string | null;
          p_city: string | null;
          p_country: string | null;
          p_country_code: string | null;
          p_device_type: string | null;
          p_detection_reason: string;
          p_endpoint: string;
          p_hosting_classification: string | null;
          p_hostname: string;
          p_ip_address: string | null;
          p_is_trusted: boolean;
          p_metadata_sources: Json;
          p_operating_system: string | null;
          p_referrer: string | null;
          p_region: string | null;
          p_request_method: string;
          p_source_hash: string;
          p_user_agent: string | null;
        };
        Returns: {
          event_id: string;
          request_count: number;
          visitor_id: string;
        }[];
      };
      purge_honeypot_data: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      honeypot_hourly_volume: {
        Args: Record<PropertyKey, never>;
        Returns: { event_count: number; hour: string }[];
      };
      honeypot_hosts_match_zone: {
        Args: { p_visitor_id: string; p_zone_hostname: string };
        Returns: boolean;
      };
      record_site_security_event: {
        Args: {
          p_category: string;
          p_correlation_id: string;
          p_dedupe_key: string;
          p_event_type: string;
          p_http_status: number;
          p_observed_requests: number;
          p_request_method: string;
          p_risk_score: number;
          p_route: string;
          p_severity: string;
          p_signals: Json;
          p_source_hash: string;
          p_window_started_at: string;
        };
        Returns: string;
      };
      site_security_overview: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      site_security_dashboard: {
        Args: {
          p_from: string;
          p_to: string;
        };
        Returns: Json;
      };
      review_site_security_events: {
        Args: {
          p_administrator_id: string;
          p_event_ids: string[];
          p_review_status: string;
        };
        Returns: number;
      };
      review_site_security_visitor: {
        Args: {
          p_administrator_id: string;
          p_review_status: string;
          p_visitor_id: string;
        };
        Returns: boolean;
      };
      purge_site_security_admin_audit: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      purge_site_security_events: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
    };
    Enums: {
      app_role: "admin" | "editor";
      inquiry_status: "Ново" | "Обработено" | "Завършено";
      property_status: "Продава" | "Под наем" | "Продаден" | "Отдаден";
      property_type:
        "Апартамент" | "Къща" | "Парцел" | "Земеделска земя" | "Офис" | "Магазин" | "Бизнес имот";
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "editor"],
      inquiry_status: ["Ново", "Обработено", "Завършено"],
      property_status: ["Продава", "Под наем", "Продаден", "Отдаден"],
      property_type: [
        "Апартамент",
        "Къща",
        "Парцел",
        "Земеделска земя",
        "Офис",
        "Магазин",
        "Бизнес имот",
      ],
    },
  },
} as const;
