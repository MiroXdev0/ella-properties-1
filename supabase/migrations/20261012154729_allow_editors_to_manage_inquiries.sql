DROP POLICY IF EXISTS "admins read inquiries" ON public.inquiries;

CREATE POLICY "staff read inquiries"
  ON public.inquiries
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'editor')
  );