INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('property-images', 'property-images', false, 26214400)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = false,
  file_size_limit = EXCLUDED.file_size_limit;