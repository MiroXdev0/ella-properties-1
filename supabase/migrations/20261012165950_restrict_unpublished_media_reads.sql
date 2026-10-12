DROP POLICY IF EXISTS "public read images" ON public.property_images;
DROP POLICY IF EXISTS "auth read images" ON public.property_images;

CREATE POLICY "public read published property images"
  ON public.property_images FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.properties
      WHERE properties.id = property_images.property_id
        AND properties.is_published = true
    )
  );

CREATE POLICY "auth read published property images and staff drafts"
  ON public.property_images FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.properties
      WHERE properties.id = property_images.property_id
        AND (
          properties.is_published = true
          OR public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'editor')
        )
    )
  );

DROP POLICY IF EXISTS "public read property images" ON storage.objects;
DROP POLICY IF EXISTS "public read referenced property images" ON storage.objects;
DROP POLICY IF EXISTS "auth read referenced property images" ON storage.objects;

CREATE POLICY "public read referenced property images"
  ON storage.objects FOR SELECT TO anon
  USING (
    bucket_id = 'property-images'
    AND (
      EXISTS (
        SELECT 1
        FROM public.property_images
        JOIN public.properties ON properties.id = property_images.property_id
        WHERE properties.is_published = true
          AND (
            property_images.storage_path = objects.name
            OR property_images.url = '/api/public/media/' || objects.name
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.properties
        WHERE properties.is_published = true
          AND properties.main_image = '/api/public/media/' || objects.name
      )
      OR EXISTS (
        SELECT 1
        FROM public.team_members
        WHERE team_members.is_active = true
          AND team_members.photo_url = '/api/public/media/' || objects.name
      )
      OR EXISTS (
        SELECT 1
        FROM public.site_settings
        WHERE site_settings.id = 1
          AND (
            site_settings.logo_url = '/api/public/media/' || objects.name
            OR site_settings.hero_image_url = '/api/public/media/' || objects.name
            OR site_settings.services_image_url = '/api/public/media/' || objects.name
            OR site_settings.og_image_url = '/api/public/media/' || objects.name
          )
      )
    )
  );

CREATE POLICY "auth read referenced property images"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'property-images'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'editor')
      OR EXISTS (
        SELECT 1
        FROM public.property_images
        JOIN public.properties ON properties.id = property_images.property_id
        WHERE properties.is_published = true
          AND (
            property_images.storage_path = objects.name
            OR property_images.url = '/api/public/media/' || objects.name
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.properties
        WHERE properties.is_published = true
          AND properties.main_image = '/api/public/media/' || objects.name
      )
      OR EXISTS (
        SELECT 1
        FROM public.team_members
        WHERE team_members.is_active = true
          AND team_members.photo_url = '/api/public/media/' || objects.name
      )
      OR EXISTS (
        SELECT 1
        FROM public.site_settings
        WHERE site_settings.id = 1
          AND (
            site_settings.logo_url = '/api/public/media/' || objects.name
            OR site_settings.hero_image_url = '/api/public/media/' || objects.name
            OR site_settings.services_image_url = '/api/public/media/' || objects.name
            OR site_settings.og_image_url = '/api/public/media/' || objects.name
          )
      )
    )
  );