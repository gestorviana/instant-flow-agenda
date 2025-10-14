-- 1) Policy para SELECT público ver bookings (essencial para list_available_slots funcionar)
DROP POLICY IF EXISTS "bookings_select_public_for_availability" ON public.bookings;
CREATE POLICY "bookings_select_public_for_availability"
ON public.bookings
FOR SELECT
TO anon, authenticated
USING (coalesce(status,'confirmed') IN ('pending','confirmed'));

-- 2) Garantir que ends_at > starts_at
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_ends_after_starts;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_ends_after_starts
  CHECK (ends_at > starts_at);

-- 3) Atualizar trigger para calcular ends_at e validar
CREATE OR REPLACE FUNCTION public.sync_booking_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duration int;
BEGIN
  -- Gerar starts_at a partir de booking_date + start_time se necessário
  IF NEW.starts_at IS NULL AND NEW.booking_date IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.starts_at := (NEW.booking_date::text || ' ' || NEW.start_time::text)::timestamptz;
  END IF;
  
  -- Calcular ends_at automaticamente se não fornecido
  IF NEW.ends_at IS NULL AND NEW.starts_at IS NOT NULL AND NEW.service_id IS NOT NULL THEN
    SELECT duration_minutes INTO v_duration
    FROM public.services
    WHERE id = NEW.service_id;
    
    IF v_duration IS NULL THEN
      RAISE EXCEPTION 'duration_minutes não encontrado para service_id=%', NEW.service_id;
    END IF;
    
    NEW.ends_at := NEW.starts_at + make_interval(mins => v_duration);
  END IF;
  
  -- Validar que ends_at > starts_at
  IF NEW.ends_at IS NOT NULL AND NEW.starts_at IS NOT NULL AND NEW.ends_at <= NEW.starts_at THEN
    RAISE EXCEPTION 'ends_at deve ser maior que starts_at';
  END IF;
  
  -- Sincronizar campos legacy
  IF NEW.ends_at IS NOT NULL AND NEW.end_time IS NULL THEN
    NEW.end_time := NEW.ends_at::time;
  END IF;
  
  IF NEW.starts_at IS NOT NULL THEN
    NEW.booking_date := NEW.starts_at::date;
    NEW.start_time := NEW.starts_at::time;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4) Recriar função list_available_slots otimizada
CREATE OR REPLACE FUNCTION public.list_available_slots(
  p_agenda_id uuid,
  p_service_id uuid,
  p_date date
)
RETURNS TABLE(slot_start timestamptz, slot_end timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_step int;
  v_duration int;
  v_day_of_week int;
BEGIN
  -- Obter configurações
  SELECT a.slot_step_min INTO v_slot_step
  FROM agendas a
  WHERE a.id = p_agenda_id AND a.is_active = true;
  
  IF v_slot_step IS NULL THEN
    RAISE EXCEPTION 'Agenda não encontrada ou inativa';
  END IF;
  
  SELECT s.duration_minutes INTO v_duration
  FROM services s
  WHERE s.id = p_service_id AND s.active = true;
  
  IF v_duration IS NULL THEN
    RAISE EXCEPTION 'Serviço não encontrado ou inativo';
  END IF;
  
  -- Dia da semana (0=domingo)
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Retornar slots disponíveis
  RETURN QUERY
  WITH availability_windows AS (
    SELECT av.start_time, av.end_time
    FROM availability av
    WHERE av.agenda_id = p_agenda_id
      AND av.day_of_week = v_day_of_week
  ),
  time_slots AS (
    SELECT
      (p_date::timestamp + aw.start_time + (g * v_slot_step || ' minutes')::interval)::timestamptz AS slot_start,
      (p_date::timestamp + aw.start_time + (g * v_slot_step || ' minutes')::interval + (v_duration || ' minutes')::interval)::timestamptz AS slot_end
    FROM availability_windows aw
    CROSS JOIN generate_series(0, 1440, v_slot_step) g
    WHERE (aw.start_time + (g * v_slot_step || ' minutes')::interval + (v_duration || ' minutes')::interval) <= aw.end_time
  ),
  agenda_lunch AS (
    SELECT lunch_break_start, lunch_break_end
    FROM agendas
    WHERE id = p_agenda_id
  )
  SELECT ts.slot_start, ts.slot_end
  FROM time_slots ts
  CROSS JOIN agenda_lunch al
  WHERE ts.slot_start >= NOW() -- Apenas slots futuros
    -- Verificar se não conflita com horário de almoço
    AND (
      al.lunch_break_start IS NULL 
      OR al.lunch_break_end IS NULL
      OR NOT (
        ts.slot_start::time >= al.lunch_break_start 
        AND ts.slot_start::time < al.lunch_break_end
      )
    )
    -- CRÍTICO: Verificar se não está ocupado usando slot_range
    AND NOT EXISTS (
      SELECT 1 
      FROM bookings b
      WHERE b.agenda_id = p_agenda_id
        AND COALESCE(b.status, 'confirmed') IN ('pending', 'confirmed')
        AND b.slot_range IS NOT NULL
        AND tstzrange(ts.slot_start, ts.slot_end, '[)') && b.slot_range
    )
  ORDER BY ts.slot_start;
END;
$$;