-- Add transporter supplier information to orders table
-- Migration: Add transporter supplier fields to orders

-- Add transporter supplier fields as JSONB for flexibility
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS transporter_supplier JSONB DEFAULT NULL;

-- Create an index on the transporter supplier JSONB column for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_transporter_supplier 
ON public.orders USING GIN (transporter_supplier);

-- Add comment explaining the structure
COMMENT ON COLUMN public.orders.transporter_supplier IS 
'Transporter supplier information stored as JSONB with structure: {
  "name": "Company Name",
  "contact_phone": "+1234567890",
  "contact_email": "contact@company.com", 
  "cost_amount": 1500.00,
  "cost_currency": "USD",
  "notes": "Additional notes about the transporter"
}';

-- Update the updated_at trigger to include the new column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure the trigger exists for orders table
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON public.orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();