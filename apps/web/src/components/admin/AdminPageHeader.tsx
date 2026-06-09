import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function AdminPageHeader({ title, description, actions, className }: Props) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

type SubProps = {
  title: string;
  description?: string;
  count?: number | null;
  children?: ReactNode;
  className?: string;
};

/** Cabecera secundaria (H2) usada antes de listados o sub-bloques. */
export function AdminListHeader({ title, description, count, children, className }: SubProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {title}
          {typeof count === "number" ? (
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 align-middle text-xs font-medium text-muted-foreground">
              {count}
            </span>
          ) : null}
        </h2>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
