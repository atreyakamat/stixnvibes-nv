-- 001_admin_bos.sql

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  properties jsonb DEFAULT '{}'::jsonb,
  cost_per_unit_cents int DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sizes table
CREATE TABLE IF NOT EXISTS sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  width_mm numeric,
  height_mm numeric,
  category text,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_materials table
CREATE TABLE IF NOT EXISTS product_materials (
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  material_id uuid REFERENCES materials(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, material_id)
);

-- Create product_sizes table
CREATE TABLE IF NOT EXISTS product_sizes (
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  size_id uuid REFERENCES sizes(id) ON DELETE CASCADE,
  price_modifier_cents int DEFAULT 0,
  PRIMARY KEY (product_id, size_id)
);

-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_collections table
CREATE TABLE IF NOT EXISTS product_collections (
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES collections(id) ON DELETE CASCADE,
  sort_order int DEFAULT 0,
  PRIMARY KEY (product_id, collection_id)
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL DEFAULT 'general',
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Create pages table
CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_published boolean DEFAULT false,
  seo_title text,
  seo_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customer_summary view
CREATE OR REPLACE VIEW customer_summary AS
SELECT 
  customer_phone,
  MAX(customer_name) as customer_name,
  MAX(customer_email) as customer_email,
  COUNT(id) as total_orders,
  SUM(total_cents) as total_spent,
  MAX(created_at) as last_order_at,
  MIN(created_at) as first_order_at
FROM orders
GROUP BY customer_phone;

-- Alter products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE products ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'visible';
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_cents int DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_grams int;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description text;

-- Indexes
CREATE INDEX IF NOT EXISTS materials_slug_idx ON materials(slug);
CREATE INDEX IF NOT EXISTS materials_is_active_sort_order_idx ON materials(is_active, sort_order);

CREATE INDEX IF NOT EXISTS sizes_slug_idx ON sizes(slug);
CREATE INDEX IF NOT EXISTS sizes_category_idx ON sizes(category);
CREATE INDEX IF NOT EXISTS sizes_is_active_sort_order_idx ON sizes(is_active, sort_order);

CREATE INDEX IF NOT EXISTS collections_slug_idx ON collections(slug);
CREATE INDEX IF NOT EXISTS collections_is_active_sort_order_idx ON collections(is_active, sort_order);

CREATE INDEX IF NOT EXISTS pages_slug_idx ON pages(slug);
CREATE INDEX IF NOT EXISTS pages_is_published_idx ON pages(is_published);

CREATE INDEX IF NOT EXISTS settings_category_idx ON settings(category);

CREATE INDEX IF NOT EXISTS products_status_idx ON products(status);
CREATE INDEX IF NOT EXISTS products_visibility_idx ON products(visibility);
CREATE INDEX IF NOT EXISTS products_sku_idx ON products(sku);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_materials_updated_at ON materials;
CREATE TRIGGER set_materials_updated_at BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_sizes_updated_at ON sizes;
CREATE TRIGGER set_sizes_updated_at BEFORE UPDATE ON sizes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_collections_updated_at ON collections;
CREATE TRIGGER set_collections_updated_at BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_settings_updated_at ON settings;
CREATE TRIGGER set_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_pages_updated_at ON pages;
CREATE TRIGGER set_pages_updated_at BEFORE UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Materials
DROP POLICY IF EXISTS "Public can view materials" ON materials;
CREATE POLICY "Public can view materials" ON materials FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage materials" ON materials;
CREATE POLICY "Admins can manage materials" ON materials USING (public.is_admin());

-- Sizes
DROP POLICY IF EXISTS "Public can view sizes" ON sizes;
CREATE POLICY "Public can view sizes" ON sizes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage sizes" ON sizes;
CREATE POLICY "Admins can manage sizes" ON sizes USING (public.is_admin());

-- Product Materials
DROP POLICY IF EXISTS "Public can view product_materials" ON product_materials;
CREATE POLICY "Public can view product_materials" ON product_materials FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage product_materials" ON product_materials;
CREATE POLICY "Admins can manage product_materials" ON product_materials USING (public.is_admin());

-- Product Sizes
DROP POLICY IF EXISTS "Public can view product_sizes" ON product_sizes;
CREATE POLICY "Public can view product_sizes" ON product_sizes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage product_sizes" ON product_sizes;
CREATE POLICY "Admins can manage product_sizes" ON product_sizes USING (public.is_admin());

-- Collections
DROP POLICY IF EXISTS "Public can view collections" ON collections;
CREATE POLICY "Public can view collections" ON collections FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage collections" ON collections;
CREATE POLICY "Admins can manage collections" ON collections USING (public.is_admin());

-- Product Collections
DROP POLICY IF EXISTS "Public can view product_collections" ON product_collections;
CREATE POLICY "Public can view product_collections" ON product_collections FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage product_collections" ON product_collections;
CREATE POLICY "Admins can manage product_collections" ON product_collections USING (public.is_admin());

-- Pages
DROP POLICY IF EXISTS "Public can view published pages" ON pages;
CREATE POLICY "Public can view published pages" ON pages FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS "Admins can manage pages" ON pages;
CREATE POLICY "Admins can manage pages" ON pages USING (public.is_admin());

-- Settings
DROP POLICY IF EXISTS "Admins can manage settings" ON settings;
CREATE POLICY "Admins can manage settings" ON settings FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can write settings" ON settings;
CREATE POLICY "Admins can write settings" ON settings FOR ALL USING (public.is_admin());
