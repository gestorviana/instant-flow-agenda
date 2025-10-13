-- Adicionar constraint para evitar agendamentos sobrepostos no mesmo horário
-- Essa constraint previne que dois agendamentos tenham overlapping de horários na mesma agenda e data

CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se há sobreposição com agendamentos existentes (pending ou confirmed)
  IF EXISTS (
    SELECT 1
    FROM bookings
    WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND agenda_id = NEW.agenda_id
      AND booking_date = NEW.booking_date
      AND status IN ('pending', 'confirmed')
      AND (
        -- Novo agendamento começa durante um agendamento existente
        (NEW.start_time >= start_time AND NEW.start_time < end_time)
        OR
        -- Novo agendamento termina durante um agendamento existente
        (NEW.end_time > start_time AND NEW.end_time <= end_time)
        OR
        -- Novo agendamento engloba um agendamento existente
        (NEW.start_time <= start_time AND NEW.end_time >= end_time)
      )
  ) THEN
    RAISE EXCEPTION 'Horário não disponível - conflito com agendamento existente';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para verificar overlapping antes de inserir ou atualizar
DROP TRIGGER IF EXISTS check_booking_overlap_trigger ON bookings;
CREATE TRIGGER check_booking_overlap_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_booking_overlap();