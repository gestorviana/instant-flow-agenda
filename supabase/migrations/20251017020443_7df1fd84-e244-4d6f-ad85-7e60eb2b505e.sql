-- Adicionar coluna slot_step_min se não existir (30 minutos padrão)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agendas' AND column_name = 'slot_step_min'
  ) THEN
    ALTER TABLE agendas ADD COLUMN slot_step_min integer DEFAULT 30 NOT NULL;
  END IF;
END $$;

-- Recriar função list_available_slots otimizada
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
  -- Obter configurações da agenda e duração do serviço
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

  -- Dia da semana (0=domingo, 6=sábado)
  v_day_of_week := EXTRACT(DOW FROM p_date)::integer;

  -- Retornar slots disponíveis
  RETURN QUERY
  WITH 
  -- Janelas de disponibilidade para o dia
  available_windows AS (
    SELECT av.start_time, av.end_time
    FROM availability av
    WHERE av.agenda_id = p_agenda_id
      AND av.day_of_week = v_day_of_week
  ),
  -- Gerar série de slots baseado no step (30 em 30 minutos)
  time_slots AS (
    SELECT 
      (p_date + w.start_time + (g * v_slot_step || ' minutes')::interval)::timestamptz AS slot_start,
      (p_date + w.start_time + (g * v_slot_step || ' minutes')::interval + (v_duration || ' minutes')::interval)::timestamptz AS slot_end
    FROM available_windows w
    CROSS JOIN generate_series(0, 1440, v_slot_step) g
    WHERE (w.start_time + (g * v_slot_step || ' minutes')::interval + (v_duration || ' minutes')::interval) <= w.end_time
  ),
  -- Filtrar slots que conflitam com agendamentos existentes
  valid_slots AS (
    SELECT ts.slot_start, ts.slot_end
    FROM time_slots ts
    WHERE 
      -- Apenas slots futuros
      ts.slot_start >= NOW()
      -- Não conflita com horário de almoço
      AND (
        v_lunch_start IS NULL 
        OR v_lunch_end IS NULL 
        OR NOT (
          ts.slot_start::time >= v_lunch_start 
          AND ts.slot_start::time < v_lunch_end
        )
      )
      -- Não está ocupado (nenhum agendamento ativo)
      AND NOT EXISTS (
        SELECT 1 
        FROM bookings b
        WHERE b.agenda_id = p_agenda_id
          AND b.status IN ('pending', 'confirmed')
          AND b.starts_at IS NOT NULL
          AND b.ends_at IS NOT NULL
          -- Verifica sobreposição de horários
          AND (
            (ts.slot_start >= b.starts_at AND ts.slot_start < b.ends_at)
            OR (ts.slot_end > b.starts_at AND ts.slot_end <= b.ends_at)
            OR (ts.slot_start <= b.starts_at AND ts.slot_end >= b.ends_at)
          )
      )
  )
  SELECT vs.slot_start, vs.slot_end
  FROM valid_slots vs
  ORDER BY vs.slot_start;
END;
$$;