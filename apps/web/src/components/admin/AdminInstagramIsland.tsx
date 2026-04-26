import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

export function AdminInstagramIsland() {
  const [out, setOut] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setOut(null);
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/instagram/refresh", { method: "POST" });
      const data = await res.json();
      setOut(JSON.stringify(data, null, 2));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Instagram</h1>
      <p className="text-sm text-muted-foreground">
        Actualiza la caché desde la API Graph (Meta). Configure <code className="rounded bg-muted px-1 text-xs">META_ACCESS_TOKEN</code> e
        <code className="rounded bg-muted px-1 text-xs">INSTAGRAM_USER_ID</code> en el Worker.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Actualizar feed</CardTitle>
          <CardDescription>Sincronizar datos en el servidor. La operación puede tardar unos segundos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button type="button" onClick={() => void refresh()} disabled={loading}>
            {loading ? "Solicitando…" : "Actualizar ahora"}
          </Button>
          {err ? <p className="text-sm text-destructive">{err}</p> : null}
        </CardContent>
      </Card>

      {out != null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Respuesta</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[32rem] overflow-x-auto overflow-y-auto rounded-md bg-muted/60 p-4 text-xs text-foreground">{out}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
