ALTER TABLE public.properties
  ADD COLUMN yard_area NUMERIC(10, 2);

ALTER TABLE public.site_settings
  ADD COLUMN services_image_heading TEXT NOT NULL
    DEFAULT 'Съдействаме и за финансирането на Вашия имот';