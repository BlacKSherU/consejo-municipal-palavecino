-- Vistas del consejo: mostrar fotos a color (antes escala de grises por defecto)
UPDATE site_content
SET body = replace(body, '"photoGrayscale":true', '"photoGrayscale":false')
WHERE key = 'public_ui';
