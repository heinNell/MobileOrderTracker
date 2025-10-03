CREATE TABLE public.qr_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_data TEXT NOT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up permissions
ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow inserts
CREATE POLICY "Allow inserts for authenticated users" 
ON public.qr_scans FOR INSERT 
TO authenticated 
WITH CHECK (true);

