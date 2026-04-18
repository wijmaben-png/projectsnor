ALTER TABLE public.preorders ADD COLUMN first_name text;
ALTER TABLE public.preorders ADD COLUMN last_name text;

UPDATE public.preorders
SET
  first_name = COALESCE(split_part(full_name, ' ', 1), ''),
  last_name = COALESCE(NULLIF(regexp_replace(full_name, '^\S+\s*', ''), ''), '');

ALTER TABLE public.preorders ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE public.preorders ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE public.preorders DROP COLUMN full_name;