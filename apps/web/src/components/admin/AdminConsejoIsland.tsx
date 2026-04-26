import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AdminFileImageField } from "@/components/admin/AdminFileImageField";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { OrderFieldLabelWithHint } from "@/components/admin/OrderFieldHint";
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

type Position = { id: number; name: string; sort_order: number };

type CouncilMember = {
  id: number;
  position_id: number;
  full_name: string;
  bio: string;
  email: string | null;
  phone: string | null;
  photo_key: string | null;
  sort_order: number;
};

type PositionWithMembers = { id: number; name: string; sort_order: number; members: CouncilMember[] };

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

function normPhone(p: string | undefined) {
  const t = p?.replace(/\s/g, "") ?? "";
  return t.length > 0 ? t : null;
}

export function AdminConsejoIsland() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [grouped, setGrouped] = useState<PositionWithMembers[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [photoErr, setPhotoErr] = useState<Record<number, string | undefined>>({});
  const [editingPosId, setEditingPosId] = useState<number | null>(null);
  const [editingMemId, setEditingMemId] = useState<number | null>(null);
  const [newMemberPhoto, setNewMemberPhoto] = useState<File | null>(null);
  const [newMemberPhotoErr, setNewMemberPhotoErr] = useState<string | null>(null);

  const posForm = useForm<PosForm>({
    resolver: zodResolver(posSchema),
    defaultValues: { name: "", sort_order: 0 },
  });

  const posEditForm = useForm<PosForm>({
    resolver: zodResolver(posSchema),
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

  const editMemForm = useForm<MemForm>({
    resolver: zodResolver(memSchema),
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

  useEffect(() => {
    if (editingPosId == null) return;
    if (!positions.some((p) => p.id === editingPosId)) setEditingPosId(null);
  }, [editingPosId, positions]);

  useEffect(() => {
    if (editingMemId == null) return;
    const exists = grouped.flatMap((g) => g.members).some((m) => m.id === editingMemId);
    if (!exists) setEditingMemId(null);
  }, [editingMemId, grouped]);

  async function onAddPosition(values: PosForm) {
    await apiFetch("/api/admin/council/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: values.name, sort_order: values.sort_order }),
    });
    posForm.reset({ name: "", sort_order: 0 });
    void load();
  }

  async function onSavePositionEdit(values: PosForm) {
    if (editingPosId == null) return;
    const res = await apiFetch("/api/admin/council/positions/" + editingPosId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: values.name, sort_order: values.sort_order }),
    });
    if (res.ok) {
      setEditingPosId(null);
      void load();
    }
  }

  async function onAddMember(values: MemForm) {
    setNewMemberPhotoErr(null);
    const res = await apiFetch("/api/admin/council/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        position_id: Number(values.position_id),
        full_name: values.full_name,
        bio: values.bio || "",
        email: values.email.trim() ? values.email.trim() : null,
        phone: normPhone(values.phone),
        sort_order: values.sort_order,
      }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { id?: number };
    const newId = data.id;
    if (newId != null && newMemberPhoto) {
      const vr = imageFileSchema.safeParse(newMemberPhoto);
      if (!vr.success) {
        setNewMemberPhotoErr(vr.error.issues[0]?.message ?? "Imagen no válida");
      } else {
        const fd = new FormData();
        fd.set("file", newMemberPhoto);
        const pr = await apiFetch("/api/admin/council/members/" + newId + "/photo", { method: "POST", body: fd });
        if (!pr.ok) {
          setNewMemberPhotoErr("Consejal creado, pero no se pudo subir la foto. Vuelva a subirla más abajo.");
        }
      }
    }
    setNewMemberPhoto(null);
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

  async function onSaveMemberEdit(id: number, values: MemForm) {
    const res = await apiFetch("/api/admin/council/members/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        position_id: Number(values.position_id),
        full_name: values.full_name,
        bio: values.bio || "",
        email: values.email.trim() ? values.email.trim() : null,
        phone: normPhone(values.phone),
        sort_order: values.sort_order,
      }),
    });
    if (res.ok) {
      setEditingMemId(null);
      void load();
    }
  }

  function openEditMember(m: CouncilMember) {
    setEditingMemId(m.id);
    editMemForm.reset({
      position_id: String(m.position_id),
      full_name: m.full_name,
      bio: m.bio || "",
      email: m.email || "",
      phone: m.phone || "",
      sort_order: m.sort_order,
    });
  }

  function openEditPosition(p: Position) {
    setEditingPosId(p.id);
    posEditForm.reset({ name: p.name, sort_order: p.sort_order });
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
                    <OrderFieldLabelWithHint
                      kind="position"
                      label={
                        <FormLabel htmlFor="new-pos-order" className="!mb-0">
                          Orden
                        </FormLabel>
                      }
                    />
                    <FormControl>
                      <Input type="number" min={0} id="new-pos-order" {...field} />
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
              className="flex flex-col gap-2 rounded border bg-card px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              {editingPosId === p.id ? (
                <Form {...posEditForm}>
                  <form className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end" onSubmit={posEditForm.handleSubmit(onSavePositionEdit)}>
                    <FormField
                      control={posEditForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="min-w-0 flex-1 sm:max-w-xs">
                          <FormLabel htmlFor={`pos-name-${p.id}`}>Nombre</FormLabel>
                          <FormControl>
                            <Input id={`pos-name-${p.id}`} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={posEditForm.control}
                      name="sort_order"
                      render={({ field }) => (
                        <FormItem>
                          <OrderFieldLabelWithHint
                            kind="position"
                            label={
                              <FormLabel htmlFor={`pos-ord-${p.id}`} className="!mb-0 w-auto">
                                Orden
                              </FormLabel>
                            }
                          />
                          <FormControl>
                            <Input id={`pos-ord-${p.id}`} type="number" min={0} className="w-24" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" onClick={() => setEditingPosId(null)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={posEditForm.formState.isSubmitting}>
                        Guardar
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <>
                  <div className="min-w-0">
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">(orden: {p.sort_order})</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => openEditPosition(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={async () => {
                        if (!confirm("¿Eliminar puesto y consejales asociados?")) return;
                        await apiFetch("/api/admin/council/positions/" + p.id, { method: "DELETE" });
                        setEditingPosId((id) => (id === p.id ? null : id));
                        void load();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <Separator className="my-4" />

      <Form {...memForm}>
        <form onSubmit={memForm.handleSubmit(onAddMember)}>
          <AdminFormSection
            title="Nuevo consejal"
            description="Foto: opcional al crear; se sube con el registro. Teléfono: 11 dígitos empezando en 04."
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
              <div className="sm:col-span-2">
                <AdminFileImageField
                  label="Foto de perfil (opcional)"
                  value={newMemberPhoto}
                  onChange={(f) => {
                    setNewMemberPhoto(f);
                    setNewMemberPhotoErr(null);
                  }}
                  error={newMemberPhotoErr ?? undefined}
                />
                <p className="mt-1 text-xs text-muted-foreground">Formatos: JPEG, PNG, GIF, WebP.</p>
              </div>
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
                    <OrderFieldLabelWithHint
                      kind="member"
                      label={
                        <FormLabel htmlFor="new-member-order" className="!mb-0">
                          Orden
                        </FormLabel>
                      }
                    />
                    <FormControl>
                      <Input id="new-member-order" type="number" min={0} {...field} />
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
        description="Edite datos o reemplace la foto. La foto se aplica al elegir un archivo (también en el formulario de edición)."
        withTopSeparator
      >
        <div className="space-y-6">
          {grouped.flatMap((g) =>
            (g.members || []).map((m) => {
              const preview = m.photo_key ? apiUrl("/api/council/photo/" + m.id) : null;
              const isEditing = editingMemId === m.id;
              return (
                <Card key={m.id}>
                  <CardContent className="space-y-4 p-4">
                    {isEditing ? (
                      <Form {...editMemForm}>
                        <form className="space-y-4" onSubmit={editMemForm.handleSubmit((vals) => void onSaveMemberEdit(m.id, vals))}>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <FormField
                              control={editMemForm.control}
                              name="position_id"
                              render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                  <FormLabel>Puesto *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
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
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editMemForm.control}
                              name="full_name"
                              render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                  <FormLabel>Nombre *</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editMemForm.control}
                              name="bio"
                              render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                  <FormLabel>Biografía</FormLabel>
                                  <FormControl>
                                    <Textarea rows={4} {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editMemForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Correo</FormLabel>
                                  <FormControl>
                                    <Input type="email" inputMode="email" {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editMemForm.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Teléfono</FormLabel>
                                  <FormControl>
                                    <Input inputMode="numeric" placeholder="04XX XXXXXXX" {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editMemForm.control}
                              name="sort_order"
                              render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                  <OrderFieldLabelWithHint
                                    kind="member"
                                    label={
                                      <FormLabel htmlFor={`mem-ord-${m.id}`} className="!mb-0">
                                        Orden
                                      </FormLabel>
                                    }
                                  />
                                  <FormControl>
                                    <Input id={`mem-ord-${m.id}`} type="number" min={0} className="max-w-[10rem]" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="w-full max-w-sm sm:max-w-xs">
                            <AdminFileImageField
                              label="Foto de perfil"
                              value={null}
                              onChange={(f) => void onPhotoChange(m.id, f)}
                              error={photoErr[m.id]}
                              existingPreviewUrl={preview}
                            />
                          </div>
                          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
                            <Button type="button" variant="secondary" onClick={() => setEditingMemId(null)}>
                              Cancelar
                            </Button>
                            <Button type="submit" disabled={editMemForm.formState.isSubmitting}>
                              Guardar datos
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="ms-auto text-destructive hover:bg-destructive/10"
                              onClick={async () => {
                                if (!confirm("¿Eliminar consejal?")) return;
                                setEditingMemId((id) => (id === m.id ? null : id));
                                await apiFetch("/api/admin/council/members/" + m.id, { method: "DELETE" });
                                void load();
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar
                            </Button>
                          </div>
                        </form>
                      </Form>
                    ) : (
                      <>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground">{m.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {g.name} · orden {m.sort_order}
                            </p>
                            {m.bio ? (
                              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{m.bio}</p>
                            ) : null}
                            <div className="mt-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => openEditMember(m)}>
                                <Pencil className="h-3.5 w-3.5" />
                                Editar datos
                              </Button>
                            </div>
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
                              setEditingMemId((id) => (id === m.id ? null : id));
                              void load();
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar consejal
                          </Button>
                        </div>
                      </>
                    )}
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
