-- Misión, visión e imágenes de «Quiénes somos» (editable en panel admin)
INSERT OR IGNORE INTO site_content (key, body, updated_at) VALUES (
  'about_mission',
  'Representar con vocería y responsabilidad al pueblo de Palavecino, legislando y fiscalizando con transparencia para el bienestar colectivo y el desarrollo equitativo del municipio.',
  datetime('now')
);

INSERT OR IGNORE INTO site_content (key, body, updated_at) VALUES (
  'about_vision',
  'Ser un consejo municipal referente en participación ciudadana, gestión abierta y resultados visibles, fortaleciendo la democracia local y la confianza en las instituciones.',
  datetime('now')
);

INSERT OR IGNORE INTO site_content (key, body, updated_at) VALUES (
  'about_images',
  '[]',
  datetime('now')
);
