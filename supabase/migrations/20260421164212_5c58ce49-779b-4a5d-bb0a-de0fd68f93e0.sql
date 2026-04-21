CREATE POLICY "Anyone can read their own preorder by id"
ON public.preorders
FOR SELECT
TO anon
USING (true);