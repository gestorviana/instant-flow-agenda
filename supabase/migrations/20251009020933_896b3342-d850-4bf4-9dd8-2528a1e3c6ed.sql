-- Create services table
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL,
  price decimal(10,2) NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their services"
ON public.services FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Public can view active services"
ON public.services FOR SELECT
USING (active = true);

-- Create expenses table
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL,
  category text NOT NULL,
  amount decimal(10,2) NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their expenses"
ON public.expenses FOR ALL
USING (auth.uid() = user_id);

-- Create settings table
CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  webhook_url text,
  reminders_minutes integer[] DEFAULT ARRAY[30],
  work_days jsonb DEFAULT '{"0":false,"1":true,"2":true,"3":true,"4":true,"5":true,"6":false}',
  lunch_break jsonb,
  temp_blocks jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their settings"
ON public.settings FOR ALL
USING (auth.uid() = user_id);

-- Add service_id to bookings
ALTER TABLE public.bookings 
ADD COLUMN service_id uuid REFERENCES public.services(id) ON DELETE SET NULL;

-- Update profiles with photo_url
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS photo_url text;

-- Update trigger for services
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for settings
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();