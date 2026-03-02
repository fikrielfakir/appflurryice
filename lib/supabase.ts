import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cxlbdhtymgquyuqwxdhk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4bGJkaHR5bWdxdXl1cXd4ZGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxODUwMTksImV4cCI6MjA4Nzc2MTAxOX0.ldO5iVh048SEtXqUMYxcLXyVJ6sIj1N3s7TBzByP5nk';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Database {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: number;
          name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          balance: number;
          type: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          balance?: number;
          type?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          balance?: number;
          type?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: number;
          name: string;
          sku: string;
          price: number;
          category: string | null;
          stock_quantity: number;
          unit: string;
          image_url: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          sku: string;
          price: number;
          category?: string | null;
          stock_quantity?: number;
          unit?: string;
          image_url?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          sku?: string;
          price?: number;
          category?: string | null;
          stock_quantity?: number;
          unit?: string;
          image_url?: string | null;
          updated_at?: string;
        };
      };
      sales: {
        Row: {
          id: number;
          contact_id: number | null;
          total_amount: number;
          payment_method: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          contact_id?: number | null;
          total_amount: number;
          payment_method: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          contact_id?: number | null;
          total_amount?: number;
          payment_method?: string;
          status?: string;
          created_at?: string;
        };
      };
      sale_items: {
        Row: {
          id: number;
          sale_id: number | null;
          product_id: number | null;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          id?: number;
          sale_id?: number | null;
          product_id?: number | null;
          quantity: number;
          unit_price: number;
        };
        Update: {
          id?: number;
          sale_id?: number | null;
          product_id?: number | null;
          quantity?: number;
          unit_price?: number;
        };
      };
      users: {
        Row: {
          id: string;
          username: string;
          password: string;
        };
        Insert: {
          id?: string;
          username: string;
          password: string;
        };
        Update: {
          id?: string;
          username?: string;
          password?: string;
        };
      };
    };
  };
}
