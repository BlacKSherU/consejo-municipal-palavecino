import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Muestra separador arriba (útil salvo en la primera sección) */
  withTopSeparator?: boolean;
};

export function AdminFormSection({ title, description, children, className, withTopSeparator }: Props) {
  return (
    <div className={cn("space-y-0", className)}>
      {withTopSeparator && <Separator className="mb-10" />}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10 lg:gap-12">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
        </div>
        <div className="md:col-span-2">{children}</div>
      </div>
    </div>
  );
}
