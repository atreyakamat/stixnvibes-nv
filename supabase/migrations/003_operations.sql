-- 003_operations.sql

CREATE TABLE IF NOT EXISTS print_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text NOT NULL UNIQUE,
  material text NOT NULL,
  finish text NOT NULL,
  size text NOT NULL,
  printer_id text NOT NULL DEFAULT 'Printer-01',
  order_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued',
  est_time_mins int NOT NULL DEFAULT 30,
  operator text NOT NULL DEFAULT 'operator_1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS production_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  print_batch_id uuid REFERENCES print_batches(id),
  status text NOT NULL DEFAULT 'queued',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quality_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_job_id uuid NOT NULL REFERENCES production_jobs(id) ON DELETE CASCADE,
  operator text NOT NULL,
  result text NOT NULL,
  failure_reason text,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  courier text NOT NULL,
  awb text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'manifested',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status text NOT NULL,
  location text,
  timestamp timestamptz NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  filename text NOT NULL,
  mime_type text NOT NULL,
  size_bytes int NOT NULL,
  alt_text text,
  folder text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS print_batches_status_idx ON print_batches(status);
CREATE INDEX IF NOT EXISTS print_batches_material_idx ON print_batches(material);
CREATE INDEX IF NOT EXISTS production_jobs_order_item_id_idx ON production_jobs(order_item_id);
CREATE INDEX IF NOT EXISTS production_jobs_print_batch_id_idx ON production_jobs(print_batch_id);
CREATE INDEX IF NOT EXISTS production_jobs_status_idx ON production_jobs(status);
CREATE INDEX IF NOT EXISTS quality_checks_production_job_id_idx ON quality_checks(production_job_id);
CREATE INDEX IF NOT EXISTS quality_checks_result_idx ON quality_checks(result);
CREATE INDEX IF NOT EXISTS shipment_events_shipment_id_idx ON shipment_events(shipment_id);

-- Updated at triggers
DROP TRIGGER IF EXISTS set_print_batches_updated_at ON print_batches;
CREATE TRIGGER set_print_batches_updated_at BEFORE UPDATE ON print_batches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_production_jobs_updated_at ON production_jobs;
CREATE TRIGGER set_production_jobs_updated_at BEFORE UPDATE ON production_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_shipments_updated_at ON shipments;
CREATE TRIGGER set_shipments_updated_at BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS (allow admins only)
ALTER TABLE print_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage print_batches" ON print_batches USING (public.is_admin());
CREATE POLICY "Admins can manage production_jobs" ON production_jobs USING (public.is_admin());
CREATE POLICY "Admins can manage quality_checks" ON quality_checks USING (public.is_admin());
CREATE POLICY "Admins can manage shipments" ON shipments USING (public.is_admin());
CREATE POLICY "Admins can manage shipment_events" ON shipment_events USING (public.is_admin());
CREATE POLICY "Admins can manage media" ON media USING (public.is_admin());
CREATE POLICY "Public can view media" ON media FOR SELECT USING (true);
