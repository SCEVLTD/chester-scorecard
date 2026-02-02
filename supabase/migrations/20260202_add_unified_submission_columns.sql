-- Add qualitative scoring columns to company_submissions
-- These allow company users to self-assess their business in the unified form

ALTER TABLE company_submissions
ADD COLUMN IF NOT EXISTS leadership text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS market_demand text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS marketing text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS product_strength text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS supplier_strength text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sales_execution text DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN company_submissions.leadership IS 'Leadership alignment: aligned, minor, misaligned, toxic';
COMMENT ON COLUMN company_submissions.market_demand IS 'Market demand: strong, flat, softening, decline';
COMMENT ON COLUMN company_submissions.marketing IS 'Marketing effectiveness: clear, activity, poor, none';
COMMENT ON COLUMN company_submissions.product_strength IS 'Product/service strength: differentiated, adequate, weak, broken';
COMMENT ON COLUMN company_submissions.supplier_strength IS 'Supplier strength: strong, acceptable, weak, damaging';
COMMENT ON COLUMN company_submissions.sales_execution IS 'Sales execution: beating, onTarget, underperforming, none';
