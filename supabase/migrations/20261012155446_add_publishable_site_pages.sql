ALTER TABLE public.site_pages
  ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "public read pages" ON public.site_pages;
CREATE POLICY "public read published pages"
  ON public.site_pages
  FOR SELECT
  TO anon
  USING (is_published = true);

DROP POLICY IF EXISTS "auth read pages" ON public.site_pages;
CREATE POLICY "staff read pages"
  ON public.site_pages
  FOR SELECT
  TO authenticated
  USING (
    is_published = true
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'editor')
  );