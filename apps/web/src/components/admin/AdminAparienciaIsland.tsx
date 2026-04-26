import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AdminFormSection } from "@/components/admin/AdminFormSection";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api";
import { type PublicUiConfig, defaultPublicUiConfig } from "@/lib/public-ui";

const aparienciaSchema = z.object({
  news: z.object({
    cardImage: z.enum(["short", "medium", "tall", "verytall"]),
    cardCorner: z.enum(["none", "sm", "md", "lg", "xl", "2xl", "3xl"]),
    modalImage: z.enum(["short", "medium", "tall", "verytall"]),
    modalCorner: z.enum(["none", "sm", "md", "lg", "xl", "2xl", "3xl"]),
    cardHoverLift: z.boolean(),
  }),
  council: z.object({
    photoCorner: z.enum(["none", "sm", "md", "lg", "xl", "2xl", "3xl"]),
    photoPreset: z.enum(["compact", "default", "large"]),
    modalWidth: z.enum(["sm", "md", "lg", "xl"]),
    modalCorner: z.enum(["none", "sm", "md", "lg", "xl", "2xl", "3xl"]),
    photoGrayscale: z.boolean(),
  }),
});

type AparienciaForm = z.infer<typeof aparienciaSchema>;

const defaults: AparienciaForm = {
  news: { ...defaultPublicUiConfig.news },
  council: { ...defaultPublicUiConfig.council },
};

function SelectEnum<T extends string>(props: {
  value: T;
  onValueChange: (v: T) => void;
  options: { value: T; label: string }[];
  id?: string;
}) {
  return (
    <Select value={props.value} onValueChange={(v) => props.onValueChange(v as T)}>
      <SelectTrigger id={props.id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {props.options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AdminAparienciaIsland() {
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const form = useForm<AparienciaForm>({
    resolver: zodResolver(aparienciaSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    (async () => {
      setLoadError(null);
      const res = await apiFetch("/api/admin/site/public-ui");
      if (!res.ok) {
        setLoadError("No se pudo cargar la apariencia.");
        return;
      }
      const data = (await res.json()) as { config?: PublicUiConfig };
      const c = data.config;
      if (c) {
        form.reset({
          news: { ...c.news },
          council: { ...c.council },
        });
      }
    })();
  }, [form]);

  async function onSubmit(values: AparienciaForm) {
    setMessage(null);
    const config: PublicUiConfig = {
      version: 1,
      news: values.news,
      council: values.council,
    };
    const res = await apiFetch("/api/admin/site/public-ui", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
    setMessage(
      res.ok ? "Guardado. Actualice la página pública para ver los cambios." : "Error al guardar.",
    );
  }

  return (
    <div className="max-w-4xl space-y-0">
      <h1 className="text-2xl font-bold text-foreground">Apariencia del sitio</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Ajuste el aspecto de las imágenes en noticias y en la galería de consejales. Los cambios se aplican al instante en
        el sitio público.
      </p>
      {loadError ? <p className="mt-2 text-sm text-destructive">{loadError}</p> : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-10">
          <AdminFormSection
            title="Noticias (tarjetas y modal)"
            description="Altura de imágenes y bordes en la lista pública y en el modal al abrir la noticia."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="news.cardImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Altura imagen en tarjeta</FormLabel>
                    <FormControl>
                      <SelectEnum
                        value={field.value}
                        onValueChange={field.onChange}
                        options={[
                          { value: "short", label: "Baja" },
                          { value: "medium", label: "Media" },
                          { value: "tall", label: "Alta (recomendada)" },
                          { value: "verytall", label: "Muy alta" },
                        ]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="news.cardCorner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Esquinas tarjeta</FormLabel>
                    <FormControl>
                      <SelectEnum
                        value={field.value}
                        onValueChange={field.onChange}
                        options={[
                          { value: "none", label: "Sin redondeo" },
                          { value: "sm", label: "Pequeña" },
                          { value: "md", label: "Mediana" },
                          { value: "lg", label: "Grande" },
                          { value: "xl", label: "Extra" },
                          { value: "2xl", label: "2XL" },
                          { value: "3xl", label: "3XL" },
                        ]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="news.modalImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Altura imagen en modal</FormLabel>
                    <FormControl>
                      <SelectEnum
                        value={field.value}
                        onValueChange={field.onChange}
                        options={[
                          { value: "short", label: "Baja" },
                          { value: "medium", label: "Media" },
                          { value: "tall", label: "Alta" },
                          { value: "verytall", label: "Muy alta" },
                        ]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="news.modalCorner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Esquinas modal</FormLabel>
                    <FormControl>
                      <SelectEnum
                        value={field.value}
                        onValueChange={field.onChange}
                        options={[
                          { value: "none", label: "Sin redondeo" },
                          { value: "sm", label: "Pequeña" },
                          { value: "md", label: "Mediana" },
                          { value: "lg", label: "Grande" },
                          { value: "xl", label: "Extra" },
                          { value: "2xl", label: "2XL" },
                          { value: "3xl", label: "3XL" },
                        ]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="news.cardHoverLift"
              render={({ field }) => (
                <FormItem className="mt-4 flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0 cursor-pointer font-normal">Animación al pasar el mouse (elevación de la tarjeta)</FormLabel>
                </FormItem>
              )}
            />
          </AdminFormSection>

          <Separator className="my-2" />

          <AdminFormSection
            title="Consejo (fotos y modal)"
            description="Apariencia de la galería de consejales y del modal al hacer clic."
            withTopSeparator
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="council.photoPreset"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tamaño galería de fotos</FormLabel>
                    <FormControl>
                      <SelectEnum
                        value={field.value}
                        onValueChange={field.onChange}
                        options={[
                          { value: "compact", label: "Compacta" },
                          { value: "default", label: "Estándar" },
                          { value: "large", label: "Grande" },
                        ]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="council.photoCorner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Esquinas de cada foto</FormLabel>
                    <FormControl>
                      <SelectEnum
                        value={field.value}
                        onValueChange={field.onChange}
                        options={[
                          { value: "none", label: "Sin redondeo" },
                          { value: "sm", label: "Pequeña" },
                          { value: "md", label: "Mediana" },
                          { value: "lg", label: "Grande" },
                          { value: "xl", label: "Extra" },
                          { value: "2xl", label: "2XL" },
                          { value: "3xl", label: "3XL" },
                        ]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="council.modalWidth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ancho del modal</FormLabel>
                    <FormControl>
                      <SelectEnum
                        value={field.value}
                        onValueChange={field.onChange}
                        options={[
                          { value: "sm", label: "Estrecho" },
                          { value: "md", label: "Mediano" },
                          { value: "lg", label: "Ancho" },
                          { value: "xl", label: "Muy ancho" },
                        ]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="council.modalCorner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Esquinas del modal</FormLabel>
                    <FormControl>
                      <SelectEnum
                        value={field.value}
                        onValueChange={field.onChange}
                        options={[
                          { value: "none", label: "Sin redondeo" },
                          { value: "sm", label: "Pequeña" },
                          { value: "md", label: "Mediana" },
                          { value: "lg", label: "Grande" },
                          { value: "xl", label: "Extra" },
                          { value: "2xl", label: "2XL" },
                          { value: "3xl", label: "3XL" },
                        ]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="council.photoGrayscale"
              render={({ field }) => (
                <FormItem className="mt-4 flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0 cursor-pointer font-normal">Fotos en escala de grises hasta abrir el modal</FormLabel>
                </FormItem>
              )}
            />
          </AdminFormSection>

          {message ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p> : null}
          <div className="pt-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Guardar apariencia
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
