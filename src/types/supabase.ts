/**
 * Database types mirroring supabase/schema.sql.
 * Regenerate via: npx supabase gen types types --local > src/types/supabase.ts
 * Hand-maintained here so the project typechecks without a running Supabase instance.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProductType =
  | "sticker"
  | "sticker_vinyl"
  | "poster"
  | "spotify_card"
  | "frame"
  | "mystery_pack";

export type OrderStatus =
  | "created"
  | "sent"
  | "confirmed"
  | "paid"
  | "fulfilled"
  | "cancelled"
  | "refunded";

export type Database = {
  graphql_public: { Tables: Record<string, never>; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never> };
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          parent_id: string | null;
          icon: string | null;
          sort_order: number;
          is_featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          parent_id?: string | null;
          icon?: string | null;
          sort_order?: number;
          is_featured?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          short_description: string | null;
          price_cents: number;
          compare_at_cents: number | null;
          currency: string;
          image_url: string | null;
          images: string[] | string;
          type: ProductType;
          category_id: string | null;
          collection: string | null;
          tags: string[];
          stock: number;
          is_featured: boolean;
          is_bundle: boolean;
          is_limited: boolean;
          bundle_ids: string[];
          customizable: boolean;
          rating: number;
          review_count: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          short_description?: string | null;
          price_cents: number;
          compare_at_cents?: number | null;
          currency?: string;
          image_url?: string | null;
          images?: string[] | string;
          type: ProductType;
          category_id?: string | null;
          collection?: string | null;
          tags?: string[];
          stock?: number;
          is_featured?: boolean;
          is_bundle?: boolean;
          is_limited?: boolean;
          bundle_ids?: string[];
          customizable?: boolean;
          rating?: number;
          review_count?: number;
          metadata?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      variants: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          sku: string | null;
          price_modifier_cents: number;
          stock: number;
          attributes: Json;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          sku?: string | null;
          price_modifier_cents?: number;
          stock?: number;
          attributes?: Json;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["variants"]["Insert"]>;
      };
      customizations: {
        Row: {
          id: string;
          product_id: string;
          user_id: string | null;
          data: Json;
          snapshot_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id?: string | null;
          data?: Json;
          snapshot_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["customizations"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          razorpay_order_id: string | null;
          whatsapp_url: string | null;
          customer_name: string;
          customer_phone: string;
          customer_email: string | null;
          address: string;
          pincode: string;
          total_cents: number;
          status: OrderStatus;
          notes: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          razorpay_order_id?: string | null;
          whatsapp_url?: string | null;
          customer_name: string;
          customer_phone: string;
          customer_email?: string | null;
          address: string;
          pincode: string;
          total_cents: number;
          status?: OrderStatus;
          notes?: string | null;
          metadata?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          variant_id: string | null;
          name: string;
          quantity: number;
          price_cents: number;
          image_url: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          name: string;
          quantity: number;
          price_cents: number;
          image_url?: string | null;
          metadata?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string | null;
          author_name: string;
          author_avatar: string | null;
          rating: number;
          comment: string | null;
          is_featured: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id?: string | null;
          author_name: string;
          author_avatar?: string | null;
          rating: number;
          comment?: string | null;
          is_featured?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
      };
      referrals: {
        Row: {
          id: string;
          referrer_user_id: string;
          referred_user_id: string | null;
          referral_code: string;
          referred_email: string | null;
          credit_cents: number;
          used: boolean;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_user_id: string;
          referred_user_id?: string | null;
          referral_code: string;
          referred_email?: string | null;
          credit_cents?: number;
          used?: boolean;
          used_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["referrals"]["Insert"]>;
      };
      analytics: {
        Row: {
          id: string;
          event: string;
          payload: Json;
          session_id: string | null;
          user_id: string | null;
          url: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          event: string;
          payload?: Json;
          session_id?: string | null;
          user_id?: string | null;
          url?: string | null;
          user_agent?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["analytics"]["Insert"]>;
      };
      admin_users: {
        Row: { user_id: string; email: string; created_at: string };
        Insert: { user_id: string; email: string };
        Update: Partial<Database["public"]["Tables"]["admin_users"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      set_updated_at: { Args: Record<string, never>; Returns: unknown };
      recalc_product_rating: { Args: Record<string, never>; Returns: unknown };
    };
    Enums: {
      product_type: ProductType;
      order_status: OrderStatus;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T];
export type Row<T extends keyof Database["public"]["Tables"]> =
  Tables<T>["Row"];
export type Insert<T extends keyof Database["public"]["Tables"]> =
  Tables<T>["Insert"];
export type Update<T extends keyof Database["public"]["Tables"]> =
  Tables<T>["Update"];
