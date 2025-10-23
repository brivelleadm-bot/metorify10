export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      websites: {
        Row: {
          id: string
          user_id: string
          name: string
          base_url: string
          consumer_key: string
          consumer_secret: string
          currency: string
          last_sync_at: string | null
          sync_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          base_url: string
          consumer_key: string
          consumer_secret: string
          currency?: string
          last_sync_at?: string | null
          sync_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          base_url?: string
          consumer_key?: string
          consumer_secret?: string
          currency?: string
          last_sync_at?: string | null
          sync_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          website_id: string
          woo_product_id: number
          name: string
          sku: string | null
          type: string
          status: string
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          website_id: string
          woo_product_id: number
          name: string
          sku?: string | null
          type?: string
          status?: string
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          website_id?: string
          woo_product_id?: number
          name?: string
          sku?: string | null
          type?: string
          status?: string
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      variants: {
        Row: {
          id: string
          product_id: string
          website_id: string
          woo_variation_id: number | null
          sku: string | null
          attributes: Json
          price_regular: number
          price_sale: number | null
          sale_date_from: string | null
          sale_date_to: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          website_id: string
          woo_variation_id?: number | null
          sku?: string | null
          attributes?: Json
          price_regular?: number
          price_sale?: number | null
          sale_date_from?: string | null
          sale_date_to?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          website_id?: string
          woo_variation_id?: number | null
          sku?: string | null
          attributes?: Json
          price_regular?: number
          price_sale?: number | null
          sale_date_from?: string | null
          sale_date_to?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      costs: {
        Row: {
          id: string
          variant_id: string
          cost_amount: number
          effective_from: string
          created_at: string
        }
        Insert: {
          id?: string
          variant_id: string
          cost_amount?: number
          effective_from?: string
          created_at?: string
        }
        Update: {
          id?: string
          variant_id?: string
          cost_amount?: number
          effective_from?: string
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          website_id: string
          woo_order_id: number
          order_number: string
          status: string
          currency: string
          country: string | null
          customer_email: string | null
          total_amount: number
          total_tax: number
          total_shipping: number
          total_discount: number
          order_date: string
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          website_id: string
          woo_order_id: number
          order_number: string
          status: string
          currency?: string
          country?: string | null
          customer_email?: string | null
          total_amount?: number
          total_tax?: number
          total_shipping?: number
          total_discount?: number
          order_date: string
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          website_id?: string
          woo_order_id?: number
          order_number?: string
          status?: string
          currency?: string
          country?: string | null
          customer_email?: string | null
          total_amount?: number
          total_tax?: number
          total_shipping?: number
          total_discount?: number
          order_date?: string
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          variant_id: string | null
          product_id: string | null
          website_id: string
          woo_item_id: number
          product_name: string
          variant_name: string | null
          sku: string | null
          quantity: number
          price_per_item: number
          subtotal: number
          total: number
          net_revenue: number
          cost_snapshot: number
          total_cost: number
          profit: number
          profit_margin: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          variant_id?: string | null
          product_id?: string | null
          website_id: string
          woo_item_id: number
          product_name: string
          variant_name?: string | null
          sku?: string | null
          quantity?: number
          price_per_item?: number
          subtotal?: number
          total?: number
          net_revenue?: number
          cost_snapshot?: number
          total_cost?: number
          profit?: number
          profit_margin?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          variant_id?: string | null
          product_id?: string | null
          website_id?: string
          woo_item_id?: number
          product_name?: string
          variant_name?: string | null
          sku?: string | null
          quantity?: number
          price_per_item?: number
          subtotal?: number
          total?: number
          net_revenue?: number
          cost_snapshot?: number
          total_cost?: number
          profit?: number
          profit_margin?: number
          created_at?: string
          updated_at?: string
        }
      }
      sync_logs: {
        Row: {
          id: string
          website_id: string
          sync_type: string
          status: string
          started_at: string
          completed_at: string | null
          records_processed: number | null
          error_message: string | null
          error_details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          website_id: string
          sync_type: string
          status?: string
          started_at?: string
          completed_at?: string | null
          records_processed?: number | null
          error_message?: string | null
          error_details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          website_id?: string
          sync_type?: string
          status?: string
          started_at?: string
          completed_at?: string | null
          records_processed?: number | null
          error_message?: string | null
          error_details?: Json | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          resource_type: string
          resource_id: string | null
          old_values: Json | null
          new_values: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          resource_type: string
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          resource_type?: string
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          created_at?: string
        }
      }
      daily_metrics: {
        Row: {
          id: string
          website_id: string
          metric_date: string
          total_orders: number
          total_revenue: number
          total_cost: number
          total_profit: number
          avg_margin: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          website_id: string
          metric_date: string
          total_orders?: number
          total_revenue?: number
          total_cost?: number
          total_profit?: number
          avg_margin?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          website_id?: string
          metric_date?: string
          total_orders?: number
          total_revenue?: number
          total_cost?: number
          total_profit?: number
          avg_margin?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_variant_cost_at_date: {
        Args: {
          p_variant_id: string
          p_date: string
        }
        Returns: number
      }
      get_effective_price: {
        Args: {
          p_price_regular: number
          p_price_sale: number
          p_sale_date_from: string
          p_sale_date_to: string
          p_check_date: string
        }
        Returns: number
      }
      refresh_daily_metrics: {
        Args: {
          p_website_id: string
          p_date: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
