import { z } from "zod";

/** Quita separadores habituales; el valor mostrado/guardado puede seguir con espacios en el formulario. */
const stripPhoneSeparators = (s: string) => s.replace(/[\s().-]/g, "").trim();

/** Solo dígitos para contar (ignora + al inicio y el resto de no-dígitos). */
const digitsOnly = (s: string) => s.replace(/\D/g, "");

/**
 * Teléfono opcional: vacío es válido.
 * Si hay texto, se acepta cualquier número cuyo total de **dígitos** esté entre 10 y 15
 * (E.164 máx.; no se exigen prefijos como 04).
 * El valor resultante (si no es vacío) queda en solo dígitos para almacenar.
 */
export const phoneOptionalSchema = z
  .string()
  .transform((s) => stripPhoneSeparators(s))
  .refine(
    (s) => {
      if (s.length === 0) return true;
      const d = digitsOnly(s);
      return d.length >= 10 && d.length <= 15;
    },
    { message: "Entre 10 y 15 dígitos, o deje en blanco (puede usar espacios, guiones o +)." },
  )
  .transform((s) => (s.length === 0 ? "" : digitsOnly(s)));

/** @deprecated Use `phoneOptionalSchema` */
export const vePhoneOptionalSchema = phoneOptionalSchema;

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
