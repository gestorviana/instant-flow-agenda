-- Adicionar campo para lembrete customizado nos bookings
ALTER TABLE bookings ADD COLUMN custom_reminder text;

-- Criar tabela de clientes
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  first_booking_date timestamp with time zone NOT NULL DEFAULT now(),
  total_bookings integer NOT NULL DEFAULT 1,
  last_booking_date timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, phone)
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para clientes
CREATE POLICY "Users can view their clients" 
ON public.clients 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their clients" 
ON public.clients 
FOR ALL
USING (auth.uid() = user_id);

-- Função para atualizar/criar cliente automaticamente
CREATE OR REPLACE FUNCTION public.handle_booking_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Pegar user_id da agenda
  SELECT user_id INTO v_user_id
  FROM agendas
  WHERE id = NEW.agenda_id;

  -- Inserir ou atualizar cliente
  INSERT INTO clients (user_id, name, phone, first_booking_date, total_bookings, last_booking_date)
  VALUES (v_user_id, NEW.guest_name, NEW.guest_phone, NEW.created_at, 1, NEW.created_at)
  ON CONFLICT (user_id, phone)
  DO UPDATE SET
    total_bookings = clients.total_bookings + 1,
    last_booking_date = NEW.created_at,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Trigger para criar/atualizar cliente quando um booking é criado
CREATE TRIGGER on_booking_created_update_client
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_booking_client();