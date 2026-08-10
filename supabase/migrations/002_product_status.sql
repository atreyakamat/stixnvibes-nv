-- Migration to add status, visibility, and sku to products table

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'status') THEN
        ALTER TABLE public.products ADD COLUMN status text DEFAULT 'active' NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'visibility') THEN
        ALTER TABLE public.products ADD COLUMN visibility text DEFAULT 'visible' NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'sku') THEN
        ALTER TABLE public.products ADD COLUMN sku text UNIQUE;
    END IF;
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS products_status_idx ON public.products(status);
CREATE INDEX IF NOT EXISTS products_visibility_idx ON public.products(visibility);
CREATE INDEX IF NOT EXISTS products_sku_idx ON public.products(sku);

-- Backfill data from metadata jsonb if present
UPDATE public.products
SET 
  status = COALESCE((metadata->>'status'), 'active'),
  visibility = COALESCE((metadata->>'visibility'), 'visible')
WHERE metadata ? 'status' OR metadata ? 'visibility';
