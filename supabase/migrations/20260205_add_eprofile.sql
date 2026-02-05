-- Add E-Profile classification to businesses
-- E-Profile categories based on annual revenue:
-- E0: Entry (<£0.5m)
-- E1: Emerging (£0.5m-£1.5m)
-- E2: Expansion (£1.5m-£5m)
-- E3: Elevation (£5m-£11m)
-- E4: Established (£11m-£20m)
-- E5: Enterprise (£20m+)

-- Add e_profile column to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS e_profile text
CHECK (e_profile IS NULL OR e_profile IN ('E0', 'E1', 'E2', 'E3', 'E4', 'E5'));

-- Add comment for documentation
COMMENT ON COLUMN public.businesses.e_profile IS 'E-Profile category based on annual revenue: E0 (<0.5m), E1 (0.5m-1.5m), E2 (1.5m-5m), E3 (5m-11m), E4 (11m-20m), E5 (20m+)';

-- Create function to calculate E-Profile from annual revenue
CREATE OR REPLACE FUNCTION public.calculate_e_profile(annual_revenue numeric)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF annual_revenue IS NULL THEN
    RETURN NULL;
  ELSIF annual_revenue < 500000 THEN
    RETURN 'E0';
  ELSIF annual_revenue < 1500000 THEN
    RETURN 'E1';
  ELSIF annual_revenue < 5000000 THEN
    RETURN 'E2';
  ELSIF annual_revenue < 11000000 THEN
    RETURN 'E3';
  ELSIF annual_revenue < 20000000 THEN
    RETURN 'E4';
  ELSE
    RETURN 'E5';
  END IF;
END;
$$;

-- Set initial E-Profile values for existing Chester businesses based on known data
-- Data from Chester Business Database - 03.02.26 - E Profiles.xlsx
UPDATE public.businesses SET e_profile = 'E3' WHERE name = 'Alphabond Technologies Ltd';
UPDATE public.businesses SET e_profile = 'E0' WHERE name = 'Cheshire Fire';
UPDATE public.businesses SET e_profile = 'E2' WHERE name = 'Chespack Hygiene Ltd';
UPDATE public.businesses SET e_profile = 'E0' WHERE name = 'Clock Corner';
UPDATE public.businesses SET e_profile = 'E2' WHERE name = 'Hardwoods Group Ltd';
UPDATE public.businesses SET e_profile = 'E1' WHERE name = 'Haysdale';
UPDATE public.businesses SET e_profile = 'E2' WHERE name = 'HiSpace';
UPDATE public.businesses SET e_profile = 'E3' WHERE name = 'Lancastria LLP';
UPDATE public.businesses SET e_profile = 'E2' WHERE name = 'Merlin Architectural Ltd';
UPDATE public.businesses SET e_profile = 'E2' WHERE name = 'OptimOil Ltd';
UPDATE public.businesses SET e_profile = 'E4' WHERE name = 'RVT Group Ltd';
UPDATE public.businesses SET e_profile = 'E2' WHERE name = 'Spectrum Interiors';
UPDATE public.businesses SET e_profile = 'E1' WHERE name LIKE 'The Keystone Company%';
UPDATE public.businesses SET e_profile = 'E0' WHERE name = 'Trigo Consultancy Services Ltd';
UPDATE public.businesses SET e_profile = 'E0' WHERE name = 'Unistow Global Ltd';

-- Create index for E-Profile filtering
CREATE INDEX IF NOT EXISTS idx_businesses_e_profile ON public.businesses(e_profile);
