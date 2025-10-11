-- Fix agendas table RLS to allow anonymous users to view active agendas
DROP POLICY IF EXISTS "Public can view active agendas" ON public.agendas;

-- Create new policy that allows both anonymous and authenticated users to view active agendas
CREATE POLICY "Public can view active agendas"
ON public.agendas
FOR SELECT
TO anon, authenticated
USING (is_active = true);