import { z } from "zod";

const normalizePhone = (s: string) => s.replace(/\s/g, "").trim();

/** Móvil local Venezuela: 11 dígitos, inicia con 04 (ej. 04129872828) */
const VE_PHONE_RE = /^04\d{9}$/;

/** Teléfono opcional: vacío acepta; si hay texto, debe cumplir formato VE móvil. */
export const vePhoneOptionalSchema = z
  .string()
  .transform((s) => normalizePhone(s))
  .refine((s) => s.length === 0 || VE_PHONE_RE.test(s), {
    message: "Use 11 dígitos, formato 04XX XXXXXXX (ej. 04129872828)",
  });

export const emailSchema = z
  .string()
  .min(1, "El correo es obligatorio")
  .email("Correo no válido")
  .transform((s) => s.trim());

export const emailOptionalSchema = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length === 0 || z.string().email().safeParse(s).success, {
    message: "Correo no válido",
  });

const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export const pdfFileSchema = z
  .instanceof(File, { message: "Seleccione un archivo PDF" })
  .refine((f) => f.size > 0, { message: "El archivo está vacío" })
  .refine((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"), {
    message: "Solo se permiten archivos PDF",
  })
  .refine((f) => f.size <= MAX_PDF_BYTES, { message: "El PDF no puede superar 20 MB" });

export const imageFileSchema = z
  .instanceof(File, { message: "Seleccione una imagen" })
  .refine((f) => f.size > 0, { message: "El archivo está vacío" })
  .refine(
    (f) => /^image\/(jpeg|png|gif|webp)$/i.test(f.type) || /\.(jpe?g|png|gif|webp)$/i.test(f.name),
    { message: "Formato de imagen no soportado (JPG, PNG, GIF, WebP)" },
  )
  .refine((f) => f.size <= MAX_IMAGE_BYTES, { message: "La imagen no puede superar 8 MB" });

/** Desde input text: edición / número de gaceta (opcional) */
export const issueNumberFromString = z
  .string()
  .transform((s) => s.trim())
  .transform((s) => (s === "" ? undefined : s))
  .refine((s) => s === undefined || /^\d+$/.test(s), { message: "Solo números enteros" })
  .transform((s) => (s === undefined ? undefined : Number.parseInt(s, 10)))
  .refine((n) => n === undefined || (Number.isInteger(n) && n > 0), { message: "Debe ser mayor que 0" });

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
