-- Recreate bookings RLS policies with explicit configuration

-- Drop all existing policies on bookings
DROP POLICY IF EXISTS "Public can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view bookings for their agendas" ON public.bookings;
DROP POLICY IF EXISTS "Users can view their agenda bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update bookings for their agendas" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their agenda bookings" ON public.bookings;

-- Create new INSERT policy for anonymous and authenticated users
CREATE POLICY "bookings_insert_public"
ON public.bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create new SELECT policy for anonymous users to view their bookings
CREATE POLICY "bookings_select_public"
ON public.bookings
FOR SELECT
TO anon, authenticated
USING (true);

-- Create SELECT policy for agenda owners
CREATE POLICY "bookings_select_owner"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agendas
    WHERE agendas.id = bookings.agenda_id
    AND agendas.user_id = auth.uid()
  )
);

-- Create UPDATE policy for agenda owners
CREATE POLICY "bookings_update_owner"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agendas
    WHERE agendas.id = bookings.agenda_id
    AND agendas.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agendas
    WHERE agendas.id = bookings.agenda_id
    AND agendas.user_id = auth.uid()
  )
);