import { marked } from "marked";
import { ArrowLeft, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MarkdownDemoButton } from "@/components/admin/MarkdownDemoButton";
import { Button } from "@/components/ui/button";
import { clearMarkdownSession, readMarkdownSession, writeMarkdownResult, type MarkdownEditorSession } from "@/lib/markdown-editor-bridge";
import { MARKDOWN_DEMO_RICH } from "@/lib/markdown-demo-example";

function countWords(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

export function MarkdownEditorFullscreenIsland() {
  const [session, setSession] = useState<MarkdownEditorSession | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const s = readMarkdownSession();
    if (!s || !s.returnUrl || !s.fieldId) {
      setErr("No hay sesión de edición. Use «Texto de demostración» o vuelva desde noticias o «Quiénes somos» con «Editar a pantalla completa».");
      return;
    }
    setSession(s);
    setText(s.value ?? "");
  }, []);

  const html = useMemo(() => {
    const t = text.trim();
    if (!t) return null;
    return marked.parse(t, { async: false }) as string;
  }, [text]);

  const lineCount = text.split("\n").length;
  const wordCount = useMemo(() => countWords(text), [text]);
  const byteSize = new TextEncoder().encode(text).length;

  const save = useCallback(() => {
    if (!session) return;
    clearMarkdownSession();
    writeMarkdownResult({ fieldId: session.fieldId, value: text, savedAt: Date.now() });
    window.location.assign(session.returnUrl);
  }, [session, text]);

  const leaveWithoutSave = useCallback(() => {
    if (!session) {
      window.location.assign("/gestion-cmp");
      return;
    }
    clearMarkdownSession();
    window.location.assign(session.returnUrl);
  }, [session]);

  if (err) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">{err}</p>
        <Button asChild variant="default">
          <a href="/gestion-cmp">Volver al panel</a>
        </Button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2 sm:gap-3 sm:px-4">
        <Button type="button" variant="ghost" size="sm" onClick={leaveWithoutSave} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <h1 className="min-w-0 flex-1 text-center text-sm font-semibold text-foreground sm:text-left sm:text-base">{session.label}</h1>
        <div className="flex w-full shrink-0 items-center justify-end gap-1.5 sm:w-auto sm:pl-0">
          <MarkdownDemoButton onFill={() => setText(MARKDOWN_DEMO_RICH)} />
          <Button type="button" size="sm" onClick={save}>
            <Save className="h-4 w-4" />
            Guardar
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="shrink-0 border-b border-border bg-muted/40 px-2 py-1 text-center text-xs font-medium text-muted-foreground md:text-left">
            Editar (Markdown)
          </div>
          <textarea
            className="min-h-[40vh] w-full flex-1 resize-none border-0 bg-background p-3 font-mono text-sm text-foreground outline-none ring-0 focus:ring-0 md:min-h-0"
            spellCheck
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <div className="shrink-0 border-t border-border bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">
            Markdown · {byteSize} bytes | {wordCount} palabras | {lineCount} líneas
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="shrink-0 border-b border-border bg-muted/40 px-2 py-1 text-center text-xs font-medium text-muted-foreground md:text-left">
            Vista previa
          </div>
          <div className="min-h-[40vh] flex-1 overflow-y-auto p-3 md:min-h-0">
            {html ? (
              <div
                className="prose prose-slate max-w-none text-sm dark:prose-invert prose-headings:font-semibold prose-p:mb-3 prose-p:last:mb-0 prose-a:text-primary prose-strong:text-foreground"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Escriba a la izquierda o use «Texto de demostración».</p>
            )}
          </div>
          <div className="shrink-0 border-t border-border bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">
            {html ? "Vista generada" : "Sin contenido"}
          </div>
        </div>
      </div>
    </div>
  );
}
