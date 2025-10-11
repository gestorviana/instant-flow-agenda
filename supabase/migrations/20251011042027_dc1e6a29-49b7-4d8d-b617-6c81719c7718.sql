-- Fix services and availability tables RLS to allow anonymous access

-- Services table
DROP POLICY IF EXISTS "Public can view active services" ON public.services;
CREATE POLICY "Public can view active services"
ON public.services
FOR SELECT
TO anon, authenticated
USING (active = true);

-- Availability table
DROP POLICY IF EXISTS "Public can view availability" ON public.availability;
CREATE POLICY "Public can view availability"
ON public.availability
FOR SELECT
TO anon, authenticated
USING (true);