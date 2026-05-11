import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Si es true, el botón principal usa estilo destructivo. */
  destructive?: boolean;
}

interface DialogState extends ConfirmOptions {
  open: boolean;
  resolve?: (value: boolean) => void;
}

const INITIAL: DialogState = { open: false, title: "" };

/**
 * Hook accesible para reemplazar `window.confirm`.
 *
 * Uso:
 *   const { confirm, ConfirmDialog } = useConfirm();
 *   if (await confirm({ title: "¿Eliminar?", destructive: true })) { ... }
 *   return (<>... <ConfirmDialog /> ...</>);
 */
export function useConfirm() {
  const [state, setState] = useState<DialogState>(INITIAL);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, open: true, resolve });
    });
  }, []);

  const close = useCallback(
    (value: boolean) => {
      state.resolve?.(value);
      setState((s) => ({ ...s, open: false, resolve: undefined }));
    },
    [state],
  );

  useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    // foco en cancelar (más seguro por defecto)
    const t = setTimeout(() => cancelRef.current?.focus(), 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [state.open, close]);

  const ConfirmDialog = useCallback(
    () => (
      <AnimatePresence>
        {state.open && (
          <>
            <motion.div
              className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => close(false)}
              aria-hidden
            />
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-dialog-title"
              aria-describedby={state.description ? "confirm-dialog-desc" : undefined}
              className="fixed inset-0 z-[81] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
              >
                <h2 id="confirm-dialog-title" className="text-lg font-semibold text-foreground">
                  {state.title}
                </h2>
                {state.description ? (
                  <p id="confirm-dialog-desc" className="mt-2 text-sm text-muted-foreground">
                    {state.description}
                  </p>
                ) : null}
                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    ref={cancelRef}
                    type="button"
                    variant="outline"
                    onClick={() => close(false)}
                  >
                    {state.cancelLabel ?? "Cancelar"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => close(true)}
                    className={cn(
                      state.destructive &&
                        "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                    )}
                  >
                    {state.confirmLabel ?? "Confirmar"}
                  </Button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    ),
    [state, close],
  );

  return { confirm, ConfirmDialog };
}
