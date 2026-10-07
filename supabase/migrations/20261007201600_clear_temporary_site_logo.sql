UPDATE public.site_settings
SET logo_url = NULL
WHERE id = 1
  AND logo_url LIKE '%/__l5e/%';
