-- Fix clients table policy to allow trigger insertions from anonymous bookings
DROP POLICY IF EXISTS "System can insert clients" ON public.clients;

-- Create new policy that allows both authenticated and anonymous insertions via triggers
CREATE POLICY "System can insert clients"
ON public.clients
FOR INSERT
TO anon, authenticated
WITH CHECK (true);