-- Fix bookings table RLS to allow anonymous users to create bookings

DROP POLICY IF EXISTS "Public can create bookings" ON public.bookings;

CREATE POLICY "Public can create bookings"
ON public.bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);