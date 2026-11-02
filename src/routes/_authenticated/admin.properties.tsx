import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Home, Pencil, Trash2, Eye, EyeOff, Search, MapPin } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { adminMediaPreviewUrl } from "@/lib/admin/media";
import { isVideoUrl, storagePathFromMediaUrl } from "@/lib/media";
import type { PropertyRow } from "@/lib/admin/queries";
import {
  PropertyImageManager,
  type ManagedPropertyImage,
} from "@/components/admin/PropertyImageManager";
import { PropertyPreviewDialog } from "@/components/admin/PropertyPreviewDialog";
import type { Property, PropertyType } from "@/data/properties";
import { isManagedPropertyMediaPath } from "@/lib/admin/property-images";
import { useLanguage } from "@/i18n/LanguageProvider";
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

type Img = ManagedPropertyImage;

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
  const deletingIdsRef = useRef(new Set<string>());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    if (!propertiesQuery.data) return;
    const lastPage = Math.max(0, totalPages - 1);
    if (page > lastPage) setPage(lastPage);
  }, [page, propertiesQuery.data, totalPages]);

  const delMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select("id,main_image")
        .eq("id", id)
        .maybeSingle();
      if (propertyError) throw propertyError;
      if (!property) throw new Error("Имотът вече не съществува или нямате достъп до него.");

      const { data: propertyImages, error: imagesError } = await supabase
        .from("property_images")
        .select("url,storage_path")
        .eq("property_id", id);
      if (imagesError) throw imagesError;

      const { data: deleted, error } = await supabase
        .from("properties")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!deleted) throw new Error("Имотът не беше изтрит.");

      return cleanupUnusedPropertyMedia([
        ...(propertyImages ?? []),
        ...(property.main_image ? [{ url: property.main_image, storage_path: null }] : []),
      ]);
    },
    onSuccess: async (cleanupFailures) => {
      if (cleanupFailures > 0) {
        toast.warning(
          `Имотът е изтрит, но ${cleanupFailures} файла не бяха премахнати. Проверете Storage за остатъчни файлове.`,
        );
      } else {
        toast.success("Имотът е изтрит");
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-properties"] }),
        qc.invalidateQueries({ queryKey: ["admin-stats"] }),
      ]);
    },
    onError: (error: Error) => toast.error(`Имотът не беше изтрит: ${error.message}`),
  });

  function deleteProperty(id: string) {
    if (deletingIdsRef.current.has(id)) return;
    deletingIdsRef.current.add(id);
    setDeletingIds((current) => new Set(current).add(id));
    delMutation.mutate(id, {
      onSettled: () => {
        deletingIdsRef.current.delete(id);
        setDeletingIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      },
    });
  }

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
                          disabled={toggleMutation.isPending || deletingIds.has(p.id)}
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
                          disabled={deletingIds.has(p.id)}
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
                          disabled={deletingIds.has(p.id)}
                          onClick={() => {
                            if (confirm(`Изтрий "${p.title}"?`)) deleteProperty(p.id);
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
                  disabled={toggleMutation.isPending || deletingIds.has(p.id)}
                  onClick={() => toggleMutation.mutate({ id: p.id, is_published: !p.is_published })}
                  aria-label={p.is_published ? `Скрий ${p.title}` : `Публикувай ${p.title}`}
                >
                  {p.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-11 w-11 rounded-lg"
                  disabled={deletingIds.has(p.id)}
                  onClick={() => openEdit(p)}
                  aria-label={`Редактирай ${p.title}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-11 w-11 rounded-lg"
                  disabled={deletingIds.has(p.id)}
                  onClick={() => {
                    if (confirm(`Изтрий "${p.title}"?`)) deleteProperty(p.id);
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
  const { t } = useLanguage();
  const [form, setForm] = useState(empty);
  const [images, setImages] = useState<Img[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(editing?.id ?? null);
  const [removedImages, setRemovedImages] = useState<Img[]>([]);
  const [galleryLoadFailed, setGalleryLoadFailed] = useState(false);
  const uploadedBeforeSave = useRef<string[]>([]);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      uploadedBeforeSave.current = [];
      setRecordId(editing?.id ?? null);
      setRemovedImages([]);
      setImages([]);
      setGalleryLoadFailed(false);
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
        const loadedImages: Img[] = await Promise.all(
          (data ?? []).map(async (image) => ({
            id: image.id,
            url: image.url,
            preview_url: await adminMediaPreviewUrl(image.url),
            storage_path: image.storage_path,
            sort_order: image.sort_order,
            name: image.storage_path?.split("/").pop() ?? image.url.split("/").pop() ?? undefined,
          })),
        );
        if (editing.main_image && !loadedImages.some((image) => image.url === editing.main_image)) {
          loadedImages.unshift({
            url: editing.main_image,
            preview_url: await adminMediaPreviewUrl(editing.main_image),
            storage_path: storagePathFromMediaUrl(editing.main_image),
            sort_order: -1,
            name: editing.main_image.split("/").pop() ?? undefined,
            persisted: true,
          });
        }
        if (!cancelled) {
          setImages(loadedImages);
        }
      } else {
        setForm(empty);
        setImages([]);
      }
    })().catch((error: unknown) => {
      if (!cancelled) {
        setGalleryLoadFailed(true);
        toast.error(error instanceof Error ? error.message : "Галерията не можа да се зареди.");
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  async function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen && uploading) {
      toast.error(t("admin.images.waitBeforeClose"));
      return false;
    }
    if (!nextOpen && (saving || savingRef.current)) return false;
    if (!nextOpen && uploadedBeforeSave.current.length > 0) {
      const paths = [...uploadedBeforeSave.current];
      const { error } = await supabase.storage.from("property-images").remove(paths);
      if (error) {
        toast.error(`${t("admin.images.cleanupError")} ${error.message}`);
        return false;
      }
      uploadedBeforeSave.current = [];
    }
    onOpenChange(nextOpen);
    return true;
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (savingRef.current) return;
    if (!form.title.trim()) return toast.error("Въведете заглавие");
    if (galleryLoadFailed) return toast.error(t("admin.images.galleryLoadError"));
    if (uploading) return toast.error(t("admin.images.waitBeforeSave"));
    if (form.yard_area != null && form.yard_area < 0) {
      return toast.error("Площта на двора не може да бъде отрицателна.");
    }
    if (
      !Number.isFinite(form.price) ||
      form.price < 0 ||
      [form.area, form.yard_area, form.rooms].some(
        (value) => value != null && (!Number.isFinite(value) || value < 0),
      )
    ) {
      return toast.error("Проверете въведените цена и площи.");
    }
    savingRef.current = true;
    setSaving(true);
    let propertySaved = false;
    try {
      const coverImage =
        images.find((image) => image.url === form.main_image && !isVideoUrl(image.url)) ??
        images.find((image) => !isVideoUrl(image.url));
      const payload = {
        ...form,
        price: Number(form.price),
        area: form.area != null ? Number(form.area) : null,
        yard_area:
          (form.type === "Къща" || form.type === "Апартамент") && form.yard_area != null
            ? Number(form.yard_area)
            : null,
        rooms: hasRooms(form.type) && form.rooms != null ? Number(form.rooms) : null,
        layout: hasLayout(form.type) && form.layout ? form.layout : null,
        floor: hasFloor(form.type) && form.floor ? form.floor : null,
        map_lat: form.map_lat != null ? Number(form.map_lat) : null,
        map_lng: form.map_lng != null ? Number(form.map_lng) : null,
        main_image: coverImage?.url ?? null,
      };
      let propertyId = recordId;
      if (propertyId) {
        const { data, error } = await supabase
          .from("properties")
          .update(payload)
          .eq("id", propertyId)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error(t("admin.images.propertySaveError"));
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
        setRecordId(propertyId);
      }
      propertySaved = true;

      const galleryImages = images.filter((image) => !image.persisted);
      const galleryOrder = await Promise.all(
        galleryImages.map(async (image, sort_order) => {
          if (!image.id) return null;
          if (image.sort_order === sort_order) return null;
          const result = await supabase
            .from("property_images")
            .update({ sort_order })
            .eq("id", image.id!)
            .eq("property_id", propertyId!)
            .select("id")
            .maybeSingle();
          if (result.error) throw result.error;
          if (!result.data) throw new Error(t("admin.images.gallerySaveError"));
          return { id: image.id!, sort_order };
        }),
      );
      if (galleryOrder.some(Boolean)) {
        setImages((current) =>
          current.map((image) => {
            const persisted = galleryOrder.find((item) => item?.id === image.id);
            return persisted ? { ...image, sort_order: persisted.sort_order } : image;
          }),
        );
      }

      const newOnes = images.filter((image) => !image.id && !image.persisted);
      if (newOnes.length > 0) {
        const storagePaths = [
          ...new Set(newOnes.flatMap((image) => (image.storage_path ? [image.storage_path] : []))),
        ];
        let alreadyLinked: typeof newOnes = [];
        if (storagePaths.length > 0) {
          const { data, error } = await supabase
            .from("property_images")
            .select("id,property_id,url,storage_path,sort_order")
            .eq("property_id", propertyId)
            .in("storage_path", storagePaths);
          if (error) throw error;
          alreadyLinked = (data ?? []).map((image) => ({
            id: image.id,
            url: image.url,
            storage_path: image.storage_path,
            sort_order: image.sort_order,
          }));
        }
        const linkedPaths = new Set(alreadyLinked.map((image) => image.storage_path));
        const imagesToInsert = newOnes.filter(
          (image) => !image.storage_path || !linkedPaths.has(image.storage_path),
        );
        let inserted: Array<{
          id: string;
          property_id: string;
          url: string;
          storage_path: string | null;
          sort_order: number;
        }> = [];
        if (imagesToInsert.length > 0) {
          const { data, error } = await supabase
            .from("property_images")
            .insert(
              imagesToInsert.map((image) => ({
                property_id: propertyId,
                url: image.url,
                storage_path: image.storage_path,
                sort_order: images.filter((candidate) => !candidate.persisted).indexOf(image),
              })),
            )
            .select("id,property_id,url,storage_path,sort_order");
          if (error) throw error;
          inserted = data ?? [];
          if (inserted.length !== imagesToInsert.length) {
            throw new Error(t("admin.images.saveError"));
          }
        }
        const linkedImages = [...alreadyLinked, ...inserted];
        setImages((current) =>
          current.map((image) => {
            const row = linkedImages.find(
              (linkedImage) =>
                linkedImage.storage_path === image.storage_path && linkedImage.url === image.url,
            );
            return row ? { ...image, id: row.id } : image;
          }),
        );
        const persistedPaths = new Set(
          linkedImages.map((image) => image.storage_path).filter(Boolean),
        );
        uploadedBeforeSave.current = uploadedBeforeSave.current.filter(
          (path) => !persistedPaths.has(path),
        );
      }

      const removedIds = new Set<string>();
      for (const image of [...removedImages]) {
        await removePropertyImage(propertyId, image);
        if (image.id) removedIds.add(image.id);
        setRemovedImages((current) =>
          current.filter((candidate) => !sameManagedImage(candidate, image)),
        );
      }
      setRemovedImages([]);
      setImages((current) => current.filter((image) => !image.id || !removedIds.has(image.id)));
      onSaved();
      const closed = await handleDialogOpenChange(false);
      if (!closed) return;
      toast.success(editing || recordId ? "Запазено" : "Имотът е добавен");
    } catch (err) {
      if (propertySaved) {
        onSaved();
        toast.error(
          `${t("admin.images.propertySavedGalleryFailed")} ${err instanceof Error ? err.message : t("admin.images.saveError")}`,
        );
      } else {
        toast.error(err instanceof Error ? err.message : t("admin.images.saveError"));
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const coverImage = images.find(
    (image) => image.url === form.main_image && !isVideoUrl(image.url),
  );
  const previewGalleryImages = [
    ...(coverImage ? [coverImage.preview_url ?? coverImage.url] : []),
    ...images
      .filter((image) => !isVideoUrl(image.url) && image.url !== coverImage?.url)
      .map((image) => image.preview_url ?? image.url),
  ];
  const previewType: PropertyType =
    form.type === "Апартамент" ||
    form.type === "Къща" ||
    form.type === "Парцел" ||
    form.type === "Земеделска земя"
      ? form.type
      : "Бизнес имот";
  const previewProperty: Property = {
    id: recordId ?? "unsaved-preview",
    title: form.title,
    type: previewType,
    listing: form.status === "Под наем" || form.status === "Отдаден" ? "Наем" : "Продажба",
    city: form.city,
    district: form.district,
    price: Number(form.price),
    area: Number(form.area ?? 0),
    yardArea: form.yard_area,
    rooms: form.rooms,
    floor: form.floor,
    layout: LAYOUTS.find((layout) => layout === form.layout),
    image: previewGalleryImages[0] ?? null,
    images: previewGalleryImages,
    description: form.description,
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => void handleDialogOpenChange(nextOpen)}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DialogTitle className="font-display text-2xl text-navy">
              {editing || recordId ? "Редактирай имот" : "Нов имот"}
            </DialogTitle>
            <PropertyPreviewDialog
              property={previewProperty}
              galleryImages={previewGalleryImages}
            />
          </div>
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
            <Field label="Населено място">
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

          <PropertyImageManager
            images={images}
            onImagesChange={setImages}
            coverUrl={form.main_image}
            onCoverChange={(main_image) => setForm((current) => ({ ...current, main_image }))}
            onImageRemoved={(image) =>
              setRemovedImages((current) =>
                current.some((existing) => sameManagedImage(existing, image))
                  ? current
                  : [...current, image],
              )
            }
            onNewUpload={(path) => {
              if (!uploadedBeforeSave.current.includes(path)) {
                uploadedBeforeSave.current.push(path);
              }
            }}
            onDiscardedUpload={(path) => {
              uploadedBeforeSave.current = uploadedBeforeSave.current.filter(
                (existing) => existing !== path,
              );
            }}
            onUploadingChange={setUploading}
            disabled={saving || galleryLoadFailed}
          />

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

async function removePropertyImage(propertyId: string, image: Img): Promise<void> {
  let removedRow: {
    id: string;
    property_id: string;
    url: string;
    storage_path: string | null;
    sort_order: number;
    created_at: string;
  } | null = null;

  if (image.id) {
    const { data, error } = await supabase
      .from("property_images")
      .delete()
      .eq("id", image.id)
      .eq("property_id", propertyId)
      .select("id,property_id,url,storage_path,sort_order,created_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("The property image could not be found.");
    removedRow = data;
  }

  const storagePath = image.storage_path ?? storagePathFromMediaUrl(image.url);
  if (!storagePath) return;

  try {
    if (await hasPropertyMediaReferences(image.url, storagePath)) return;

    const { error } = await supabase.storage.from("property-images").remove([storagePath]);
    if (error) throw error;
  } catch (error) {
    if (removedRow) {
      const { error: restoreError } = await supabase.from("property_images").insert(removedRow);
      if (restoreError) {
        console.error("[property-images] Image link restoration failed", restoreError);
        throw new Error(
          "Image cleanup failed and the property image reference could not be restored.",
        );
      }
    }
    throw new Error(
      `The image could not be safely removed. Its property reference was restored where possible. ${
        error instanceof Error ? error.message : ""
      }`.trim(),
    );
  }
}

async function cleanupUnusedPropertyMedia(
  images: Array<{ url: string; storage_path: string | null }>,
): Promise<number> {
  const mediaByPath = new Map<string, { url: string; storage_path: string | null }>();
  for (const image of images) {
    const storagePath = image.storage_path ?? storagePathFromMediaUrl(image.url);
    if (storagePath) mediaByPath.set(storagePath, { ...image, storage_path: storagePath });
  }

  let failures = 0;
  for (const [storagePath, image] of mediaByPath) {
    if (!isManagedPropertyMediaPath(storagePath)) {
      failures += 1;
      continue;
    }
    try {
      if (await hasPropertyMediaReferences(image.url, storagePath)) continue;
      const { error } = await supabase.storage.from("property-images").remove([storagePath]);
      if (error) throw error;
    } catch (error) {
      failures += 1;
      console.error("[property-images] Unreferenced image cleanup failed", error);
    }
  }
  return failures;
}

async function hasPropertyMediaReferences(url: string, storagePath: string): Promise<boolean> {
  const [galleryPath, galleryUrl, coverUrl, teamPhoto, siteSettings] = await Promise.all([
    supabase
      .from("property_images")
      .select("id", { count: "exact", head: true })
      .eq("storage_path", storagePath),
    supabase.from("property_images").select("id", { count: "exact", head: true }).eq("url", url),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("main_image", url),
    supabase.from("team_members").select("id", { count: "exact", head: true }).eq("photo_url", url),
    supabase
      .from("site_settings")
      .select("logo_url,hero_image_url,services_image_url,og_image_url")
      .eq("id", 1)
      .maybeSingle(),
  ]);
  const queryError =
    galleryPath.error ??
    galleryUrl.error ??
    coverUrl.error ??
    teamPhoto.error ??
    siteSettings.error;
  if (queryError) throw queryError;

  const settingsUrls = siteSettings.data
    ? [
        siteSettings.data.logo_url,
        siteSettings.data.hero_image_url,
        siteSettings.data.services_image_url,
        siteSettings.data.og_image_url,
      ]
    : [];
  return Boolean(
    (galleryPath.count ?? 0) > 0 ||
    (galleryUrl.count ?? 0) > 0 ||
    (coverUrl.count ?? 0) > 0 ||
    (teamPhoto.count ?? 0) > 0 ||
    settingsUrls.some(
      (reference) =>
        reference === url || (reference && storagePathFromMediaUrl(reference) === storagePath),
    ),
  );
}

function sameManagedImage(left: Img, right: Img): boolean {
  return Boolean(
    (left.id && right.id && left.id === right.id) ||
    (left.storage_path && right.storage_path && left.storage_path === right.storage_path) ||
    left.url === right.url,
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
