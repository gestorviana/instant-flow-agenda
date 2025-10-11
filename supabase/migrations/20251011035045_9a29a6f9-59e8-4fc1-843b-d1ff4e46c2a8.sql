-- Temporarily disable the trigger to test
DROP TRIGGER IF EXISTS on_booking_created ON public.bookings;

-- Add a simpler policy that definitely allows public inserts
DROP POLICY IF EXISTS "Public can create bookings" ON public.bookings;

CREATE POLICY "Allow anyone to insert bookings"
ON public.bookings
FOR INSERT
WITH CHECK (true);