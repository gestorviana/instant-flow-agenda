-- Tornar o campo de e-mail opcional
ALTER TABLE public.bookings
  ALTER COLUMN guest_email DROP NOT NULL;

-- Garantir que tenha ao menos um contato válido (telefone ou e-mail)
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_contact_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_contact_check
  CHECK (
    guest_email IS NOT NULL
    OR COALESCE(guest_phone, '') <> ''
  );