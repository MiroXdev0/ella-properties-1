import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { SettingsRow } from "@/lib/admin/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/lib/admin/guards";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { fileExt, isImageFile, MAX_UPLOAD_BYTES, mediaUrl } from "@/lib/media";
import { adminMediaPreviewUrl } from "@/lib/admin/media";

const ICON_CHOICES = [
  "Home",
  "Key",
  "Building2",
  "FileText",
  "Award",
  "Shield",
  "Users",
  "TrendingUp",
  "Star",
  "Handshake",
  "Briefcase",
  "MapPin",
  "Phone",
  "Mail",
  "Check",
];

type NavLink = { href: string; label: string };
type ServiceItem = { icon: string; title: string; items: string[] };
type TestimonialItem = { name: string; role: string; text: string };
type LocalizedTextKey =
  | "brand_name"
  | "brand_tagline"
  | "hero_eyebrow"
  | "hero_title"
  | "hero_subtitle"
  | "hero_cta_label"
  | "hero_secondary_cta_label"
  | "about_eyebrow"
  | "about_title"
  | "about_text"
  | "about_text_secondary"
  | "stat1_label"
  | "stat2_label"
  | "stat3_label"
  | "about_stat4_label"
  | "services_eyebrow"
  | "services_title"
  | "services_subtitle"
  | "services_image_heading"
  | "why_eyebrow"
  | "why_title"
  | "testimonials_eyebrow"
  | "testimonials_title"
  | "catalog_eyebrow"
  | "catalog_title"
  | "contact_eyebrow"
  | "contact_title"
  | "contact_subtitle"
  | "address"
  | "footer_description"
  | "footer_copyright"
  | "seo_home_title"
  | "seo_home_description";

const ENGLISH_TEXT_FIELDS: { key: LocalizedTextKey; label: string; multiline?: boolean }[] = [
  { key: "brand_name", label: "Brand name" },
  { key: "brand_tagline", label: "Tagline" },
  { key: "hero_eyebrow", label: "Hero eyebrow" },
  { key: "hero_title", label: "Hero heading", multiline: true },
  { key: "hero_subtitle", label: "Hero description", multiline: true },
  { key: "hero_cta_label", label: "Primary button label" },
  { key: "hero_secondary_cta_label", label: "Secondary button label" },
  { key: "about_eyebrow", label: "About eyebrow" },
  { key: "about_title", label: "About heading" },
  { key: "about_text", label: "About text", multiline: true },
  { key: "about_text_secondary", label: "Additional about text", multiline: true },
  { key: "stat1_label", label: "Statistic 1 label" },
  { key: "stat2_label", label: "Statistic 2 label" },
  { key: "stat3_label", label: "Statistic 3 label" },
  { key: "about_stat4_label", label: "Statistic 4 label" },
  { key: "services_eyebrow", label: "Services eyebrow" },
  { key: "services_title", label: "Services heading" },
  { key: "services_subtitle", label: "Services description", multiline: true },
  { key: "services_image_heading", label: "Credit Navigator heading" },
  { key: "why_eyebrow", label: "Why us eyebrow" },
  { key: "why_title", label: "Why us heading" },
  { key: "testimonials_eyebrow", label: "Testimonials eyebrow" },
  { key: "testimonials_title", label: "Testimonials heading" },
  { key: "catalog_eyebrow", label: "Property catalog eyebrow" },
  { key: "catalog_title", label: "Property catalog heading" },
  { key: "contact_eyebrow", label: "Contact eyebrow" },
  { key: "contact_title", label: "Contact heading" },
  { key: "contact_subtitle", label: "Contact description", multiline: true },
  { key: "address", label: "Address" },
  { key: "footer_description", label: "Footer description", multiline: true },
  { key: "footer_copyright", label: "Footer copyright" },
  { key: "seo_home_title", label: "Homepage SEO title" },
  { key: "seo_home_description", label: "Homepage SEO description", multiline: true },
];

export const Route = createFileRoute("/_authenticated/admin/settings")({
  beforeLoad: ({ context }) => requireAdmin(context),
  component: SettingsAdmin,
});

function SettingsAdmin() {
  const [form, setForm] = useState<Partial<SettingsRow>>({});
  const [contentEn, setContentEn] = useState<Record<string, Json>>({});
  const [workingHours, setWorkingHours] = useState({ bg: "", en: "" });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Настройките на сайта не са намерени.");
      return data as unknown as SettingsRow;
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm(data);
    setContentEn(
      data.content_en && typeof data.content_en === "object" && !Array.isArray(data.content_en)
        ? (data.content_en as Record<string, Json>)
        : {},
    );
    const storedHours = data.working_hours;
    const storedHoursObject =
      storedHours && typeof storedHours === "object" && !Array.isArray(storedHours)
        ? (storedHours as Record<string, Json>)
        : null;
    setWorkingHours(
      storedHoursObject
        ? {
            bg: typeof storedHoursObject.bg === "string" ? storedHoursObject.bg : "",
            en: typeof storedHoursObject.en === "string" ? storedHoursObject.en : "",
          }
        : { bg: "", en: "" },
    );
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;

    setSaving(true);
    try {
      const { id: _id, ...update } = form as SettingsRow;
      const { data: saved, error } = await supabase
        .from("site_settings")
        .update({ ...update, content_en: contentEn, working_hours: workingHours })
        .eq("id", 1)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (!saved) {
        throw new Error("Промените не са записани. Проверете администраторските си права.");
      }

      const savedSettings = saved as unknown as SettingsRow;
      setForm(savedSettings);
      queryClient.setQueryData(["admin-settings"], savedSettings);
      await queryClient.invalidateQueries({ queryKey: ["public-site-settings"] });
      toast.success("Настройките са запазени и обновени");
    } catch (error) {
      console.error("[admin-settings] Unable to save settings", error);
      toast.error(error instanceof Error ? error.message : "Грешка при запазване на настройките.");
    } finally {
      setSaving(false);
    }
  }

  const set = <K extends keyof SettingsRow>(k: K, v: SettingsRow[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const setEnglish = (key: string, value: Json) =>
    setContentEn((current) => ({ ...current, [key]: value }));
  const englishText = (key: LocalizedTextKey) =>
    typeof contentEn[key] === "string" ? (contentEn[key] as string) : "";

  const navLinks = (form.nav_links as NavLink[] | null) ?? [];
  const services = (form.services as ServiceItem[] | null) ?? [];
  const reasons = (form.why_reasons as string[] | null) ?? [];
  const testimonials = (form.testimonials as TestimonialItem[] | null) ?? [];
  const englishNavLinks = Array.isArray(contentEn.nav_links)
    ? (contentEn.nav_links as NavLink[])
    : navLinks;
  const englishServices = Array.isArray(contentEn.services)
    ? (contentEn.services as ServiceItem[])
    : services;
  const englishReasons = Array.isArray(contentEn.why_reasons)
    ? (contentEn.why_reasons as string[])
    : reasons;
  const englishTestimonials = Array.isArray(contentEn.testimonials)
    ? (contentEn.testimonials as TestimonialItem[])
    : testimonials;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-navy">Настройки на сайта</h1>
        <p className="text-sm text-muted-foreground">
          Съдържание, бранд, контакти и социални мрежи
        </p>
      </div>

      {isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Зареждане на настройките...
        </p>
      ) : isError ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            Настройките не можаха да се заредят:{" "}
            {error instanceof Error ? error.message : "Неизвестна грешка"}
          </p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => void refetch()}>
            Опитай отново
          </Button>
        </div>
      ) : data ? (
        <form onSubmit={save} className="space-y-6">
          <Section title="Бранд и цветове">
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="Име на бранда">
                <Input
                  value={form.brand_name ?? ""}
                  onChange={(e) => set("brand_name", e.target.value)}
                />
              </Row>
              <Row label="Слоган">
                <Input
                  value={form.brand_tagline ?? ""}
                  onChange={(e) => set("brand_tagline", e.target.value)}
                />
              </Row>
              <Row label="Основен цвят (Navy)">
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    className="h-10 w-16 p-1"
                    value={form.primary_color ?? "#0B1E3B"}
                    onChange={(e) => set("primary_color", e.target.value)}
                  />
                  <Input
                    value={form.primary_color ?? ""}
                    onChange={(e) => set("primary_color", e.target.value)}
                    placeholder="#0B1E3B"
                  />
                </div>
              </Row>
              <Row label="Акцентен цвят (Gold)">
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    className="h-10 w-16 p-1"
                    value={form.accent_color ?? "#C6A15B"}
                    onChange={(e) => set("accent_color", e.target.value)}
                  />
                  <Input
                    value={form.accent_color ?? ""}
                    onChange={(e) => set("accent_color", e.target.value)}
                    placeholder="#C6A15B"
                  />
                </div>
              </Row>
              <ImagePicker
                label="Лого на сайта"
                value={form.logo_url ?? ""}
                onChange={(value) => set("logo_url", value)}
              />
            </div>
          </Section>

          <Section title="Hero секция (начална страница)">
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="Надзаглавие">
                <Input
                  value={form.hero_eyebrow ?? ""}
                  onChange={(e) => set("hero_eyebrow", e.target.value)}
                />
              </Row>
              <ImagePicker
                label="Изображение за началната секция"
                value={form.hero_image_url ?? ""}
                onChange={(value) => set("hero_image_url", value)}
              />
              <div className="sm:col-span-2">
                <Row label="Заглавие">
                  <Textarea
                    rows={2}
                    value={form.hero_title ?? ""}
                    onChange={(e) => set("hero_title", e.target.value)}
                  />
                </Row>
              </div>
              <div className="sm:col-span-2">
                <Row label="Подзаглавие">
                  <Textarea
                    rows={3}
                    value={form.hero_subtitle ?? ""}
                    onChange={(e) => set("hero_subtitle", e.target.value)}
                  />
                </Row>
              </div>
              <Row label="Текст на основен бутон">
                <Input
                  value={form.hero_cta_label ?? ""}
                  onChange={(e) => set("hero_cta_label", e.target.value)}
                />
              </Row>
              <Row label="Линк на основен бутон">
                <Input
                  value={form.hero_cta_link ?? ""}
                  onChange={(e) => set("hero_cta_link", e.target.value)}
                  placeholder="#catalog"
                />
              </Row>
              <Row label="Текст на втори бутон">
                <Input
                  value={form.hero_secondary_cta_label ?? ""}
                  onChange={(e) => set("hero_secondary_cta_label", e.target.value)}
                />
              </Row>
              <Row label="Линк на втори бутон">
                <Input
                  value={form.hero_secondary_cta_link ?? ""}
                  onChange={(e) => set("hero_secondary_cta_link", e.target.value)}
                  placeholder="#contact"
                />
              </Row>
            </div>
          </Section>

          <Section title={'Секция „За нас"'}>
            <div className="grid gap-4">
              <Row label="Заглавие">
                <Input
                  value={form.about_title ?? ""}
                  onChange={(e) => set("about_title", e.target.value)}
                />
              </Row>
              <Row label="Основен текст">
                <Textarea
                  rows={4}
                  value={form.about_text ?? ""}
                  onChange={(e) => set("about_text", e.target.value)}
                />
              </Row>
              <Row label="Допълнителен текст">
                <Textarea
                  rows={3}
                  value={form.about_text_secondary ?? ""}
                  onChange={(e) => set("about_text_secondary", e.target.value)}
                />
              </Row>
            </div>
          </Section>

          <Section title="Статистики">
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="Статистика 1 — стойност">
                <Input
                  value={form.stat1_value ?? ""}
                  onChange={(e) => set("stat1_value", e.target.value)}
                />
              </Row>
              <Row label="Статистика 1 — етикет">
                <Input
                  value={form.stat1_label ?? ""}
                  onChange={(e) => set("stat1_label", e.target.value)}
                  placeholder="години опит"
                />
              </Row>
              <Row label="Статистика 2 — стойност">
                <Input
                  value={form.stat2_value ?? ""}
                  onChange={(e) => set("stat2_value", e.target.value)}
                />
              </Row>
              <Row label="Статистика 2 — етикет">
                <Input
                  value={form.stat2_label ?? ""}
                  onChange={(e) => set("stat2_label", e.target.value)}
                />
              </Row>
              <Row label="Статистика 3 — стойност">
                <Input
                  value={form.stat3_value ?? ""}
                  onChange={(e) => set("stat3_value", e.target.value)}
                />
              </Row>
              <Row label="Статистика 3 — етикет">
                <Input
                  value={form.stat3_label ?? ""}
                  onChange={(e) => set("stat3_label", e.target.value)}
                />
              </Row>
            </div>
          </Section>

          <Section title="Контакти">
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="Телефон 1">
                <Input value={form.phone1 ?? ""} onChange={(e) => set("phone1", e.target.value)} />
              </Row>
              <Row label="Телефон 2">
                <Input value={form.phone2 ?? ""} onChange={(e) => set("phone2", e.target.value)} />
              </Row>
              <Row label="Имейл">
                <Input
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => set("email", e.target.value)}
                />
              </Row>
              <Row label="Адрес">
                <Input
                  value={form.address ?? ""}
                  onChange={(e) => set("address", e.target.value)}
                />
              </Row>
              <div className="sm:col-span-2">
                <Row label="Работно време — български">
                  <Textarea
                    rows={3}
                    value={workingHours.bg}
                    onChange={(e) => setWorkingHours((hours) => ({ ...hours, bg: e.target.value }))}
                    placeholder={"Понеделник – петък: 09:00–18:00\nСъбота: с уговорка"}
                  />
                </Row>
              </div>
            </div>
          </Section>

          <Section title="Социални мрежи">
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="Facebook URL">
                <Input
                  value={form.facebook_url ?? ""}
                  onChange={(e) => set("facebook_url", e.target.value)}
                  placeholder="https://facebook.com/..."
                />
              </Row>
              <Row label="Instagram URL">
                <Input
                  value={form.instagram_url ?? ""}
                  onChange={(e) => set("instagram_url", e.target.value)}
                  placeholder="https://instagram.com/..."
                />
              </Row>
              <Row label="TikTok URL">
                <Input
                  type="url"
                  value={form.tiktok_url ?? ""}
                  onChange={(e) => set("tiktok_url", e.target.value)}
                  placeholder="https://www.tiktok.com/@..."
                />
              </Row>
              <Row label="WhatsApp номер">
                <Input
                  value={form.whatsapp_number ?? ""}
                  onChange={(e) => set("whatsapp_number", e.target.value)}
                  placeholder="+359..."
                />
              </Row>
              <Row label="Viber номер">
                <Input
                  value={form.viber_number ?? ""}
                  onChange={(e) => set("viber_number", e.target.value)}
                  placeholder="+359..."
                />
              </Row>
            </div>
          </Section>

          <Section title="Услуги — основно изображение">
            <p className="text-sm text-muted-foreground">
              Надписът се показва над изображението. Самото изображение води към Credit Navigator.
            </p>
            <Row label="Текст над изображението">
              <Input
                value={form.services_image_heading ?? ""}
                onChange={(event) => set("services_image_heading", event.target.value)}
              />
            </Row>
            <ImagePicker
              label="Изображение на Credit Navigator"
              value={form.services_image_url ?? "/Logo_Credit_Navigator.png"}
              onChange={(value) => set("services_image_url", value)}
            />
          </Section>

          <Section title="Навигация (меню в хедъра)">
            <div className="space-y-3">
              {navLinks.map((l, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <Input
                    placeholder="Етикет"
                    value={l.label}
                    onChange={(e) => {
                      const c = [...navLinks];
                      c[i] = { ...c[i], label: e.target.value };
                      set("nav_links", c as never);
                    }}
                  />
                  <Input
                    placeholder="Линк (#about, /blog, https://...)"
                    value={l.href}
                    onChange={(e) => {
                      const c = [...navLinks];
                      c[i] = { ...c[i], href: e.target.value };
                      set("nav_links", c as never);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const c = navLinks.filter((_, idx) => idx !== i);
                      set("nav_links", c as never);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  set("nav_links", [...navLinks, { label: "Нов линк", href: "#" }] as never)
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Добави линк
              </Button>
            </div>
          </Section>

          <Section title="Каталог секция">
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="Надзаглавие">
                <Input
                  value={form.catalog_eyebrow ?? ""}
                  onChange={(e) => set("catalog_eyebrow", e.target.value)}
                />
              </Row>
              <Row label="Заглавие">
                <Input
                  value={form.catalog_title ?? ""}
                  onChange={(e) => set("catalog_title", e.target.value)}
                />
              </Row>
            </div>
          </Section>

          <Section title="Услуги">
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="Надзаглавие">
                <Input
                  value={form.services_eyebrow ?? ""}
                  onChange={(e) => set("services_eyebrow", e.target.value)}
                />
              </Row>
              <Row label="Заглавие">
                <Input
                  value={form.services_title ?? ""}
                  onChange={(e) => set("services_title", e.target.value)}
                />
              </Row>
              <div className="sm:col-span-2">
                <Row label="Подзаглавие">
                  <Textarea
                    rows={2}
                    value={form.services_subtitle ?? ""}
                    onChange={(e) => set("services_subtitle", e.target.value)}
                  />
                </Row>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              {services.map((s, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
                    <div>
                      <Label>Икона</Label>
                      <Select
                        value={s.icon}
                        onValueChange={(v) => {
                          const c = [...services];
                          c[i] = { ...c[i], icon: v };
                          set("services", c as never);
                        }}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ICON_CHOICES.map((n) => (
                            <SelectItem key={n} value={n}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Заглавие</Label>
                      <Input
                        className="mt-1.5"
                        value={s.title}
                        onChange={(e) => {
                          const c = [...services];
                          c[i] = { ...c[i], title: e.target.value };
                          set("services", c as never);
                        }}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          set("services", services.filter((_, idx) => idx !== i) as never)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Подточки (по един ред)</Label>
                    <Textarea
                      className="mt-1.5"
                      rows={4}
                      value={s.items.join("\n")}
                      onChange={(e) => {
                        const c = [...services];
                        c[i] = {
                          ...c[i],
                          items: e.target.value
                            .split("\n")
                            .map((x) => x.trim())
                            .filter(Boolean),
                        };
                        set("services", c as never);
                      }}
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  set("services", [...services, { icon: "Home", title: "", items: [] }] as never)
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Добави услуга
              </Button>
            </div>
          </Section>

          <Section title="Защо нас">
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="Надзаглавие">
                <Input
                  value={form.why_eyebrow ?? ""}
                  onChange={(e) => set("why_eyebrow", e.target.value)}
                />
              </Row>
              <Row label="Заглавие">
                <Input
                  value={form.why_title ?? ""}
                  onChange={(e) => set("why_title", e.target.value)}
                />
              </Row>
            </div>
            <div className="mt-4">
              <Label>Причини (по една на ред)</Label>
              <Textarea
                className="mt-1.5"
                rows={7}
                value={reasons.join("\n")}
                onChange={(e) =>
                  set(
                    "why_reasons",
                    e.target.value
                      .split("\n")
                      .map((x) => x.trim())
                      .filter(Boolean) as never,
                  )
                }
              />
            </div>
          </Section>

          <Section title="Отзиви">
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="Надзаглавие">
                <Input
                  value={form.testimonials_eyebrow ?? ""}
                  onChange={(e) => set("testimonials_eyebrow", e.target.value)}
                />
              </Row>
              <Row label="Заглавие">
                <Input
                  value={form.testimonials_title ?? ""}
                  onChange={(e) => set("testimonials_title", e.target.value)}
                />
              </Row>
            </div>
            <div className="mt-4 space-y-4">
              {testimonials.map((t, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <div>
                      <Label>Име</Label>
                      <Input
                        className="mt-1.5"
                        value={t.name}
                        onChange={(e) => {
                          const c = [...testimonials];
                          c[i] = { ...c[i], name: e.target.value };
                          set("testimonials", c as never);
                        }}
                      />
                    </div>
                    <div>
                      <Label>Роля</Label>
                      <Input
                        className="mt-1.5"
                        value={t.role}
                        onChange={(e) => {
                          const c = [...testimonials];
                          c[i] = { ...c[i], role: e.target.value };
                          set("testimonials", c as never);
                        }}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          set("testimonials", testimonials.filter((_, idx) => idx !== i) as never)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Текст</Label>
                    <Textarea
                      className="mt-1.5"
                      rows={3}
                      value={t.text}
                      onChange={(e) => {
                        const c = [...testimonials];
                        c[i] = { ...c[i], text: e.target.value };
                        set("testimonials", c as never);
                      }}
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  set("testimonials", [...testimonials, { name: "", role: "", text: "" }] as never)
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Добави отзив
              </Button>
            </div>
          </Section>

          <Section title="Контакти секция">
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="Надзаглавие">
                <Input
                  value={form.contact_eyebrow ?? ""}
                  onChange={(e) => set("contact_eyebrow", e.target.value)}
                />
              </Row>
              <Row label="Заглавие">
                <Input
                  value={form.contact_title ?? ""}
                  onChange={(e) => set("contact_title", e.target.value)}
                />
              </Row>
              <div className="sm:col-span-2">
                <Row label="Подзаглавие">
                  <Textarea
                    rows={2}
                    value={form.contact_subtitle ?? ""}
                    onChange={(e) => set("contact_subtitle", e.target.value)}
                  />
                </Row>
              </div>
              <div className="sm:col-span-2">
                <Row label="Google Maps embed URL">
                  <Input
                    value={form.contact_map_embed ?? ""}
                    onChange={(e) => set("contact_map_embed", e.target.value)}
                    placeholder="https://www.google.com/maps?...&output=embed"
                  />
                </Row>
              </div>
              <Row label="Google Maps линк (за адрес)">
                <Input
                  value={form.contact_map_url ?? ""}
                  onChange={(e) => set("contact_map_url", e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                />
              </Row>
            </div>
          </Section>

          <Section title="Footer">
            <div className="grid gap-4">
              <Row label="Описание">
                <Textarea
                  rows={3}
                  value={form.footer_description ?? ""}
                  onChange={(e) => set("footer_description", e.target.value)}
                />
              </Row>
              <Row label="Copyright текст (използвайте {year} за текущата година)">
                <Input
                  value={form.footer_copyright ?? ""}
                  onChange={(e) => set("footer_copyright", e.target.value)}
                />
              </Row>
            </div>
          </Section>

          <Section title="За нас — допълнителна карта">
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="Надзаглавие на секцията">
                <Input
                  value={form.about_eyebrow ?? ""}
                  onChange={(e) => set("about_eyebrow", e.target.value)}
                />
              </Row>
              <div />
              <Row label="Карта 4 — стойност">
                <Input
                  value={form.about_stat4_value ?? ""}
                  onChange={(e) => set("about_stat4_value", e.target.value)}
                />
              </Row>
              <Row label="Карта 4 — етикет">
                <Input
                  value={form.about_stat4_label ?? ""}
                  onChange={(e) => set("about_stat4_label", e.target.value)}
                />
              </Row>
            </div>
          </Section>

          <Section title="SEO — начална страница">
            <div className="grid gap-4">
              <Row label="Meta title">
                <Input
                  value={form.seo_home_title ?? ""}
                  onChange={(e) => set("seo_home_title", e.target.value)}
                />
              </Row>
              <Row label="Meta description">
                <Textarea
                  rows={2}
                  value={form.seo_home_description ?? ""}
                  onChange={(e) => set("seo_home_description", e.target.value)}
                />
              </Row>
              <ImagePicker
                label="Изображение за социално споделяне"
                value={form.og_image_url ?? ""}
                onChange={(value) => set("og_image_url", value)}
              />
            </div>
          </Section>

          <Section title="English content">
            <p className="text-sm text-muted-foreground">
              Add English text where needed. Empty translations continue to use the Bulgarian
              version.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {ENGLISH_TEXT_FIELDS.map(({ key, label, multiline }) => (
                <Row key={key} label={label}>
                  {multiline ? (
                    <Textarea
                      rows={key === "hero_title" ? 2 : 3}
                      value={englishText(key)}
                      onChange={(event) => setEnglish(key, event.target.value)}
                    />
                  ) : (
                    <Input
                      value={englishText(key)}
                      onChange={(event) => setEnglish(key, event.target.value)}
                    />
                  )}
                </Row>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <Label>Navigation labels — English</Label>
                <div className="mt-2 space-y-2">
                  {englishNavLinks.map((link, index) => (
                    <Input
                      key={`${link.href}-${index}`}
                      aria-label={`Navigation item ${index + 1} label`}
                      value={link.label}
                      onChange={(event) => {
                        const next = [...englishNavLinks];
                        next[index] = { ...link, label: event.target.value };
                        setEnglish("nav_links", next);
                      }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label>Service names and descriptions — English</Label>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {englishServices.map((service, index) => (
                    <div
                      key={`${service.icon}-${index}`}
                      className="space-y-2 rounded-lg bg-muted/40 p-3"
                    >
                      <Input
                        aria-label={`Service ${index + 1} title`}
                        value={service.title}
                        onChange={(event) => {
                          const next = [...englishServices];
                          next[index] = { ...service, title: event.target.value };
                          setEnglish("services", next);
                        }}
                      />
                      <Textarea
                        rows={4}
                        aria-label={`Service ${index + 1} details`}
                        value={service.items.join("\n")}
                        onChange={(event) => {
                          const next = [...englishServices];
                          next[index] = {
                            ...service,
                            items: event.target.value
                              .split("\n")
                              .map((item) => item.trim())
                              .filter(Boolean),
                          };
                          setEnglish("services", next);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <Row label="Why choose us — one item per line">
                <Textarea
                  rows={5}
                  value={englishReasons.join("\n")}
                  onChange={(event) =>
                    setEnglish(
                      "why_reasons",
                      event.target.value
                        .split("\n")
                        .map((item) => item.trim())
                        .filter(Boolean),
                    )
                  }
                />
              </Row>
              <div>
                <Label>Testimonials — English</Label>
                <div className="mt-2 space-y-3">
                  {englishTestimonials.map((item, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-2">
                      <Input
                        aria-label={`Testimonial ${index + 1} role`}
                        value={item.role}
                        onChange={(event) => {
                          const next = [...englishTestimonials];
                          next[index] = { ...item, role: event.target.value };
                          setEnglish("testimonials", next);
                        }}
                      />
                      <Textarea
                        rows={2}
                        aria-label={`Testimonial ${index + 1} text`}
                        value={item.text}
                        onChange={(event) => {
                          const next = [...englishTestimonials];
                          next[index] = { ...item, text: event.target.value };
                          setEnglish("testimonials", next);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <Row label="Working hours — English">
                <Textarea
                  rows={3}
                  value={workingHours.en}
                  onChange={(event) =>
                    setWorkingHours((hours) => ({ ...hours, en: event.target.value }))
                  }
                  placeholder={"Monday–Friday: 09:00–18:00\nSaturday: by appointment"}
                />
              </Row>
            </div>
          </Section>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !data} className="bg-navy hover:bg-navy-deep">
              {saving ? "Запазване..." : "Запази настройките"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <CardContent className="space-y-5 p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="h-7 w-1 rounded-full bg-gold" aria-hidden="true" />
          <h3 className="font-display text-xl text-navy">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function ImagePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(value);

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setPreviewUrl("");
      return () => {
        cancelled = true;
      };
    }
    void adminMediaPreviewUrl(value)
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          toast.error(error instanceof Error ? error.message : "Прегледът не можа да се зареди.");
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  async function uploadImage(file: File) {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
    const allowedExtension = /\.(jpe?g|png|webp|avif)$/i.test(file.name);
    if (
      (!allowedTypes.has(file.type) && !(file.type === "" && allowedExtension)) ||
      !isImageFile(file)
    ) {
      toast.error("Изберете изображение във формат JPG, PNG, WebP или AVIF.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Изображението е твърде голямо (максимум 25 MB).");
      return;
    }

    setUploading(true);
    try {
      const path = `site-settings/${crypto.randomUUID()}.${fileExt(file)}`;
      const { error } = await supabase.storage.from("property-images").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (error) throw error;
      const url = mediaUrl(path);
      setPreviewUrl(await adminMediaPreviewUrl(url));
      onChange(url);
      toast.success("Изображението е качено. Запазете настройките, за да го публикувате.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Изображението не можа да се качи.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-w-0">
      <Label>{label}</Label>
      <div className="mt-1.5 flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-4 sm:flex-row sm:items-center">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={`Преглед: ${label}`}
            className="h-20 w-full rounded-lg bg-white object-contain p-2 sm:w-32"
          />
        ) : (
          <div className="grid h-20 w-full place-items-center rounded-lg bg-muted text-muted-foreground sm:w-32">
            <ImagePlus aria-hidden="true" className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            aria-label={label}
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadImage(file);
              event.target.value = "";
            }}
            className="h-auto min-h-11 cursor-pointer bg-background py-2 file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {uploading
              ? "Качване..."
              : "Изберете снимка от устройството си · JPG, PNG, WebP или AVIF"}
          </p>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={() => {
                onChange("");
                setPreviewUrl("");
              }}
              className="mt-1 min-h-11 px-2"
            >
              Премахни изображението
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
