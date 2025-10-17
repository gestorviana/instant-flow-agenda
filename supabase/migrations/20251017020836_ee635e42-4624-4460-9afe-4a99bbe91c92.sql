-- Corrigir função list_available_slots para detectar conflitos corretamente
CREATE OR REPLACE FUNCTION public.list_available_slots(
  p_agenda_id uuid,
  p_service_id uuid,
  p_date date
)
RETURNS TABLE(slot_start timestamptz, slot_end timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_step integer;
  v_duration integer;
  v_day_of_week integer;
  v_lunch_start time;
  v_lunch_end time;
BEGIN
  -- Obter configurações
  SELECT a.slot_step_min, s.duration_minutes, a.lunch_break_start, a.lunch_break_end
  INTO v_slot_step, v_duration, v_lunch_start, v_lunch_end
  FROM agendas a
  CROSS JOIN services s
  WHERE a.id = p_agenda_id 
    AND s.id = p_service_id
    AND a.is_active = true
    AND s.active = true;

  IF v_slot_step IS NULL OR v_duration IS NULL THEN
    RETURN;
  END IF;

  v_day_of_week := EXTRACT(DOW FROM p_date)::integer;

  RETURN QUERY
  WITH 
  available_windows AS (
    SELECT av.start_time, av.end_time
    FROM availability av
    WHERE av.agenda_id = p_agenda_id
      AND av.day_of_week = v_day_of_week
  ),
  time_slots AS (
    SELECT 
      (p_date::timestamp + w.start_time + (g * v_slot_step || ' minutes')::interval) AT TIME ZONE 'UTC' AS slot_start,
      (p_date::timestamp + w.start_time + ((g * v_slot_step + v_duration) || ' minutes')::interval) AT TIME ZONE 'UTC' AS slot_end
    FROM available_windows w
    CROSS JOIN generate_series(0, 1440, v_slot_step) g
    WHERE (w.start_time + ((g * v_slot_step + v_duration) || ' minutes')::interval) <= w.end_time
  )
  SELECT ts.slot_start, ts.slot_end
  FROM time_slots ts
  WHERE 
    -- Apenas slots futuros
    ts.slot_start >= NOW()
    -- Não conflita com almoço
    AND (
      v_lunch_start IS NULL 
      OR v_lunch_end IS NULL 
      OR NOT (
        ts.slot_start::time >= v_lunch_start 
        AND ts.slot_start::time < v_lunch_end
      )
    )
    -- Não há conflito com agendamentos (verifica qualquer sobreposição)
    AND NOT EXISTS (
      SELECT 1 
      FROM bookings b
      WHERE b.agenda_id = p_agenda_id
        AND b.status IN ('pending', 'confirmed')
        AND b.starts_at IS NOT NULL
        AND b.ends_at IS NOT NULL
        -- Verifica se há qualquer sobreposição entre os intervalos
        AND (
          -- Novo slot começa durante um agendamento existente
          (ts.slot_start >= b.starts_at AND ts.slot_start < b.ends_at)
          OR
          -- Novo slot termina durante um agendamento existente  
          (ts.slot_end > b.starts_at AND ts.slot_end <= b.ends_at)
          OR
          -- Novo slot engloba completamente um agendamento existente
          (ts.slot_start <= b.starts_at AND ts.slot_end >= b.ends_at)
        )
    )
  ORDER BY ts.slot_start;
END;
$$;