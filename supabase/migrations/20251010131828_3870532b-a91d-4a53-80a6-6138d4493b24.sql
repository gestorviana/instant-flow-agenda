-- Corrigir política RLS para permitir agendamentos públicos
DROP POLICY IF EXISTS "Public can create bookings" ON public.bookings;

CREATE POLICY "Public can create bookings" 
ON public.bookings 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);