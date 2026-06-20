ALTER TABLE users ADD COLUMN IF NOT EXISTS role varchar(20) NOT NULL DEFAULT 'user';
UPDATE users SET role = 'admin' WHERE email = 'preciousmofeoluwa@gmail.com';
