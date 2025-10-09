-- Add lunch break fields to agendas table
ALTER TABLE public.agendas 
ADD COLUMN lunch_break_start time DEFAULT NULL,
ADD COLUMN lunch_break_end time DEFAULT NULL;