import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Eye, EyeOff, Search, Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { mediaUrl, fileExt, isImageFile, isVideoFile, isVideoUrl, MAX_UPLOAD_BYTES } from "@/lib/media";
import type { PropertyRow } from "@/lib/admin/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

import { requireAdmin } from "@/lib/admin/guards";

export const Route = createFileRoute("/_authenticated/admin/properties")({
  beforeLoad: ({ context }) => requireAdmin(context),
  component: PropertiesAdmin,
});

const TYPES = ["Апартамент", "Къща", "Парцел", "Офис", "Магазин", "Бизнес имот"] as const;
const LAYOUTS = ["Едностаен", "Двустаен", "Тристаен", "Четиристаен", "Мезонет"] as const;
const STATUSES = ["Продава", "Под наем", "Продаден", "Отдаден"] as const;
type PropType = typeof TYPES[number];
type PropStatus = typeof STATUSES[number];

// Кои полета имат смисъл за даден тип имот
const hasLayout = (t: PropType) => t === "Апартамент";
const hasFloor = (t: PropType) => t === "Апартамент" || t === "Офис" || t === "Магазин" || t === "Бизнес имот" || t === "Къща";
const hasRooms = (t: PropType) => t !== "Парцел";

type Img = { id?: string; url: string; storage_path?: string | null; sort_order: number };

const empty = {
  title: "",
  type: "Апартамент" as PropType,
  status: "Продава" as PropStatus,
  price: 0,
  city: "Перник",
  district: "",
  address: "",
  area: null as number | null,
  rooms: null as number | null,
  layout: "",
  floor: "",
  description: "",
  main_image: "",
  video_url: "",
  map_lat: null as number | null,
  map_lng: null as number | null,
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  is_published: true,
  is_featured: false,
};

function PropertiesAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PropertyRow | null>(null);
  const [open, setOpen] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PropertyRow[];
    },
  });

  const filtered = items.filter((p) =>
    !search ? true : p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.district ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const delMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Имотът е изтрит");
      qc.invalidateQueries({ queryKey: ["admin-properties"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from("properties").update({ is_published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-properties"] }),
  });

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(p: PropertyRow) { setEditing(p); setOpen(true); }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-navy">Имоти</h1>
          <p className="text-sm text-muted-foreground">Управление на обявите за имоти</p>
        </div>
        <Button onClick={openNew} className="bg-navy hover:bg-navy-deep">
          <Plus className="mr-2 h-4 w-4" /> Добави имот
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Търсене по заглавие или квартал..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Заглавие</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Локация</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Зареждане...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Няма имоти. Добавете първия!</TableCell></TableRow>
              ) : filtered.map((p) => (
                <TableRow key={p.id} className={!p.is_published ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>{p.type}</TableCell>
                  <TableCell><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{p.status}</span></TableCell>
                  <TableCell>€ {Number(p.price).toLocaleString("bg-BG")}</TableCell>
                  <TableCell className="text-muted-foreground">{p.district || p.city}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => toggleMutation.mutate({ id: p.id, is_published: !p.is_published })} title={p.is_published ? "Скрий" : "Покажи"}>
                        {p.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)} title="Редактирай"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => {
                        if (confirm(`Изтрий "${p.title}"?`)) delMutation.mutate(p.id);
                      }} title="Изтрий"><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PropertyDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={() => {
        qc.invalidateQueries({ queryKey: ["admin-properties"] });
        qc.invalidateQueries({ queryKey: ["admin-stats"] });
      }} />
    </div>
  );
}

function PropertyDialog({
  open, onOpenChange, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: PropertyRow | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(empty);
  const [images, setImages] = useState<Img[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize the form once, when the dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      if (editing) {
        setForm({
          title: editing.title,
          type: editing.type as PropType,
          status: editing.status as PropStatus,
          price: Number(editing.price),
          city: editing.city ?? "Перник",
          district: editing.district ?? "",
          address: editing.address ?? "",
          area: editing.area,
          rooms: editing.rooms,
          layout: editing.layout ?? "",
          floor: editing.floor ?? "",
          description: editing.description ?? "",
          main_image: editing.main_image ?? "",
          video_url: editing.video_url ?? "",
          map_lat: editing.map_lat,
          map_lng: editing.map_lng,
          seo_title: editing.seo_title ?? "",
          seo_description: editing.seo_description ?? "",
          seo_keywords: editing.seo_keywords ?? "",
          is_published: editing.is_published,
          is_featured: editing.is_featured,
        });
        const { data } = await supabase
          .from("property_images")
          .select("*")
          .eq("property_id", editing.id)
          .order("sort_order");
        if (!cancelled) {
          setImages((data ?? []).map((i) => ({ id: i.id, url: i.url, storage_path: i.storage_path, sort_order: i.sort_order })));
        }
      } else {
        setForm(empty);
        setImages([]);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: Img[] = [];
      for (const file of Array.from(files)) {
        if (!isImageFile(file) && !isVideoFile(file)) {
          toast.error(`Неподдържан файл: ${file.name}`);
          continue;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          toast.error(`Файлът е твърде голям: ${file.name} (макс. 25MB)`);
          continue;
        }
        const path = `${crypto.randomUUID()}.${fileExt(file)}`;
        const { error } = await supabase.storage.from("property-images").upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
        if (error) throw error;
        uploaded.push({ url: mediaUrl(path), storage_path: path, sort_order: images.length + uploaded.length });
      }
      const next = [...images, ...uploaded];
      setImages(next);
      if (!form.main_image && uploaded[0]) setForm((f) => ({ ...f, main_image: uploaded[0].url }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Грешка при качване");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(idx: number) {
    const img = images[idx];
    if (img.id) {
      await supabase.from("property_images").delete().eq("id", img.id);
    }
    if (img.storage_path) {
      await supabase.storage.from("property-images").remove([img.storage_path]);
    }
    setImages(images.filter((_, i) => i !== idx));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Въведете заглавие");
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        area: form.area ? Number(form.area) : null,
        rooms: hasRooms(form.type) && form.rooms ? Number(form.rooms) : null,
        layout: hasLayout(form.type) && form.layout ? form.layout : null,
        floor: hasFloor(form.type) && form.floor ? form.floor : null,
        map_lat: form.map_lat ? Number(form.map_lat) : null,
        map_lng: form.map_lng ? Number(form.map_lng) : null,
        main_image: form.main_image || images[0]?.url || null,
      };
      let propertyId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("properties").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from("properties")
          .insert({ ...payload, created_by: user?.id })
          .select("id")
          .single();
        if (error) throw error;
        propertyId = data.id;
      }
      // Sync gallery: insert new images (those without id) tied to property
      const newOnes = images.filter((i) => !i.id);
      if (propertyId && newOnes.length > 0) {
        const { error } = await supabase.from("property_images").insert(
          newOnes.map((i) => ({ property_id: propertyId!, url: i.url, storage_path: i.storage_path, sort_order: i.sort_order })),
        );
        if (error) throw error;
      }
      toast.success(editing ? "Запазено" : "Имотът е добавен");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Грешка");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-navy">
            {editing ? "Редактирай имот" : "Нов имот"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave} className="space-y-5">
          <Field label="Заглавие" required>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Тип имот">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as PropType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Статус">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as PropStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Цена (€)">
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </Field>
            <Field label="Квадратура (м²)">
              <Input type="number" value={form.area ?? ""} onChange={(e) => setForm({ ...form, area: e.target.value ? Number(e.target.value) : null })} />
            </Field>
            {hasRooms(form.type) && (
              <Field label="Стаи">
                <Input type="number" value={form.rooms ?? ""} onChange={(e) => setForm({ ...form, rooms: e.target.value ? Number(e.target.value) : null })} />
              </Field>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Град"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
            <Field label="Квартал"><Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></Field>
            {hasLayout(form.type) && (
              <Field label="Вид апартамент">
                <Select
                  value={form.layout || "none"}
                  onValueChange={(v) => setForm({ ...form, layout: v === "none" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Без" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без</SelectItem>
                    {LAYOUTS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>

          {hasFloor(form.type) && (
            <div className="grid gap-4 sm:grid-cols-3">
              {form.type === "Къща" ? (
                <Field label="Брой етажи"><Input type="number" min={1} value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="напр. 2" /></Field>
              ) : (
                <Field label="Етаж"><Input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="напр. 4 / 6" /></Field>
              )}
            </div>
          )}

          <Field label="Адрес"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>

          <Field label="Описание">
            <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>

          {/* Images */}
          <div>
            <Label>Снимки и видеа</Label>
            <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((img, idx) => (
                <div key={idx} className="group relative aspect-square overflow-hidden rounded-lg border">
                  {isVideoUrl(img.url) ? (
                    <video src={img.url} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  )}
                  <button type="button" onClick={() => removeImage(idx)} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {form.main_image === img.url && (
                    <span className="absolute bottom-1 left-1 rounded bg-gold px-1.5 py-0.5 text-[10px] font-medium text-navy-deep">Основна</span>
                  )}
                  {form.main_image !== img.url && (
                    <button type="button" onClick={() => setForm({ ...form, main_image: img.url })} className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      Основна
                    </button>
                  )}
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground hover:border-navy hover:text-navy">
                {uploading ? <span className="text-xs">Качване...</span> : (
                  <><Upload className="h-5 w-5" /><span className="text-xs">Качи</span></>
                )}
                <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Видео URL (YouTube/Vimeo)"><Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} /></Field>
            <Field label="Google Maps lat,lng">
              <div className="flex gap-2">
                <Input type="number" step="0.000001" placeholder="lat" value={form.map_lat ?? ""} onChange={(e) => setForm({ ...form, map_lat: e.target.value ? Number(e.target.value) : null })} />
                <Input type="number" step="0.000001" placeholder="lng" value={form.map_lng ?? ""} onChange={(e) => setForm({ ...form, map_lng: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </Field>
          </div>

          {/* SEO */}
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer font-medium text-navy">SEO настройки</summary>
            <div className="mt-4 space-y-4">
              <Field label="SEO заглавие"><Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} /></Field>
              <Field label="SEO описание"><Textarea rows={2} value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} /></Field>
              <Field label="Ключови думи"><Input value={form.seo_keywords} onChange={(e) => setForm({ ...form, seo_keywords: e.target.value })} /></Field>
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-6 rounded-lg bg-muted/40 p-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              Публикувана
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
              Препоръчана
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Откажи</Button>
            <Button type="submit" disabled={saving} className="bg-navy hover:bg-navy-deep">
              {saving ? "Запазване..." : "Запази"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}{required && <span className="text-rose-600"> *</span>}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}





