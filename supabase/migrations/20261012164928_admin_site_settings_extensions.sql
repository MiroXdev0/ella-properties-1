ALTER TABLE public.site_settings
  ADD COLUMN content_en JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN services_image_url TEXT NOT NULL DEFAULT '/Logo_Credit_Navigator.png',
  ADD COLUMN working_hours JSONB NOT NULL DEFAULT '{"bg":"","en":""}'::jsonb,
  ADD COLUMN og_image_url TEXT;