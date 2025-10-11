-- Add policy to allow trigger to insert into clients table
CREATE POLICY "System can insert clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Update the handle_booking_client function to use the proper security context
CREATE OR REPLACE FUNCTION public.handle_booking_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user_id from agenda
  SELECT user_id INTO v_user_id
  FROM agendas
  WHERE id = NEW.agenda_id;

  -- Insert or update client bypassing RLS with security definer
  INSERT INTO clients (user_id, name, phone, first_booking_date, total_bookings, last_booking_date)
  VALUES (v_user_id, NEW.guest_name, NEW.guest_phone, NEW.created_at, 1, NEW.created_at)
  ON CONFLICT (user_id, phone)
  DO UPDATE SET
    total_bookings = clients.total_bookings + 1,
    last_booking_date = NEW.created_at,
    updated_at = now();
  
  RETURN NEW;
END;
$function$;