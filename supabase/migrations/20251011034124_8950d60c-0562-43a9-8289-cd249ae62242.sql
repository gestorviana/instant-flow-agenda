-- Drop and recreate the public insert policy for bookings
DROP POLICY IF EXISTS "Public can create bookings" ON public.bookings;

-- Create a properly configured public insert policy
CREATE POLICY "Public can create bookings" 
ON public.bookings 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);