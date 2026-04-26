-- Apariencia pública (JSON): noticias + consejo. Editable desde /gestion-cmp/apariencia
INSERT OR IGNORE INTO site_content (key, body, updated_at) VALUES (
  'public_ui',
  '{"version":1,"news":{"cardImage":"tall","cardCorner":"lg","modalImage":"tall","modalCorner":"xl","cardHoverLift":true},"council":{"photoCorner":"xl","photoPreset":"default","modalCorner":"xl","modalWidth":"md","photoGrayscale":true}}',
  datetime('now')
);
