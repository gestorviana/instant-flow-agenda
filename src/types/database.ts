export interface Agenda {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  is_active: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  lunch_break_start: string | null;
  lunch_break_end: string | null;
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
  service_id: string | null;
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

export interface Service {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  created_at: string;
}
