-- Adicionar search_path à função list_available_slots para segurança
DROP FUNCTION IF EXISTS public.list_available_slots(uuid, uuid, date);

CREATE FUNCTION public.list_available_slots(
  p_agenda_id uuid,
  p_service_id uuid,
  p_date date
)
RETURNS TABLE(slot_start timestamptz, slot_end timestamptz)
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
WITH cfg AS (
  -- Obter configurações da agenda e duração do serviço
  SELECT a.slot_step_min, s.duration_minutes
  FROM agendas a
  JOIN services s ON s.user_id = a.user_id
  WHERE a.id = p_agenda_id 
    AND s.id = p_service_id 
    AND a.is_active = true
    AND s.active = true
  LIMIT 1
),
win AS (
  -- Janelas de disponibilidade para o dia da semana
  SELECT av.start_time, av.end_time
  FROM availability av
  WHERE av.agenda_id = p_agenda_id
    AND av.day_of_week = EXTRACT(DOW FROM p_date)::int
),
series AS (
  -- Gerar série de horários baseado no step (30 em 30 minutos)
  SELECT
    (p_date::timestamptz + win.start_time + make_interval(mins => g * cfg.slot_step_min))::timestamptz AS slot_start,
    cfg.duration_minutes
  FROM cfg, win, generate_series(0, 1440) g
  WHERE (win.start_time + make_interval(mins => g * cfg.slot_step_min + cfg.duration_minutes)) <= win.end_time
),
slots AS (
  -- Criar slots com início e fim
  SELECT
    s.slot_start,
    (s.slot_start + make_interval(mins => s.duration_minutes))::timestamptz AS slot_end
  FROM series s
),
agenda_lunch AS (
  -- Horário de almoço
  SELECT lunch_break_start, lunch_break_end
  FROM agendas
  WHERE id = p_agenda_id
)
SELECT slots.slot_start, slots.slot_end
FROM slots
CROSS JOIN agenda_lunch al
WHERE 
  -- Apenas slots futuros
  slots.slot_start >= NOW()
  -- Não conflita com horário de almoço
  AND (
    al.lunch_break_start IS NULL 
    OR al.lunch_break_end IS NULL
    OR NOT (
      slots.slot_start::time >= al.lunch_break_start 
      AND slots.slot_start::time < al.lunch_break_end
    )
  )
  -- Não está ocupado (verifica conflito com starts_at/ends_at)
  AND NOT EXISTS (
    SELECT 1 
    FROM bookings b
    WHERE b.agenda_id = p_agenda_id
      AND COALESCE(b.status, 'confirmed') IN ('pending', 'confirmed')
      AND b.starts_at IS NOT NULL
      AND b.ends_at IS NOT NULL
      AND tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(slots.slot_start, slots.slot_end, '[)')
  )
ORDER BY slots.slot_start;
$$;