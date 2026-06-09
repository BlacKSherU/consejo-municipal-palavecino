import { Label } from "@/components/ui/label";
import { formatBytes } from "@/lib/validators-ve";
import { FileText } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";

type Props = {
  value: File | null;
  onChange: (f: File | null) => void;
  error?: string;
  label: string;
  id?: string;
  className?: string;
  required?: boolean;
  /** Nombre del archivo ya cargado (al editar). Se muestra como hint mientras no se selecciona uno nuevo. */
  existingFileName?: string;
  existingFileSize?: number;
};

export function AdminFilePdfField({
  value,
  onChange,
  error,
  label,
  id: idProp,
  className,
  required,
  existingFileName,
  existingFileSize,
}: Props) {
  const genId = useId();
  const id = idProp ?? `pdf-${genId}`;

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <Label htmlFor={id}>
          {label}
          {required ? " *" : ""}
        </Label>
      ) : null}
      <div className="space-y-2">
        {value ? (
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{value.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(value.size)}</p>
            </div>
          </div>
        ) : existingFileName ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-input bg-muted/30 px-3 py-2 text-sm">
            <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-muted-foreground">{existingFileName}</p>
              <p className="text-xs text-muted-foreground">
                {typeof existingFileSize === "number" ? formatBytes(existingFileSize) + " · " : ""}
                archivo actual
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-input bg-muted/30 text-sm text-muted-foreground">
            Ningún archivo seleccionado
          </div>
        )}
        <input
          id={id}
          type="file"
          accept="application/pdf,.pdf"
          required={required && !value}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            onChange(f);
          }}
        />
        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
