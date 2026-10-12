import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Home,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Upload,
  X,
  Video,
  ChevronUp,
  ChevronDown,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { adminMediaPreviewUrl } from "@/lib/admin/media";
import {
  mediaUrl,
  fileExt,
  isImageFile,
  isVideoFile,
  isVideoUrl,
  MAX_UPLOAD_BYTES,
} from "@/lib/media";
import type { PropertyRow } from "@/lib/admin/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

import { requireAdmin } from "@/lib/admin/guards";

export const Route = createFileRoute("/_authenticated/admin/properties")({
  beforeLoad: ({ context }) => requireAdmin(context),
  component: PropertiesAdmin,
});

const TYPES = [
  "Апартамент",
  "Къща",
  "Парцел",
  "Земеделска земя",
  "Офис",
  "Магазин",
  "Бизнес имот",
] as const;
const LAYOUTS = ["Едностаен", "Двустаен", "Тристаен", "Четиристаен", "Мезонет"] as const;
const STATUSES = ["Продава", "Под наем", "Продаден", "Отдаден"] as const;
type PropType = (typeof TYPES)[number];
type PropStatus = (typeof STATUSES)[number];
const PAGE_SIZE = 25;

// Кои полета имат смисъл за даден тип имот
const hasLayout = (t: PropType) => t === "Апартамент";
const hasFloor = (t: PropType) =>
  t === "Апартамент" || t === "Офис" || t === "Магазин" || t === "Бизнес имот" || t === "Къща";
const hasRooms = (t: PropType) => t !== "Парцел" && t !== "Земеделска земя";

type Img = {
  id?: string;
  url: string;
  preview_url?: string;
  storage_path?: string | null;
  sort_order: number;
};

const empty = {
  title: "",
  type: "Апартамент" as PropType,
  status: "Продава" as PropStatus,
  price: 0,
  city: "Перник",
  district: "",
  address: "",
  area: null as number | null,
  yard_area: null as number | null,
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
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<PropType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<PropStatus | "all">("all");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<PropertyRow | null>(null);
  const [open, setOpen] = useState(false);
  const normalizedSearch = search.trim().replace(/[\r\n]/g, " ");

  const propertiesQuery = useQuery({
    queryKey: [
      "admin-properties",
      { search: normalizedSearch, type: typeFilter, status: statusFilter, page },
    ],
    queryFn: async () => {
      let query = supabase
        .from("properties")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (typeFilter !== "all") query = query.eq("type", typeFilter);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (normalizedSearch) {
        const term = normalizedSearch
          .replaceAll("\\", "\\\\")
          .replaceAll('"', '\\"')
          .replaceAll("%", "\\%")
          .replaceAll("_", "\\_");
        const filters = [
          `title.ilike."%${term}%"`,
          `city.ilike."%${term}%"`,
          `district.ilike."%${term}%"`,
          `address.ilike."%${term}%"`,
        ];
        if (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalizedSearch)
        ) {
          filters.push(`id.eq.${normalizedSearch}`);
        }
        query = query.or(filters.join(","));
      }
      const { data, error, count } = await query.range(
        page * PAGE_SIZE,
        (page + 1) * PAGE_SIZE - 1,
      );
      if (error) throw error;
      return { items: data as PropertyRow[], count: count ?? 0 };
    },
  });

  const items = propertiesQuery.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((propertiesQuery.data?.count ?? 0) / PAGE_SIZE));

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
    onSuccess: () => {
      toast.success("Видимостта на обявата е обновена");
      qc.invalidateQueries({ queryKey: ["admin-properties"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error: Error) => toast.error(`Неуспешна промяна: ${error.message}`),
  });

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(p: PropertyRow) {
    setEditing(p);
    setOpen(true);
  }
  function openProperty(p: PropertyRow) {
    if (p.is_published) {
      void navigate({ to: "/properties/$id", params: { id: p.id } });
      return;
    }
    openEdit(p);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-5 rounded-[1.5rem] border border-slate-200/80 bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-7">
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
            Управление на обявите
          </div>
          <h1 className="font-display text-3xl text-navy sm:text-4xl">Имоти</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Преглеждайте, редактирайте и публикувайте оферти.
          </p>
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <div className="text-sm text-muted-foreground sm:hidden">
            {propertiesQuery.data?.count ?? 0} обяви
          </div>
          <Button onClick={openNew} className="min-h-12 rounded-xl bg-navy px-5 hover:bg-navy-deep">
            <Plus className="mr-2 h-4 w-4" /> Добави имот
          </Button>
        </div>
      </section>

      <Card className="border border-slate-200/80 bg-white shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[minmax(12rem,1fr)_14rem_14rem]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Заглавие, град, квартал, адрес или ID..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                className="pl-9"
                aria-label="Търсене на имоти"
                autoComplete="off"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value as PropType | "all");
                setPage(0);
              }}
            >
              <SelectTrigger aria-label="Филтър по тип">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всички типове</SelectItem>
                {TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as PropStatus | "all");
                setPage(0);
              }}
            >
              <SelectTrigger aria-label="Филтър по статус">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всички статуси</SelectItem>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="hidden border border-slate-200/80 bg-white shadow-sm md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="pl-6">Имот</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Локация</TableHead>
                <TableHead className="pr-6 text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {propertiesQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Зареждане...
                  </TableCell>
                </TableRow>
              ) : propertiesQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-destructive">
                    <span role="alert">
                      Имотите не можаха да се заредят: {propertiesQuery.error.message}
                    </span>
                    <Button
                      className="ml-3"
                      variant="outline"
                      size="sm"
                      onClick={() => void propertiesQuery.refetch()}
                    >
                      Опитай отново
                    </Button>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Няма имоти. Добавете първия!
                  </TableCell>
                </TableRow>
              ) : (
                items.map((p) => (
                  <TableRow
                    key={p.id}
                    className="group cursor-pointer transition-colors hover:bg-slate-50/70"
                    onClick={(event) => {
                      if (
                        event.target instanceof Element &&
                        event.target.closest("button, a, input, [role='button']")
                      ) {
                        return;
                      }
                      openProperty(p);
                    }}
                  >
                    <TableCell className="py-4 pl-6">
                      <div className="flex min-w-52 items-center gap-3">
                        {p.main_image ? (
                          <img
                            src={p.main_image}
                            alt=""
                            loading="lazy"
                            className="h-12 w-16 shrink-0 rounded-lg bg-slate-100 object-cover"
                          />
                        ) : (
                          <div className="grid h-12 w-16 shrink-0 place-items-center rounded-lg bg-[#f3f1ea] text-navy">
                            <Home className="h-5 w-5" aria-hidden="true" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => openProperty(p)}
                            className="max-w-64 truncate text-left font-semibold text-navy hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                            aria-label={
                              p.is_published
                                ? `Отвори обявата ${p.title}`
                                : `Редактирай черновата ${p.title}`
                            }
                          >
                            {p.title}
                          </button>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {p.area != null ? `${p.area} м²` : "Площ не е посочена"}
                            {p.yard_area != null ? ` · двор ${p.yard_area} м²` : ""}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{p.type}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-medium ${p.is_published ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                      >
                        {p.is_published ? "Публикувана" : "Чернова"}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums text-navy">
                      € {Number(p.price).toLocaleString("bg-BG")}
                      <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                        {p.status}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                        {p.district ? `${p.district}, ` : ""}
                        {p.city}
                      </span>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={toggleMutation.isPending}
                          onClick={() =>
                            toggleMutation.mutate({ id: p.id, is_published: !p.is_published })
                          }
                          title={p.is_published ? "Скрий" : "Покажи"}
                          aria-label={p.is_published ? `Скрий ${p.title}` : `Публикувай ${p.title}`}
                          className="h-10 w-10 rounded-lg"
                        >
                          {p.is_published ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(p)}
                          title="Редактирай"
                          aria-label={`Редактирай ${p.title}`}
                          className="h-10 w-10 rounded-lg"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Изтрий "${p.title}"?`)) delMutation.mutate(p.id);
                          }}
                          title="Изтрий"
                          aria-label={`Изтрий ${p.title}`}
                          className="h-10 w-10 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="space-y-3 md:hidden">
        {propertiesQuery.isLoading ? (
          <Card role="status" className="border-slate-200 bg-white shadow-sm">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Зареждане на обявите...
            </CardContent>
          </Card>
        ) : propertiesQuery.isError ? (
          <Card role="alert" className="border-destructive/20 bg-white shadow-sm">
            <CardContent className="flex flex-col items-start gap-3 py-6 text-sm text-destructive">
              <span>Имотите не можаха да се заредят: {propertiesQuery.error.message}</span>
              <Button variant="outline" onClick={() => void propertiesQuery.refetch()}>
                Опитай отново
              </Button>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="py-10 text-center">
              <Home className="mx-auto h-7 w-7 text-gold" aria-hidden="true" />
              <p className="mt-3 font-medium text-navy">Все още няма такива обяви</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Променете филтрите или добавете имот.
              </p>
            </CardContent>
          </Card>
        ) : (
          items.map((p) => (
            <article
              key={p.id}
              className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-[border-color,box-shadow] hover:border-gold/60 hover:shadow-md"
            >
              <button
                type="button"
                className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
                aria-label={
                  p.is_published ? `Отвори обявата ${p.title}` : `Редактирай черновата ${p.title}`
                }
                onClick={() => openProperty(p)}
              >
                <span className="sr-only">
                  {p.is_published ? `Отвори обявата ${p.title}` : `Редактирай черновата ${p.title}`}
                </span>
              </button>
              <div className="pointer-events-none relative z-10 flex gap-3 p-4">
                {p.main_image ? (
                  <img
                    src={p.main_image}
                    alt=""
                    loading="lazy"
                    className="h-20 w-24 shrink-0 rounded-xl bg-slate-100 object-cover"
                  />
                ) : (
                  <div className="grid h-20 w-24 shrink-0 place-items-center rounded-xl bg-[#f3f1ea] text-navy">
                    <Home className="h-6 w-6" aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex min-h-6 items-center rounded-full px-2 text-[10px] font-semibold ${p.is_published ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                    >
                      {p.is_published ? "Публикувана" : "Чернова"}
                    </span>
                    <span className="text-xs text-muted-foreground">{p.type}</span>
                  </div>
                  <h2 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-navy">
                    {p.title}
                  </h2>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0 text-gold" aria-hidden="true" />
                    <span className="truncate">
                      {p.district ? `${p.district}, ` : ""}
                      {p.city}
                    </span>
                  </p>
                  <div className="mt-1 font-semibold tabular-nums text-navy">
                    € {Number(p.price).toLocaleString("bg-BG")}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {p.status}
                    </span>
                  </div>
                </div>
              </div>
              {p.yard_area != null && (
                <div className="pointer-events-none relative z-10 border-t border-slate-100 px-4 py-2 text-xs text-muted-foreground">
                  Двор: {p.yard_area} м²
                </div>
              )}
              <div className="relative z-10 flex justify-end gap-1 border-t border-slate-100 bg-white px-3 py-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-11 w-11 rounded-lg"
                  disabled={toggleMutation.isPending}
                  onClick={() => toggleMutation.mutate({ id: p.id, is_published: !p.is_published })}
                  aria-label={p.is_published ? `Скрий ${p.title}` : `Публикувай ${p.title}`}
                >
                  {p.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-11 w-11 rounded-lg"
                  onClick={() => openEdit(p)}
                  aria-label={`Редактирай ${p.title}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-11 w-11 rounded-lg"
                  onClick={() => {
                    if (confirm(`Изтрий "${p.title}"?`)) delMutation.mutate(p.id);
                  }}
                  aria-label={`Изтрий ${p.title}`}
                >
                  <Trash2 className="h-4 w-4 text-rose-600" />
                </Button>
              </div>
            </article>
          ))
        )}
      </div>

      {!propertiesQuery.isError && !propertiesQuery.isLoading && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm shadow-sm sm:px-5">
          <span className="text-muted-foreground">
            {propertiesQuery.data?.count ?? 0} имота{" "}
            <span className="mx-1.5 text-slate-300">/</span> Страница {page + 1} от {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="min-h-11 rounded-xl"
              disabled={page === 0 || propertiesQuery.isFetching}
              onClick={() => setPage((current) => current - 1)}
            >
              Предишна
            </Button>
            <Button
              variant="outline"
              className="min-h-11 rounded-xl"
              disabled={page + 1 >= totalPages || propertiesQuery.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Следваща
            </Button>
          </div>
        </div>
      )}

      <PropertyDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["admin-properties"] });
          qc.invalidateQueries({ queryKey: ["admin-stats"] });
        }}
      />
    </div>
  );
}

function PropertyDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
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
  const uploadedBeforeSave = useRef<string[]>([]);

  // Initialize the form once, when the dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      uploadedBeforeSave.current = [];
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
          yard_area: editing.yard_area,
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
        const { data, error } = await supabase
          .from("property_images")
          .select("*")
          .eq("property_id", editing.id)
          .order("sort_order");
        if (error) throw error;
        const loadedImages = await Promise.all(
          (data ?? []).map(async (image) => ({
            id: image.id,
            url: image.url,
            preview_url: await adminMediaPreviewUrl(image.url),
            storage_path: image.storage_path,
            sort_order: image.sort_order,
          })),
        );
        if (!cancelled) {
          setImages(loadedImages);
        }
      } else {
        setForm(empty);
        setImages([]);
      }
    })().catch((error: unknown) => {
      if (!cancelled)
        toast.error(error instanceof Error ? error.message : "Галерията не можа да се зареди.");
    });
    return () => {
      cancelled = true;
    };
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
        uploadedBeforeSave.current.push(path);
        const url = mediaUrl(path);
        uploaded.push({
          url,
          preview_url: await adminMediaPreviewUrl(url),
          storage_path: path,
          sort_order: images.length + uploaded.length,
        });
      }
      const next = [...images, ...uploaded];
      setImages(next);
      const firstImage = uploaded.find((image) => !isVideoUrl(image.url));
      if (!form.main_image && firstImage) setForm((f) => ({ ...f, main_image: firstImage.url }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Грешка при качване");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(idx: number) {
    const img = images[idx];
    if (img.id) {
      const { error } = await supabase.from("property_images").delete().eq("id", img.id);
      if (error) {
        toast.error(`Снимката не може да бъде премахната: ${error.message}`);
        return;
      }
    }
    if (img.storage_path) {
      const { error } = await supabase.storage.from("property-images").remove([img.storage_path]);
      if (error && !img.id) {
        toast.error(`Файлът не може да бъде премахнат: ${error.message}`);
        return;
      }
      if (error) {
        toast.error(`Записът е премахнат, но файлът остана в хранилището: ${error.message}`);
      } else {
        uploadedBeforeSave.current = uploadedBeforeSave.current.filter(
          (path) => path !== img.storage_path,
        );
      }
    }
    const nextImages = images
      .filter((_, i) => i !== idx)
      .map((image, sort_order) => ({ ...image, sort_order }));
    setImages(nextImages);
    if (form.main_image === img.url) {
      setForm((current) => ({
        ...current,
        main_image: nextImages.find((image) => !isVideoUrl(image.url))?.url ?? "",
      }));
    }
  }

  function moveImage(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= images.length) return;
    const reordered = [...images];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setImages(reordered.map((image, sort_order) => ({ ...image, sort_order })));
  }

  async function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen && uploadedBeforeSave.current.length > 0) {
      const paths = [...uploadedBeforeSave.current];
      const { error } = await supabase.storage.from("property-images").remove(paths);
      if (error) {
        toast.error(
          `Качените файлове не можаха да се почистят. Затворете отново след проверка: ${error.message}`,
        );
        return;
      }
      uploadedBeforeSave.current = [];
    }
    onOpenChange(nextOpen);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Въведете заглавие");
    if (form.yard_area != null && form.yard_area < 0) {
      return toast.error("Площта на двора не може да бъде отрицателна.");
    }
    setSaving(true);
    let propertyWriteCompleted = false;
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        area: form.area ? Number(form.area) : null,
        yard_area:
          (form.type === "Къща" || form.type === "Апартамент") && form.yard_area != null
            ? Number(form.yard_area)
            : null,
        rooms: hasRooms(form.type) && form.rooms ? Number(form.rooms) : null,
        layout: hasLayout(form.type) && form.layout ? form.layout : null,
        floor: hasFloor(form.type) && form.floor ? form.floor : null,
        map_lat: form.map_lat ? Number(form.map_lat) : null,
        map_lng: form.map_lng ? Number(form.map_lng) : null,
        main_image:
          form.main_image && !isVideoUrl(form.main_image)
            ? form.main_image
            : images.find((image) => !isVideoUrl(image.url))?.url || null,
      };
      let propertyId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("properties").update(payload).eq("id", editing.id);
        if (error) throw error;
        propertyWriteCompleted = true;
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from("properties")
          .insert({ ...payload, created_by: user?.id })
          .select("id")
          .single();
        if (error) throw error;
        propertyId = data.id;
        propertyWriteCompleted = true;
      }
      // Sync gallery: insert new images (those without id) tied to property
      for (const [sort_order, image] of images.entries()) {
        if (!image.id || image.sort_order === sort_order) continue;
        const { error } = await supabase
          .from("property_images")
          .update({ sort_order })
          .eq("id", image.id);
        if (error) throw error;
      }
      const newOnes = images.filter((i) => !i.id);
      if (propertyId && newOnes.length > 0) {
        const { error } = await supabase.from("property_images").insert(
          newOnes.map((image) => ({
            property_id: propertyId,
            url: image.url,
            storage_path: image.storage_path,
            sort_order: images.indexOf(image),
          })),
        );
        if (error) throw error;
      }
      toast.success(editing ? "Запазено" : "Имотът е добавен");
      uploadedBeforeSave.current = [];
      onOpenChange(false);
      onSaved();
    } catch (err) {
      if (propertyWriteCompleted) uploadedBeforeSave.current = [];
      toast.error(err instanceof Error ? err.message : "Грешка");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => void handleDialogOpenChange(nextOpen)}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-navy">
            {editing ? "Редактирай имот" : "Нов имот"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave} className="space-y-5">
          <Field label="Заглавие" required>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Тип имот">
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as PropType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Статус">
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as PropStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Цена (€)">
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </Field>
            <Field label="Квадратура (м²)">
              <Input
                type="number"
                value={form.area ?? ""}
                onChange={(e) =>
                  setForm({ ...form, area: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Field>
            {(form.type === "Къща" || form.type === "Апартамент") && (
              <Field label="Двор (м²)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.yard_area ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      yard_area: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="По желание"
                />
              </Field>
            )}
            {hasRooms(form.type) && (
              <Field label="Стаи">
                <Input
                  type="number"
                  value={form.rooms ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, rooms: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </Field>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Град">
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </Field>
            <Field label="Квартал">
              <Input
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
              />
            </Field>
            {hasLayout(form.type) && (
              <Field label="Вид апартамент">
                <Select
                  value={form.layout || "none"}
                  onValueChange={(v) => setForm({ ...form, layout: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Без" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без</SelectItem>
                    {LAYOUTS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>

          {hasFloor(form.type) && (
            <div className="grid gap-4 sm:grid-cols-3">
              {form.type === "Къща" ? (
                <Field label="Брой етажи">
                  <Input
                    type="number"
                    min={1}
                    value={form.floor}
                    onChange={(e) => setForm({ ...form, floor: e.target.value })}
                    placeholder="напр. 2"
                  />
                </Field>
              ) : (
                <Field label="Етаж">
                  <Input
                    value={form.floor}
                    onChange={(e) => setForm({ ...form, floor: e.target.value })}
                    placeholder="напр. 4 / 6"
                  />
                </Field>
              )}
            </div>
          )}

          <Field label="Адрес">
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>

          <Field label="Описание">
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          {/* Images */}
          <div>
            <Label>Снимки и видеа</Label>
            <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-square overflow-hidden rounded-lg border"
                >
                  {isVideoUrl(img.url) ? (
                    <video
                      src={img.preview_url ?? img.url}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={img.preview_url ?? img.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-full bg-black/65 text-white opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label={`Премахни медия ${idx + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute right-1 bottom-1 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveImage(idx, -1)}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-black/70 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40"
                      aria-label={`Премести медия ${idx + 1} нагоре`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === images.length - 1}
                      onClick={() => moveImage(idx, 1)}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-black/70 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40"
                      aria-label={`Премести медия ${idx + 1} надолу`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  {isVideoUrl(img.url) && (
                    <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                      <Video className="h-3 w-3" /> Видео
                    </span>
                  )}
                  {!isVideoUrl(img.url) && form.main_image === img.url && (
                    <span className="absolute bottom-1 left-1 rounded bg-gold px-1.5 py-0.5 text-[10px] font-medium text-navy-deep">
                      Основна
                    </span>
                  )}
                  {!isVideoUrl(img.url) && form.main_image !== img.url && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, main_image: img.url })}
                      className="absolute bottom-1 left-1 min-h-9 rounded-lg bg-black/70 px-2 text-[10px] text-white opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      Основна
                    </button>
                  )}
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground hover:border-navy hover:text-navy">
                {uploading ? (
                  <span className="text-xs">Качване...</span>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    <span className="text-xs">Качи снимки</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading}
                  className="hidden"
                  onChange={(e) => {
                    void uploadFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground hover:border-navy hover:text-navy">
                {uploading ? (
                  <span className="text-xs">Качване...</span>
                ) : (
                  <>
                    <Video className="h-5 w-5" />
                    <span className="text-xs">Качи видео</span>
                  </>
                )}
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  disabled={uploading}
                  className="hidden"
                  onChange={(e) => {
                    void uploadFiles(e.currentTarget.files);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Можете да добавите снимки и видео файлове до 25 MB всеки. YouTube/Vimeo линковете
              остават налични по-долу.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Видео URL (YouTube/Vimeo)">
              <Input
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              />
            </Field>
            <Field label="Google Maps lat,lng">
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="lat"
                  value={form.map_lat ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, map_lat: e.target.value ? Number(e.target.value) : null })
                  }
                />
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="lng"
                  value={form.map_lng ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, map_lng: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </div>
            </Field>
          </div>

          {/* SEO */}
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer font-medium text-navy">SEO настройки</summary>
            <div className="mt-4 space-y-4">
              <Field label="SEO заглавие">
                <Input
                  value={form.seo_title}
                  onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                />
              </Field>
              <Field label="SEO описание">
                <Textarea
                  rows={2}
                  value={form.seo_description}
                  onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                />
              </Field>
              <Field label="Ключови думи">
                <Input
                  value={form.seo_keywords}
                  onChange={(e) => setForm({ ...form, seo_keywords: e.target.value })}
                />
              </Field>
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-6 rounded-lg bg-muted/40 p-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => setForm({ ...form, is_published: v })}
              />
              Публикувана
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.is_featured}
                onCheckedChange={(v) => setForm({ ...form, is_featured: v })}
              />
              Препоръчана
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleDialogOpenChange(false)}
            >
              Откажи
            </Button>
            <Button type="submit" disabled={saving} className="bg-navy hover:bg-navy-deep">
              {saving ? "Запазване..." : "Запази"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
