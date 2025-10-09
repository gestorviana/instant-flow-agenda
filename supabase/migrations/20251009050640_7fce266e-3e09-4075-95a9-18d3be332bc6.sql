-- Adicionar campo para mensagem de lembrete padrão
ALTER TABLE settings ADD COLUMN IF NOT EXISTS reminder_message text DEFAULT 'Olá! Este é um lembrete do seu agendamento.';