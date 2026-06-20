ALTER TABLE protocols ADD COLUMN IF NOT EXISTS on_chain_registered boolean NOT NULL DEFAULT false;
