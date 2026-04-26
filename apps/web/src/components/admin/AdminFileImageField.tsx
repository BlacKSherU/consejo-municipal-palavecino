import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageIcon, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  value: File | null;
  onChange: (f: File | null) => void;
  error?: string;
  label: string;
  id?: string;
  /** URL existente (p. ej. avatar actual) mientras no hay archivo nuevo */
  existingPreviewUrl?: string | null;
  className?: string;
};

export function AdminFileImageField({ value, onChange, error, label, id: idProp, existingPreviewUrl, className }: Props) {
  const genId = useId();
  const id = idProp ?? `img-${genId}`;
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      const u = URL.createObjectURL(value);
      setPreview(u);
      return () => URL.revokeObjectURL(u);
    }
    setPreview(null);
    return undefined;
  }, [value]);

  const showUrl = preview || existingPreviewUrl;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="space-y-3">
        {showUrl ? (
          <div className="relative inline-block max-w-full">
            <img
              src={showUrl}
              alt=""
              className="h-40 max-w-full rounded-lg border object-cover"
            />
            {value ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => onChange(null)}
              >
                <X className="mr-1" />
                Quitar selección
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex h-32 w-full max-w-sm items-center justify-center rounded-lg border border-dashed border-input bg-muted/30">
            <ImageIcon className="h-10 w-10 text-muted-foreground" aria-hidden />
          </div>
        )}
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            onChange(f);
            e.target.value = "";
          }}
        />
        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
