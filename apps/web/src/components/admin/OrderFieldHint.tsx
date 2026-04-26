import { Info } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const TIP: Record<"position" | "member", string> = {
  position:
    "Define el orden en el que se listan los puestos en el sitio público (números menores primero: 0, 1, 2…). Puede cambiarlo al editar un puesto. Es independiente del orden de las personas en cada puesto.",
  member:
    "Solo ordena a los consejales que comparten el mismo puesto (números menores primero). No cambia el orden de los cargos en la página: eso lo define el orden de cada puesto.",
};

type OrderFieldLabelWithHintProps = {
  kind: "position" | "member";
  label: ReactNode;
  className?: string;
};

/**
 * Fila: etiqueta + icono. Hover = title; clic = explicación bajo el título, antes del control.
 */
export function OrderFieldLabelWithHint({ kind, label, className }: OrderFieldLabelWithHintProps) {
  const [open, setOpen] = useState(false);
  const text = TIP[kind];
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        {label}
        <button
          type="button"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title={text}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Información sobre el orden"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>
      {open ? <p className="max-w-md text-xs leading-relaxed text-muted-foreground border-l-2 border-primary/30 pl-2">{text}</p> : null}
    </div>
  );
}
