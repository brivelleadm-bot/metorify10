/*
  # Metorify - Multi-Store WooCommerce Analytics Platform

  ## Overview
  This migration creates the complete database schema for Metorify, a unified dashboard
  for managing multiple WooCommerce stores with revenue, cost, and profit tracking.

  ## New Tables

  ### 1. websites
  Stores WooCommerce store connection details
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users) - for multi-tenant isolation
  - `name` (text) - store display name
  - `base_url` (text) - WooCommerce store URL
  - `consumer_key` (text) - WooCommerce API key (encrypted in app)
  - `consumer_secret` (text) - WooCommerce API secret (encrypted in app)
  - `currency` (text) - store currency code (USD, EUR, etc.)
  - `last_sync_at` (timestamptz) - last successful sync timestamp
  - `sync_enabled` (boolean) - whether automatic syncing is enabled
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. products
  Stores WooCommerce products (parent products)
  - `id` (uuid, primary key)
  - `website_id` (uuid, references websites)
  - `woo_product_id` (bigint) - WooCommerce product ID
  - `name` (text) - product name
  - `sku` (text) - product SKU
  - `type` (text) - product type (simple, variable, etc.)
  - `status` (text) - product status (publish, draft, etc.)
  - `deleted_at` (timestamptz) - soft delete timestamp
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. variants
  Stores product variations (for variable products) and simple products
  - `id` (uuid, primary key)
  - `product_id` (uuid, references products)
  - `website_id` (uuid, references websites)
  - `woo_variation_id` (bigint) - WooCommerce variation ID (null for simple products)
  - `sku` (text) - variant SKU
  - `attributes` (jsonb) - variant attributes (size, color, etc.)
  - `price_regular` (numeric) - regular price
  - `price_sale` (numeric) - sale price
  - `sale_date_from` (timestamptz) - sale start date
  - `sale_date_to` (timestamptz) - sale end date
  - `deleted_at` (timestamptz) - soft delete timestamp
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. costs
  Stores historical cost data for variants (cost tracking over time)
  - `id` (uuid, primary key)
  - `variant_id` (uuid, references variants)
  - `cost_amount` (numeric) - cost per unit
  - `effective_from` (timestamptz) - when this cost becomes effective
  - `created_at` (timestamptz)

  ### 5. orders
  Stores WooCommerce orders
  - `id` (uuid, primary key)
  - `website_id` (uuid, references websites)
  - `woo_order_id` (bigint) - WooCommerce order ID
  - `order_number` (text) - human-readable order number
  - `status` (text) - order status (completed, processing, refunded, etc.)
  - `currency` (text) - order currency
  - `country` (text) - shipping/billing country
  - `customer_email` (text) - customer email
  - `total_amount` (numeric) - total order amount
  - `total_tax` (numeric) - total tax amount
  - `total_shipping` (numeric) - total shipping amount
  - `total_discount` (numeric) - total discount amount
  - `order_date` (timestamptz) - WooCommerce order date
  - `deleted_at` (timestamptz) - soft delete timestamp
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 6. order_items
  Stores individual line items from orders with calculated profit
  - `id` (uuid, primary key)
  - `order_id` (uuid, references orders)
  - `variant_id` (uuid, references variants) - nullable if product deleted
  - `product_id` (uuid, references products) - nullable if product deleted
  - `website_id` (uuid, references websites)
  - `woo_item_id` (bigint) - WooCommerce line item ID
  - `product_name` (text) - snapshot of product name at time of sale
  - `variant_name` (text) - snapshot of variant name at time of sale
  - `sku` (text) - snapshot of SKU at time of sale
  - `quantity` (integer) - quantity ordered
  - `price_per_item` (numeric) - price per unit at time of sale
  - `subtotal` (numeric) - line item subtotal (before discounts)
  - `total` (numeric) - line item total (after discounts)
  - `net_revenue` (numeric) - calculated net revenue (total excluding tax/shipping)
  - `cost_snapshot` (numeric) - cost per unit at time of sale
  - `total_cost` (numeric) - calculated total cost (quantity * cost_snapshot)
  - `profit` (numeric) - calculated profit (net_revenue - total_cost)
  - `profit_margin` (numeric) - calculated margin percentage
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. sync_logs
  Tracks sync operations for debugging and monitoring
  - `id` (uuid, primary key)
  - `website_id` (uuid, references websites)
  - `sync_type` (text) - 'products', 'orders', 'full'
  - `status` (text) - 'running', 'completed', 'failed'
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz)
  - `records_processed` (integer)
  - `error_message` (text)
  - `error_details` (jsonb)
  - `created_at` (timestamptz)

  ### 8. audit_logs
  Tracks sensitive operations like cost edits and credential updates
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `action` (text) - action type
  - `resource_type` (text) - what was modified
  - `resource_id` (uuid) - ID of modified resource
  - `old_values` (jsonb) - previous values
  - `new_values` (jsonb) - new values
  - `created_at` (timestamptz)

  ### 9. daily_metrics
  Pre-aggregated daily metrics for fast analytics queries
  - `id` (uuid, primary key)
  - `website_id` (uuid, references websites)
  - `metric_date` (date) - the date for these metrics
  - `total_orders` (integer)
  - `total_revenue` (numeric)
  - `total_cost` (numeric)
  - `total_profit` (numeric)
  - `avg_margin` (numeric)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Policies ensure users can only access their own data
  - Separate policies for SELECT, INSERT, UPDATE, DELETE operations

  ## Performance
  - Indexes on foreign keys
  - Indexes on frequently queried fields (dates, status, etc.)
  - Composite indexes for common query patterns
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: websites
-- ============================================================================
CREATE TABLE IF NOT EXISTS websites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  base_url text NOT NULL,
  consumer_key text NOT NULL,
  consumer_secret text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  last_sync_at timestamptz,
  sync_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE websites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own websites"
  ON websites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own websites"
  ON websites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own websites"
  ON websites FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own websites"
  ON websites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS websites_user_id_idx ON websites(user_id);
CREATE INDEX IF NOT EXISTS websites_last_sync_at_idx ON websites(last_sync_at);

-- ============================================================================
-- TABLE: products
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  woo_product_id bigint NOT NULL,
  name text NOT NULL,
  sku text,
  type text NOT NULL DEFAULT 'simple',
  status text NOT NULL DEFAULT 'publish',
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(website_id, woo_product_id)
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view products from their websites"
  ON products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = products.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert products to their websites"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = products.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update products from their websites"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = products.website_id
      AND websites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = products.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete products from their websites"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = products.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS products_website_id_idx ON products(website_id);
CREATE INDEX IF NOT EXISTS products_woo_product_id_idx ON products(woo_product_id);
CREATE INDEX IF NOT EXISTS products_deleted_at_idx ON products(deleted_at);

-- ============================================================================
-- TABLE: variants
-- ============================================================================
CREATE TABLE IF NOT EXISTS variants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  woo_variation_id bigint,
  sku text,
  attributes jsonb DEFAULT '{}'::jsonb,
  price_regular numeric(10, 2) NOT NULL DEFAULT 0,
  price_sale numeric(10, 2),
  sale_date_from timestamptz,
  sale_date_to timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, woo_variation_id)
);

ALTER TABLE variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view variants from their websites"
  ON variants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = variants.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert variants to their websites"
  ON variants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = variants.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update variants from their websites"
  ON variants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = variants.website_id
      AND websites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = variants.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete variants from their websites"
  ON variants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = variants.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS variants_product_id_idx ON variants(product_id);
CREATE INDEX IF NOT EXISTS variants_website_id_idx ON variants(website_id);
CREATE INDEX IF NOT EXISTS variants_woo_variation_id_idx ON variants(woo_variation_id);
CREATE INDEX IF NOT EXISTS variants_deleted_at_idx ON variants(deleted_at);

-- ============================================================================
-- TABLE: costs
-- ============================================================================
CREATE TABLE IF NOT EXISTS costs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id uuid NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  cost_amount numeric(10, 2) NOT NULL DEFAULT 0,
  effective_from timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view costs from their variants"
  ON costs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM variants
      JOIN websites ON websites.id = variants.website_id
      WHERE variants.id = costs.variant_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert costs for their variants"
  ON costs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM variants
      JOIN websites ON websites.id = variants.website_id
      WHERE variants.id = costs.variant_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update costs for their variants"
  ON costs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM variants
      JOIN websites ON websites.id = variants.website_id
      WHERE variants.id = costs.variant_id
      AND websites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM variants
      JOIN websites ON websites.id = variants.website_id
      WHERE variants.id = costs.variant_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete costs for their variants"
  ON costs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM variants
      JOIN websites ON websites.id = variants.website_id
      WHERE variants.id = costs.variant_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS costs_variant_id_idx ON costs(variant_id);
CREATE INDEX IF NOT EXISTS costs_effective_from_idx ON costs(effective_from);

-- ============================================================================
-- TABLE: orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  woo_order_id bigint NOT NULL,
  order_number text NOT NULL,
  status text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  country text,
  customer_email text,
  total_amount numeric(10, 2) NOT NULL DEFAULT 0,
  total_tax numeric(10, 2) NOT NULL DEFAULT 0,
  total_shipping numeric(10, 2) NOT NULL DEFAULT 0,
  total_discount numeric(10, 2) NOT NULL DEFAULT 0,
  order_date timestamptz NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(website_id, woo_order_id)
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view orders from their websites"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = orders.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert orders to their websites"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = orders.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update orders from their websites"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = orders.website_id
      AND websites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = orders.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete orders from their websites"
  ON orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = orders.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS orders_website_id_idx ON orders(website_id);
CREATE INDEX IF NOT EXISTS orders_woo_order_id_idx ON orders(woo_order_id);
CREATE INDEX IF NOT EXISTS orders_order_date_idx ON orders(order_date);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_country_idx ON orders(country);
CREATE INDEX IF NOT EXISTS orders_deleted_at_idx ON orders(deleted_at);

-- ============================================================================
-- TABLE: order_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES variants(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  woo_item_id bigint NOT NULL,
  product_name text NOT NULL,
  variant_name text,
  sku text,
  quantity integer NOT NULL DEFAULT 1,
  price_per_item numeric(10, 2) NOT NULL DEFAULT 0,
  subtotal numeric(10, 2) NOT NULL DEFAULT 0,
  total numeric(10, 2) NOT NULL DEFAULT 0,
  net_revenue numeric(10, 2) NOT NULL DEFAULT 0,
  cost_snapshot numeric(10, 2) NOT NULL DEFAULT 0,
  total_cost numeric(10, 2) NOT NULL DEFAULT 0,
  profit numeric(10, 2) NOT NULL DEFAULT 0,
  profit_margin numeric(5, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view order_items from their websites"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = order_items.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert order_items to their websites"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = order_items.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update order_items from their websites"
  ON order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = order_items.website_id
      AND websites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = order_items.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete order_items from their websites"
  ON order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = order_items.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_variant_id_idx ON order_items(variant_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON order_items(product_id);
CREATE INDEX IF NOT EXISTS order_items_website_id_idx ON order_items(website_id);

-- ============================================================================
-- TABLE: sync_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  sync_type text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  records_processed integer DEFAULT 0,
  error_message text,
  error_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sync_logs from their websites"
  ON sync_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = sync_logs.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sync_logs for their websites"
  ON sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = sync_logs.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sync_logs for their websites"
  ON sync_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = sync_logs.website_id
      AND websites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = sync_logs.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS sync_logs_website_id_idx ON sync_logs(website_id);
CREATE INDEX IF NOT EXISTS sync_logs_status_idx ON sync_logs(status);
CREATE INDEX IF NOT EXISTS sync_logs_started_at_idx ON sync_logs(started_at);

-- ============================================================================
-- TABLE: audit_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit_logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit_logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_resource_type_idx ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);

-- ============================================================================
-- TABLE: daily_metrics
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  total_orders integer NOT NULL DEFAULT 0,
  total_revenue numeric(10, 2) NOT NULL DEFAULT 0,
  total_cost numeric(10, 2) NOT NULL DEFAULT 0,
  total_profit numeric(10, 2) NOT NULL DEFAULT 0,
  avg_margin numeric(5, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(website_id, metric_date)
);

ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view daily_metrics from their websites"
  ON daily_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = daily_metrics.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert daily_metrics for their websites"
  ON daily_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = daily_metrics.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update daily_metrics for their websites"
  ON daily_metrics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = daily_metrics.website_id
      AND websites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites
      WHERE websites.id = daily_metrics.website_id
      AND websites.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS daily_metrics_website_id_idx ON daily_metrics(website_id);
CREATE INDEX IF NOT EXISTS daily_metrics_metric_date_idx ON daily_metrics(metric_date);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get current cost for a variant at a specific date
CREATE OR REPLACE FUNCTION get_variant_cost_at_date(
  p_variant_id uuid,
  p_date timestamptz
)
RETURNS numeric AS $$
  SELECT COALESCE(
    (
      SELECT cost_amount
      FROM costs
      WHERE variant_id = p_variant_id
      AND effective_from <= p_date
      ORDER BY effective_from DESC
      LIMIT 1
    ),
    0
  );
$$ LANGUAGE sql STABLE;

-- Function to calculate effective price (considering sale dates)
CREATE OR REPLACE FUNCTION get_effective_price(
  p_price_regular numeric,
  p_price_sale numeric,
  p_sale_date_from timestamptz,
  p_sale_date_to timestamptz,
  p_check_date timestamptz
)
RETURNS numeric AS $$
BEGIN
  IF p_price_sale IS NOT NULL 
     AND p_price_sale > 0 
     AND (p_sale_date_from IS NULL OR p_check_date >= p_sale_date_from)
     AND (p_sale_date_to IS NULL OR p_check_date <= p_sale_date_to)
  THEN
    RETURN p_price_sale;
  ELSE
    RETURN p_price_regular;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update daily metrics for a specific website and date
CREATE OR REPLACE FUNCTION refresh_daily_metrics(
  p_website_id uuid,
  p_date date
)
RETURNS void AS $$
BEGIN
  INSERT INTO daily_metrics (
    website_id,
    metric_date,
    total_orders,
    total_revenue,
    total_cost,
    total_profit,
    avg_margin,
    created_at,
    updated_at
  )
  SELECT
    p_website_id,
    p_date,
    COUNT(DISTINCT o.id),
    COALESCE(SUM(oi.net_revenue), 0),
    COALESCE(SUM(oi.total_cost), 0),
    COALESCE(SUM(oi.profit), 0),
    CASE 
      WHEN SUM(oi.net_revenue) > 0 
      THEN (SUM(oi.profit) / SUM(oi.net_revenue) * 100)
      ELSE 0
    END,
    now(),
    now()
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  WHERE o.website_id = p_website_id
    AND o.deleted_at IS NULL
    AND DATE(o.order_date) = p_date
    AND o.status NOT IN ('cancelled', 'failed', 'trash')
  ON CONFLICT (website_id, metric_date)
  DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    total_revenue = EXCLUDED.total_revenue,
    total_cost = EXCLUDED.total_cost,
    total_profit = EXCLUDED.total_profit,
    avg_margin = EXCLUDED.avg_margin,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_websites_updated_at BEFORE UPDATE ON websites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_metrics_updated_at BEFORE UPDATE ON daily_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
