-- Krushi Sarathi DB Schema

CREATE TABLE public.users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text UNIQUE NOT NULL,
  password text,
  role text DEFAULT 'FARMER' CHECK (role IN ('FARMER', 'OFFICER', 'ADMIN')),
  location text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.disease_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id uuid REFERENCES public.users(id),
  farmer_name text,
  crop text,
  ai_disease text,
  confidence_score numeric,
  image_url text,
  lat numeric,
  lng numeric,
  location_name text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected')),
  officer_notes text,
  followup_status text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.iot_sensors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id uuid REFERENCES public.users(id),
  device_id text UNIQUE NOT NULL,
  moisture_level numeric,
  bug_count integer,
  last_updated timestamp with time zone DEFAULT now()
);

-- Initial Admin Seed
INSERT INTO public.users (name, phone, password, role) 
VALUES ('System Admin', '9999999999', 'admin123', 'ADMIN')
ON CONFLICT (phone) DO NOTHING;

CREATE TABLE public.bulletins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  officer_id uuid REFERENCES public.users(id),
  region text,
  message text,
  created_at timestamp with time zone DEFAULT now()
);
