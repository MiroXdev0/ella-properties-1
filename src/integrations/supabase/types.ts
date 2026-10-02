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
      inquiries: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string
          name: string
          phone: string | null
          property_id: string | null
          status: Database["public"]["Enums"]["inquiry_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          name: string
          phone?: string | null
          property_id?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          name?: string
          phone?: string | null
          property_id?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_rate_limits: {
        Row: {
          bucket_key: string
          hits: number
          window_start: string
        }
        Insert: {
          bucket_key: string
          hits?: number
          window_start?: string
        }
        Update: {
          bucket_key?: string
          hits?: number
          window_start?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          area: number | null
          city: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          district: string | null
          floor: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          layout: string | null
          main_image: string | null
          map_lat: number | null
          map_lng: number | null
          price: number
          rooms: number | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          slug: string | null
          status: Database["public"]["Enums"]["property_status"]
          title: string
          type: Database["public"]["Enums"]["property_type"]
          updated_at: string
          video_url: string | null
        }
        Insert: {
          address?: string | null
          area?: number | null
          city?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          district?: string | null
          floor?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          layout?: string | null
          main_image?: string | null
          map_lat?: number | null
          map_lng?: number | null
          price?: number
          rooms?: number | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          title: string
          type: Database["public"]["Enums"]["property_type"]
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          address?: string | null
          area?: number | null
          city?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          district?: string | null
          floor?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          layout?: string | null
          main_image?: string | null
          map_lat?: number | null
          map_lng?: number | null
          price?: number
          rooms?: number | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          title?: string
          type?: Database["public"]["Enums"]["property_type"]
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      property_images: {
        Row: {
          created_at: string
          id: string
          property_id: string
          sort_order: number
          storage_path: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          sort_order?: number
          storage_path?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          sort_order?: number
          storage_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      site_pages: {
        Row: {
          content: Json
          id: string
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          id?: string
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          id?: string
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          about_eyebrow: string | null
          about_stat4_label: string | null
          about_stat4_value: string | null
          about_text: string | null
          about_text_secondary: string | null
          about_title: string | null
          accent_color: string | null
          address: string | null
          allow_registration: boolean
          brand_name: string | null
          brand_tagline: string | null
          catalog_eyebrow: string | null
          catalog_title: string | null
          contact_eyebrow: string | null
          contact_map_embed: string | null
          contact_map_url: string | null
          contact_subtitle: string | null
          contact_title: string | null
          email: string | null
          facebook_url: string | null
          footer_copyright: string | null
          footer_description: string | null
          hero_cta_label: string | null
          hero_cta_link: string | null
          hero_eyebrow: string | null
          hero_image_url: string | null
          hero_secondary_cta_label: string | null
          hero_secondary_cta_link: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: number
          instagram_url: string | null
          logo_url: string | null
          nav_links: Json | null
          phone1: string | null
          phone2: string | null
          primary_color: string | null
          seo_home_description: string | null
          seo_home_keywords: string | null
          seo_home_title: string | null
          services: Json | null
          services_eyebrow: string | null
          services_subtitle: string | null
          services_title: string | null
          stat1_label: string | null
          stat1_value: string | null
          stat2_label: string | null
          stat2_value: string | null
          stat3_label: string | null
          stat3_value: string | null
          testimonials: Json | null
          testimonials_eyebrow: string | null
          testimonials_title: string | null
          updated_at: string
          viber_number: string | null
          whatsapp_number: string | null
          why_eyebrow: string | null
          why_reasons: Json | null
          why_title: string | null
        }
        Insert: {
          about_eyebrow?: string | null
          about_stat4_label?: string | null
          about_stat4_value?: string | null
          about_text?: string | null
          about_text_secondary?: string | null
          about_title?: string | null
          accent_color?: string | null
          address?: string | null
          allow_registration?: boolean
          brand_name?: string | null
          brand_tagline?: string | null
          catalog_eyebrow?: string | null
          catalog_title?: string | null
          contact_eyebrow?: string | null
          contact_map_embed?: string | null
          contact_map_url?: string | null
          contact_subtitle?: string | null
          contact_title?: string | null
          email?: string | null
          facebook_url?: string | null
          footer_copyright?: string | null
          footer_description?: string | null
          hero_cta_label?: string | null
          hero_cta_link?: string | null
          hero_eyebrow?: string | null
          hero_image_url?: string | null
          hero_secondary_cta_label?: string | null
          hero_secondary_cta_link?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: number
          instagram_url?: string | null
          logo_url?: string | null
          nav_links?: Json | null
          phone1?: string | null
          phone2?: string | null
          primary_color?: string | null
          seo_home_description?: string | null
          seo_home_keywords?: string | null
          seo_home_title?: string | null
          services?: Json | null
          services_eyebrow?: string | null
          services_subtitle?: string | null
          services_title?: string | null
          stat1_label?: string | null
          stat1_value?: string | null
          stat2_label?: string | null
          stat2_value?: string | null
          stat3_label?: string | null
          stat3_value?: string | null
          testimonials?: Json | null
          testimonials_eyebrow?: string | null
          testimonials_title?: string | null
          updated_at?: string
          viber_number?: string | null
          whatsapp_number?: string | null
          why_eyebrow?: string | null
          why_reasons?: Json | null
          why_title?: string | null
        }
        Update: {
          about_eyebrow?: string | null
          about_stat4_label?: string | null
          about_stat4_value?: string | null
          about_text?: string | null
          about_text_secondary?: string | null
          about_title?: string | null
          accent_color?: string | null
          address?: string | null
          allow_registration?: boolean
          brand_name?: string | null
          brand_tagline?: string | null
          catalog_eyebrow?: string | null
          catalog_title?: string | null
          contact_eyebrow?: string | null
          contact_map_embed?: string | null
          contact_map_url?: string | null
          contact_subtitle?: string | null
          contact_title?: string | null
          email?: string | null
          facebook_url?: string | null
          footer_copyright?: string | null
          footer_description?: string | null
          hero_cta_label?: string | null
          hero_cta_link?: string | null
          hero_eyebrow?: string | null
          hero_image_url?: string | null
          hero_secondary_cta_label?: string | null
          hero_secondary_cta_link?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: number
          instagram_url?: string | null
          logo_url?: string | null
          nav_links?: Json | null
          phone1?: string | null
          phone2?: string | null
          primary_color?: string | null
          seo_home_description?: string | null
          seo_home_keywords?: string | null
          seo_home_title?: string | null
          services?: Json | null
          services_eyebrow?: string | null
          services_subtitle?: string | null
          services_title?: string | null
          stat1_label?: string | null
          stat1_value?: string | null
          stat2_label?: string | null
          stat2_value?: string | null
          stat3_label?: string | null
          stat3_value?: string | null
          testimonials?: Json | null
          testimonials_eyebrow?: string | null
          testimonials_title?: string | null
          updated_at?: string
          viber_number?: string | null
          whatsapp_number?: string | null
          why_eyebrow?: string | null
          why_reasons?: Json | null
          why_title?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          photo_url: string | null
          role: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          photo_url?: string | null
          role?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          photo_url?: string | null
          role?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      submit_inquiry: {
        Args: {
          _client_key: string
          _email: string
          _message: string
          _name: string
          _phone: string
          _property_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "editor"
      inquiry_status: "Ново" | "Обработено" | "Завършено"
      property_status: "Продава" | "Под наем" | "Продаден" | "Отдаден"
      property_type:
        | "Апартамент"
        | "Къща"
        | "Парцел"
        | "Офис"
        | "Магазин"
        | "Бизнес имот"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "editor"],
      inquiry_status: ["Ново", "Обработено", "Завършено"],
      property_status: ["Продава", "Под наем", "Продаден", "Отдаден"],
      property_type: [
        "Апартамент",
        "Къща",
        "Парцел",
        "Офис",
        "Магазин",
        "Бизнес имот",
      ],
    },
  },
} as const






