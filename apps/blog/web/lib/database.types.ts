export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
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
      daily_post_stats: {
        Row: {
          avg_time_on_page: number | null;
          bounce_rate: number | null;
          created_at: string | null;
          id: number;
          slug: string;
          stat_date: string;
          unique_visitors: number | null;
          views: number | null;
        };
        Insert: {
          avg_time_on_page?: number | null;
          bounce_rate?: number | null;
          created_at?: string | null;
          id?: number;
          slug: string;
          stat_date: string;
          unique_visitors?: number | null;
          views?: number | null;
        };
        Update: {
          avg_time_on_page?: number | null;
          bounce_rate?: number | null;
          created_at?: string | null;
          id?: number;
          slug?: string;
          stat_date?: string;
          unique_visitors?: number | null;
          views?: number | null;
        };
        Relationships: [];
      };
      post_analytics: {
        Row: {
          created_at: string | null;
          id: number;
          slug: string;
          title: string | null;
          total_views: number | null;
          unique_visitors: number | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          slug: string;
          title?: string | null;
          total_views?: number | null;
          unique_visitors?: number | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          slug?: string;
          title?: string | null;
          total_views?: number | null;
          unique_visitors?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      post_analytics_backup: {
        Row: {
          created_at: string | null;
          id: number | null;
          last_viewed: string | null;
          slug: string | null;
          views: number | null;
        };
        Insert: {
          created_at?: string | null;
          id?: number | null;
          last_viewed?: string | null;
          slug?: string | null;
          views?: number | null;
        };
        Update: {
          created_at?: string | null;
          id?: number | null;
          last_viewed?: string | null;
          slug?: string | null;
          views?: number | null;
        };
        Relationships: [];
      };
      post_view_logs: {
        Row: {
          id: number;
          ip_address: unknown | null;
          referrer: string | null;
          session_id: string | null;
          slug: string;
          user_agent: string | null;
          view_date: string | null;
          view_day_of_week: number | null;
          view_hour: number | null;
          view_month: number | null;
          view_year: number | null;
          viewed_at: string | null;
          visitor_id: string | null;
        };
        Insert: {
          id?: number;
          ip_address?: unknown | null;
          referrer?: string | null;
          session_id?: string | null;
          slug: string;
          user_agent?: string | null;
          view_date?: string | null;
          view_day_of_week?: number | null;
          view_hour?: number | null;
          view_month?: number | null;
          view_year?: number | null;
          viewed_at?: string | null;
          visitor_id?: string | null;
        };
        Update: {
          id?: number;
          ip_address?: unknown | null;
          referrer?: string | null;
          session_id?: string | null;
          slug?: string;
          user_agent?: string | null;
          view_date?: string | null;
          view_day_of_week?: number | null;
          view_hour?: number | null;
          view_month?: number | null;
          view_year?: number | null;
          viewed_at?: string | null;
          visitor_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      aggregate_daily_stats: {
        Args: { target_date?: string };
        Returns: undefined;
      };
      get_daily_view_trend: {
        Args: { days_back?: number; target_slug?: string };
        Returns: {
          stat_date: string;
          total_views: number;
          unique_visitors: number;
        }[];
      };
      get_hourly_traffic_pattern: {
        Args: { days_back?: number };
        Returns: {
          hour: number;
          total_views: number;
        }[];
      };
      get_monthly_view_trend: {
        Args: { target_slug?: string; months_back?: number };
        Returns: {
          total_views: number;
          unique_visitors: number;
          month_date: string;
        }[];
      };
      get_popular_posts: {
        Args: { limit_count?: number; days_back?: number };
        Returns: {
          total_views: number;
          unique_visitors: number;
          slug: string;
        }[];
      };
      get_weekly_traffic_pattern: {
        Args: { days_back?: number };
        Returns: {
          day_of_week: number;
          day_name: string;
          total_views: number;
        }[];
      };
      increment_post_views: {
        Args:
          | { post_slug: string }
          | {
              visitor_ip?: unknown;
              post_slug: string;
              visitor_session_id?: string;
              visitor_user_agent?: string;
              visitor_referrer?: string;
            };
        Returns: number;
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

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
