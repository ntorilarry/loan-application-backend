-- Add disbursement fields to loans table
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS disbursement_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS disbursement_notes TEXT;

