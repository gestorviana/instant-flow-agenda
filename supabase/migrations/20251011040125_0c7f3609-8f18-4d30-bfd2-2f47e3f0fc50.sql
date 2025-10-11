-- Re-enable RLS on bookings table with proper policies
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow anyone to insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public can view active agendas" ON public.bookings;

-- Allow public to create bookings (for public booking form)
CREATE POLICY "Public can create bookings"
ON public.bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only agenda owners can view their bookings
CREATE POLICY "Users can view their agenda bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agendas
    WHERE agendas.id = bookings.agenda_id
    AND agendas.user_id = auth.uid()
  )
);

-- Only agenda owners can update their bookings
CREATE POLICY "Users can update their agenda bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agendas
    WHERE agendas.id = bookings.agenda_id
    AND agendas.user_id = auth.uid()
  )
);

-- Update profiles RLS to only show active professionals
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;

CREATE POLICY "Public can view active professional profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agendas
    WHERE agendas.user_id = profiles.id
    AND agendas.is_active = true
  )
);