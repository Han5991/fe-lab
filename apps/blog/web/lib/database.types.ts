export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      post_views: {
        Row: {
          slug: string;
          view_count: number;
          updated_at: string;
        };
        Insert: {
          slug: string;
          view_count?: number;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          view_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_view_count: {
        Args: {
          slug_input: string;
        };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};