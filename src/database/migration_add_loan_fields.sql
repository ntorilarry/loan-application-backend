-- Migration to add new loan fields
-- Run this script to add the new columns to existing loans table

-- Add new columns to loans table
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS payment_start_date DATE,
ADD COLUMN IF NOT EXISTS payment_end_date DATE,
ADD COLUMN IF NOT EXISTS processing_fee DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5,2);

-- Update loan_duration from INTEGER to VARCHAR
ALTER TABLE loans 
ALTER COLUMN loan_duration TYPE VARCHAR(50);

-- Update status values to new format
UPDATE loans SET status = 'registered' WHERE status = 'registration';
UPDATE loans SET status = 'captured' WHERE status = 'capturing';
UPDATE loans SET status = 'approved' WHERE status = 'approval';
UPDATE loans SET status = 'disbursed' WHERE status = 'disbursement';


