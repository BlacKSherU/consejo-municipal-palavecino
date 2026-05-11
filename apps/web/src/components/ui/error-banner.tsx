import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorBanner({ message, onRetry, className }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={
        "flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive " +
        (className ?? "")
      }
    >
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1 min-w-0">{message}</span>
      {onRetry ? (
        <Button type="button" size="sm" variant="outline" onClick={onRetry} className="border-destructive/40">
          <RotateCcw className="h-3.5 w-3.5" />
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
