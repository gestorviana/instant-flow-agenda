// Tipos temporários até a atualização automática dos tipos do Supabase
export interface Agenda {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  is_active: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface AgendaInsert {
  title: string;
  description?: string | null;
  slug: string;
  user_id: string;
  is_active?: boolean;
}

export interface Booking {
  id: string;
  agenda_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Availability {
  id: string;
  agenda_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at: string;
}
