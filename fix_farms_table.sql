CREATE TABLE public.farms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id),
  farm_name text NOT NULL,
  area_vigha numeric NOT NULL,
  crop_name text NOT NULL,
  soil_type text NOT NULL,
  sowing_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.farms DISABLE ROW LEVEL SECURITY;
