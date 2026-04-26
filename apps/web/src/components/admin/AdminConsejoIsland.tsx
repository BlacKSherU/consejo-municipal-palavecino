import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AdminFileImageField } from "@/components/admin/AdminFileImageField";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, apiUrl } from "@/lib/api";
import { emailOptionalSchema, imageFileSchema, vePhoneOptionalSchema } from "@/lib/validators-ve";

type Position = { id: number; name: string };

type CouncilMember = {
  id: number;
  full_name: string;
  bio: string;
  email: string | null;
  phone: string | null;
  photo_key?: boolean;
};

type PositionWithMembers = { name: string; members: CouncilMember[] };

const posSchema = z.object({
  name: z.string().min(1, "Indique el nombre del puesto"),
  sort_order: z.preprocess(
    (v) => (v === "" || v == null || (typeof v === "number" && Number.isNaN(v)) ? 0 : v),
    z.coerce.number().int().min(0),
  ),
});

const memSchema = z.object({
  position_id: z.string().min(1, "Seleccione un puesto"),
  full_name: z.string().min(1, "Indique el nombre completo"),
  bio: z.string().optional(),
  email: emailOptionalSchema,
  phone: vePhoneOptionalSchema,
  sort_order: z.preprocess(
    (v) => (v === "" || v == null || (typeof v === "number" && Number.isNaN(v)) ? 0 : v),
    z.coerce.number().int().min(0),
  ),
});

type PosForm = z.infer<typeof posSchema>;
type MemForm = z.infer<typeof memSchema>;

export function AdminConsejoIsland() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [grouped, setGrouped] = useState<PositionWithMembers[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [photoErr, setPhotoErr] = useState<Record<number, string | undefined>>({});

  const posForm = useForm<PosForm>({
    resolver: zodResolver(posSchema),
    defaultValues: { name: "", sort_order: 0 },
  });

  const memForm = useForm<MemForm>({
    resolver: zodResolver(memSchema),
    defaultValues: {
      position_id: "",
      full_name: "",
      bio: "",
      email: "",
      phone: "",
      sort_order: 0,
    },
  });

  const load = useCallback(async () => {
    setLoadErr(null);
    try {
      const [posRes, councilRes] = await Promise.all([
        apiFetch("/api/admin/council/positions"),
        apiFetch("/api/council"),
      ]);
      const posData = (await posRes.json()) as { items?: Position[] };
      setPositions(posData.items || []);
      const data = (await councilRes.json()) as { positions?: PositionWithMembers[] };
      setGrouped(data.positions || []);
    } catch {
      setLoadErr("Error al cargar el consejo.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAddPosition(values: PosForm) {
    await apiFetch("/api/admin/council/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: values.name, sort_order: values.sort_order }),
    });
    posForm.reset({ name: "", sort_order: 0 });
    void load();
  }

  async function onAddMember(values: MemForm) {
    await apiFetch("/api/admin/council/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        position_id: Number(values.position_id),
        full_name: values.full_name,
        bio: values.bio || "",
        email: values.email.trim() ? values.email.trim() : null,
        phone: values.phone && values.phone.replace(/\s/g, "") ? values.phone.replace(/\s/g, "") : null,
        sort_order: values.sort_order,
      }),
    });
    memForm.reset({
      position_id: "",
      full_name: "",
      bio: "",
      email: "",
      phone: "",
      sort_order: 0,
    });
    void load();
  }

  async function onPhotoChange(memberId: number, file: File | null) {
    if (!file) return;
    const r = imageFileSchema.safeParse(file);
    if (!r.success) {
      setPhotoErr((e) => ({ ...e, [memberId]: r.error.issues[0]?.message ?? "Imagen no válida" }));
      return;
    }
    setPhotoErr((e) => ({ ...e, [memberId]: undefined }));
    const fd = new FormData();
    fd.set("file", file);
    await apiFetch("/api/admin/council/members/" + memberId + "/photo", { method: "POST", body: fd });
    void load();
  }

  return (
    <div className="max-w-5xl space-y-10">
      <h1 className="text-2xl font-bold text-foreground">Puestos y consejales</h1>
      {loadErr ? <p className="text-sm text-destructive">{loadErr}</p> : null}

      <Form {...posForm}>
        <form onSubmit={posForm.handleSubmit(onAddPosition)}>
          <AdminFormSection title="Nuevo puesto" description="Asigne un nombre y el orden de aparición.">
            <div className="grid max-w-2xl gap-4 sm:grid-cols-2 sm:items-end">
              <FormField
                control={posForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del puesto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Presidente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={posForm.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={posForm.formState.isSubmitting}>
                  Añadir puesto
                </Button>
              </div>
            </div>
          </AdminFormSection>
        </form>
      </Form>
      {positions.length > 0 && (
        <ul className="mt-0 space-y-2 rounded-lg border p-3">
          {positions.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded border bg-card px-3 py-2 text-sm"
            >
              <span className="font-medium">{p.name}</span>
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={async () => {
                  if (!confirm("¿Eliminar puesto y consejales asociados?")) return;
                  await apiFetch("/api/admin/council/positions/" + p.id, { method: "DELETE" });
                  void load();
                }}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Separator className="my-4" />

      <Form {...memForm}>
        <form onSubmit={memForm.handleSubmit(onAddMember)}>
          <AdminFormSection
            title="Nuevo consejal"
            description="Datos de contacto validados. Teléfono: 11 dígitos empezando en 04."
            withTopSeparator
          >
            <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
              <FormField
                control={memForm.control}
                name="position_id"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Puesto *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {positions.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={memForm.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nombre completo *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={memForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Biografía</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={memForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo</FormLabel>
                    <FormControl>
                      <Input type="email" inputMode="email" placeholder="opcional" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={memForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" placeholder="04XX XXXXXXX (opcional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={memForm.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={memForm.formState.isSubmitting}>
                  Añadir consejal
                </Button>
              </div>
            </div>
          </AdminFormSection>
        </form>
      </Form>

      <AdminFormSection
        title="Consejales"
        description="Cambie la foto: previsualización y validación de formato. Se sube al elegir el archivo."
        withTopSeparator
      >
        <div className="space-y-6">
          {grouped.flatMap((g) =>
            (g.members || []).map((m) => {
              const preview = m.photo_key ? apiUrl("/api/council/photo/" + m.id) : null;
              return (
                <Card key={m.id}>
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">{m.full_name}</p>
                        <p className="text-xs text-muted-foreground">{g.name}</p>
                        {m.bio ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{m.bio}</p>
                        ) : null}
                      </div>
                      <div className="w-full shrink-0 sm:max-w-xs">
                        <AdminFileImageField
                          label="Foto de perfil"
                          value={null}
                          onChange={(f) => void onPhotoChange(m.id, f)}
                          error={photoErr[m.id]}
                          existingPreviewUrl={preview}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end border-t border-border/60 pt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={async () => {
                          if (!confirm("¿Eliminar consejal?")) return;
                          await apiFetch("/api/admin/council/members/" + m.id, { method: "DELETE" });
                          void load();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar consejal
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            }),
          )}
        </div>
        {grouped.reduce((a, p) => a + (p.members?.length || 0), 0) === 0 && !loadErr ? (
          <p className="text-sm text-muted-foreground">No hay consejales. Añada puestos y personas.</p>
        ) : null}
      </AdminFormSection>
    </div>
  );
}
