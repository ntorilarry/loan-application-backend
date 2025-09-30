-- Add image fields to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS id_front_image VARCHAR(500),
ADD COLUMN IF NOT EXISTS id_back_image VARCHAR(500);

-- Add image fields to client_witnesses table
ALTER TABLE client_witnesses 
ADD COLUMN IF NOT EXISTS id_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS id_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS id_front_image VARCHAR(500),
ADD COLUMN IF NOT EXISTS id_back_image VARCHAR(500),
ADD COLUMN IF NOT EXISTS profile_pic VARCHAR(500);
