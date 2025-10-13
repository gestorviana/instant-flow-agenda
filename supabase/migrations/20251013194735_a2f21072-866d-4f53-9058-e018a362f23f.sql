-- ============================================================
-- SISTEMA DE AGENDAMENTO SEM SOBREPOSIÇÃO
-- ============================================================

-- A) Habilitar extensão btree_gist para constraint de exclusão
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- B) Adicionar colunas timestamptz para range (se não existirem)
-- Mantemos booking_date + start_time/end_time para compatibilidade
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS starts_at timestamptz;

ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS ends_at timestamptz;

-- C) Trigger para sincronizar starts_at/ends_at com booking_date + start_time/end_time
CREATE OR REPLACE FUNCTION public.sync_booking_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Gerar starts_at a partir de booking_date + start_time
  IF NEW.booking_date IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.starts_at := (NEW.booking_date::text || ' ' || NEW.start_time::text)::timestamptz;
  END IF;
  
  -- Se service_id existe, calcular ends_at automaticamente
  IF NEW.starts_at IS NOT NULL AND NEW.service_id IS NOT NULL THEN
    DECLARE
      v_duration int;
    BEGIN
      SELECT duration_minutes INTO v_duration
      FROM public.services
      WHERE id = NEW.service_id;
      
      IF v_duration IS NOT NULL THEN
        NEW.ends_at := NEW.starts_at + make_interval(mins => v_duration);
        -- Sincronizar end_time também
        NEW.end_time := (NEW.starts_at + make_interval(mins => v_duration))::time;
      END IF;
    END;
  END IF;
  
  -- Se ends_at foi fornecido mas end_time não, sincronizar
  IF NEW.ends_at IS NOT NULL AND NEW.end_time IS NULL THEN
    NEW.end_time := NEW.ends_at::time;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_booking_timestamps ON public.bookings;
CREATE TRIGGER trg_sync_booking_timestamps
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_booking_timestamps();

-- D) Adicionar coluna computada para range
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS slot_range tstzrange
  GENERATED ALWAYS AS (
    CASE 
      WHEN starts_at IS NOT NULL AND ends_at IS NOT NULL 
      THEN tstzrange(starts_at, ends_at, '[)')
      ELSE NULL
    END
  ) STORED;

-- E) Remover constraint antiga se existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_overlap') THEN
    ALTER TABLE public.bookings DROP CONSTRAINT bookings_no_overlap;
  END IF;
END$$;

-- F) Criar constraint de exclusão para impedir sobreposição
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    agenda_id WITH =,
    slot_range WITH &&
  ) WHERE (status IN ('pending', 'confirmed') AND slot_range IS NOT NULL);

-- G) Tornar guest_email opcional
ALTER TABLE public.bookings
  ALTER COLUMN guest_email DROP NOT NULL;

-- H) Garantir que pelo menos um contato existe
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_contact_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_contact_check
  CHECK (guest_email IS NOT NULL OR COALESCE(guest_phone, '') <> '');

-- I) Adicionar slot_step_min na tabela agendas (padrão 30 minutos)
ALTER TABLE public.agendas
  ADD COLUMN IF NOT EXISTS slot_step_min integer DEFAULT 30;

-- J) Função para listar slots disponíveis
CREATE OR REPLACE FUNCTION public.list_available_slots(
  p_agenda_id uuid,
  p_service_id uuid,
  p_date date
)
RETURNS TABLE(slot_start timestamptz, slot_end timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
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
    -- Verificar se não está ocupado
    AND NOT EXISTS (
      SELECT 1 
      FROM bookings b
      WHERE b.agenda_id = p_agenda_id
        AND b.status IN ('pending', 'confirmed')
        AND b.slot_range IS NOT NULL
        AND tstzrange(ts.slot_start, ts.slot_end, '[)') && b.slot_range
    )
  ORDER BY ts.slot_start;
END;
$$;