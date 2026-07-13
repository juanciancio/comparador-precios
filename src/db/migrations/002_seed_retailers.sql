-- Seed de las dos primeras cadenas. Idempotente: correr de nuevo no duplica.
INSERT INTO retailers (slug, name, base_url) VALUES
  ('masonline', 'Masonline',           'https://www.masonline.com.ar'),
  ('carrefour', 'Carrefour Argentina', 'https://www.carrefour.com.ar')
ON CONFLICT (slug) DO NOTHING;
