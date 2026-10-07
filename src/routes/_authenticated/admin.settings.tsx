import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Trash2 } from "lucide-react";

const ICON_CHOICES = [
  "Home", "Key", "Building2", "FileText", "Award", "Shield",
  "Users", "TrendingUp", "Star", "Handshake", "Briefcase",
  "MapPin", "Phone", "Mail", "Check",
];

type NavLink = { href: string; label: string };
type ServiceItem = { icon: string; title: string; items: string[] };
type TestimonialItem = { name: string; role: string; text: string };

export const Route = createFileRoute("/_authenticated/admin/settings")({
  beforeLoad: ({ context }) => requireAdmin(context),
  component: SettingsAdmin,
});

function SettingsAdmin() {
  const [form, setForm] = useState<Partial<SettingsRow>>({});
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data as unknown as SettingsRow | null;
    },
  });

  useEffect(() => { if (data) setForm(data); }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { id: _id, ...update } = form as SettingsRow;
    const { error } = await supabase.from("site_settings").update(update as never).eq("id", 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Настройките са запазени");
  }

  const set = <K extends keyof SettingsRow>(k: K, v: SettingsRow[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const navLinks = (form.nav_links as NavLink[] | null) ?? [];
  const services = (form.services as ServiceItem[] | null) ?? [];
  const reasons = (form.why_reasons as string[] | null) ?? [];
  const testimonials = (form.testimonials as TestimonialItem[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-navy">Настройки на сайта</h1>
        <p className="text-sm text-muted-foreground">Съдържание, бранд, контакти и социални мрежи</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <Section title="Бранд и цветове">
          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Име на бранда"><Input value={form.brand_name ?? ""} onChange={(e) => set("brand_name", e.target.value)} /></Row>
            <Row label="Слоган"><Input value={form.brand_tagline ?? ""} onChange={(e) => set("brand_tagline", e.target.value)} /></Row>
            <Row label="Основен цвят (Navy)">
              <div className="flex items-center gap-2">
                <Input type="color" className="h-10 w-16 p-1" value={form.primary_color ?? "#0B1E3B"} onChange={(e) => set("primary_color", e.target.value)} />
                <Input value={form.primary_color ?? ""} onChange={(e) => set("primary_color", e.target.value)} placeholder="#0B1E3B" />
              </div>
            </Row>
            <Row label="Акцентен цвят (Gold)">
              <div className="flex items-center gap-2">
                <Input type="color" className="h-10 w-16 p-1" value={form.accent_color ?? "#C6A15B"} onChange={(e) => set("accent_color", e.target.value)} />
                <Input value={form.accent_color ?? ""} onChange={(e) => set("accent_color", e.target.value)} placeholder="#C6A15B" />
              </div>
            </Row>
            <Row label="URL на лого"><Input value={form.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://..." /></Row>
          </div>
        </Section>

        <Section title="Hero секция (начална страница)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Надзаглавие"><Input value={form.hero_eyebrow ?? ""} onChange={(e) => set("hero_eyebrow", e.target.value)} /></Row>
            <Row label="URL на фоново изображение"><Input value={form.hero_image_url ?? ""} onChange={(e) => set("hero_image_url", e.target.value)} placeholder="https://..." /></Row>
            <div className="sm:col-span-2">
              <Row label="Заглавие"><Textarea rows={2} value={form.hero_title ?? ""} onChange={(e) => set("hero_title", e.target.value)} /></Row>
            </div>
            <div className="sm:col-span-2">
              <Row label="Подзаглавие"><Textarea rows={3} value={form.hero_subtitle ?? ""} onChange={(e) => set("hero_subtitle", e.target.value)} /></Row>
            </div>
            <Row label="Текст на основен бутон"><Input value={form.hero_cta_label ?? ""} onChange={(e) => set("hero_cta_label", e.target.value)} /></Row>
            <Row label="Линк на основен бутон"><Input value={form.hero_cta_link ?? ""} onChange={(e) => set("hero_cta_link", e.target.value)} placeholder="#catalog" /></Row>
            <Row label="Текст на втори бутон"><Input value={form.hero_secondary_cta_label ?? ""} onChange={(e) => set("hero_secondary_cta_label", e.target.value)} /></Row>
            <Row label="Линк на втори бутон"><Input value={form.hero_secondary_cta_link ?? ""} onChange={(e) => set("hero_secondary_cta_link", e.target.value)} placeholder="#contact" /></Row>
          </div>
        </Section>

        <Section title={"Секция „За нас\""}>
          <div className="grid gap-4">
            <Row label="Заглавие"><Input value={form.about_title ?? ""} onChange={(e) => set("about_title", e.target.value)} /></Row>
            <Row label="Основен текст"><Textarea rows={4} value={form.about_text ?? ""} onChange={(e) => set("about_text", e.target.value)} /></Row>
            <Row label="Допълнителен текст"><Textarea rows={3} value={form.about_text_secondary ?? ""} onChange={(e) => set("about_text_secondary", e.target.value)} /></Row>
          </div>
        </Section>

        <Section title="Статистики">
          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Статистика 1 — стойност"><Input value={form.stat1_value ?? ""} onChange={(e) => set("stat1_value", e.target.value)} /></Row>
            <Row label="Статистика 1 — етикет"><Input value={form.stat1_label ?? ""} onChange={(e) => set("stat1_label", e.target.value)} placeholder="години опит" /></Row>
            <Row label="Статистика 2 — стойност"><Input value={form.stat2_value ?? ""} onChange={(e) => set("stat2_value", e.target.value)} /></Row>
            <Row label="Статистика 2 — етикет"><Input value={form.stat2_label ?? ""} onChange={(e) => set("stat2_label", e.target.value)} /></Row>
            <Row label="Статистика 3 — стойност"><Input value={form.stat3_value ?? ""} onChange={(e) => set("stat3_value", e.target.value)} /></Row>
            <Row label="Статистика 3 — етикет"><Input value={form.stat3_label ?? ""} onChange={(e) => set("stat3_label", e.target.value)} /></Row>
          </div>
        </Section>

        <Section title="Контакти">
          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Телефон 1"><Input value={form.phone1 ?? ""} onChange={(e) => set("phone1", e.target.value)} /></Row>
            <Row label="Телефон 2"><Input value={form.phone2 ?? ""} onChange={(e) => set("phone2", e.target.value)} /></Row>
            <Row label="Имейл"><Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Row>
            <Row label="Адрес"><Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} /></Row>
          </div>
        </Section>

        <Section title="Социални мрежи">
          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Facebook URL"><Input value={form.facebook_url ?? ""} onChange={(e) => set("facebook_url", e.target.value)} placeholder="https://facebook.com/..." /></Row>
            <Row label="Instagram URL"><Input value={form.instagram_url ?? ""} onChange={(e) => set("instagram_url", e.target.value)} placeholder="https://instagram.com/..." /></Row>
            <Row label="WhatsApp номер"><Input value={form.whatsapp_number ?? ""} onChange={(e) => set("whatsapp_number", e.target.value)} placeholder="+359..." /></Row>
            <Row label="Viber номер"><Input value={form.viber_number ?? ""} onChange={(e) => set("viber_number", e.target.value)} placeholder="+359..." /></Row>
          </div>
        </Section>

        <Section title="Навигация (меню в хедъра)">
          <div className="space-y-3">
            {navLinks.map((l, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]">
                <Input placeholder="Етикет" value={l.label} onChange={(e) => {
                  const c = [...navLinks]; c[i] = { ...c[i], label: e.target.value };
                  set("nav_links", c as never);
                }} />
                <Input placeholder="Линк (#about, /blog, https://...)" value={l.href} onChange={(e) => {
                  const c = [...navLinks]; c[i] = { ...c[i], href: e.target.value };
                  set("nav_links", c as never);
                }} />
                <Button type="button" variant="outline" size="icon" onClick={() => {
                  const c = navLinks.filter((_, idx) => idx !== i);
                  set("nav_links", c as never);
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() =>
              set("nav_links", [...navLinks, { label: "Нов линк", href: "#" }] as never)
            }><Plus className="mr-2 h-4 w-4" />Добави линк</Button>
          </div>
        </Section>

        <Section title="Каталог секция">
          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Надзаглавие"><Input value={form.catalog_eyebrow ?? ""} onChange={(e) => set("catalog_eyebrow", e.target.value)} /></Row>
            <Row label="Заглавие"><Input value={form.catalog_title ?? ""} onChange={(e) => set("catalog_title", e.target.value)} /></Row>
          </div>
        </Section>

        <Section title="Услуги">
          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Надзаглавие"><Input value={form.services_eyebrow ?? ""} onChange={(e) => set("services_eyebrow", e.target.value)} /></Row>
            <Row label="Заглавие"><Input value={form.services_title ?? ""} onChange={(e) => set("services_title", e.target.value)} /></Row>
            <div className="sm:col-span-2">
              <Row label="Подзаглавие"><Textarea rows={2} value={form.services_subtitle ?? ""} onChange={(e) => set("services_subtitle", e.target.value)} /></Row>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {services.map((s, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
                  <div>
                    <Label>Икона</Label>
                    <Select value={s.icon} onValueChange={(v) => {
                      const c = [...services]; c[i] = { ...c[i], icon: v };
                      set("services", c as never);
                    }}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>{ICON_CHOICES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Заглавие</Label>
                    <Input className="mt-1.5" value={s.title} onChange={(e) => {
                      const c = [...services]; c[i] = { ...c[i], title: e.target.value };
                      set("services", c as never);
                    }} />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" size="icon" onClick={() =>
                      set("services", services.filter((_, idx) => idx !== i) as never)
                    }><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div>
                  <Label>Подточки (по един ред)</Label>
                  <Textarea className="mt-1.5" rows={4} value={s.items.join("\n")} onChange={(e) => {
                    const c = [...services]; c[i] = { ...c[i], items: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) };
                    set("services", c as never);
                  }} />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() =>
              set("services", [...services, { icon: "Home", title: "", items: [] }] as never)
            }><Plus className="mr-2 h-4 w-4" />Добави услуга</Button>
          </div>
        </Section>

        <Section title="Защо нас">
          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Надзаглавие"><Input value={form.why_eyebrow ?? ""} onChange={(e) => set("why_eyebrow", e.target.value)} /></Row>
            <Row label="Заглавие"><Input value={form.why_title ?? ""} onChange={(e) => set("why_title", e.target.value)} /></Row>
          </div>
          <div className="mt-4">
            <Label>Причини (по една на ред)</Label>
            <Textarea className="mt-1.5" rows={7} value={reasons.join("\n")} onChange={(e) =>
              set("why_reasons", e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) as never)
            } />
          </div>
        </Section>

        <Section title="Отзиви">
          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Надзаглавие"><Input value={form.testimonials_eyebrow ?? ""} onChange={(e) => set("testimonials_eyebrow", e.target.value)} /></Row>
            <Row label="Заглавие"><Input value={form.testimonials_title ?? ""} onChange={(e) => set("testimonials_title", e.target.value)} /></Row>
          </div>
          <div className="mt-4 space-y-4">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <div><Label>Име</Label><Input className="mt-1.5" value={t.name} onChange={(e) => {
                    const c = [...testimonials]; c[i] = { ...c[i], name: e.target.value };
                    set("testimonials", c as never);
                  }} /></div>
                  <div><Label>Роля</Label><Input className="mt-1.5" value={t.role} onChange={(e) => {
                    const c = [...testimonials]; c[i] = { ...c[i], role: e.target.value };
                    set("testimonials", c as never);
                  }} /></div>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" size="icon" onClick={() =>
                      set("testimonials", testimonials.filter((_, idx) => idx !== i) as never)
                    }><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div>
                  <Label>Текст</Label>
                  <Textarea className="mt-1.5" rows={3} value={t.text} onChange={(e) => {
                    const c = [...testimonials]; c[i] = { ...c[i], text: e.target.value };
                    set("testimonials", c as never);
                  }} />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() =>
              set("testimonials", [...testimonials, { name: "", role: "", text: "" }] as never)
            }><Plus className="mr-2 h-4 w-4" />Добави отзив</Button>
          </div>
        </Section>

        <Section title="Контакти секция">
          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Надзаглавие"><Input value={form.contact_eyebrow ?? ""} onChange={(e) => set("contact_eyebrow", e.target.value)} /></Row>
            <Row label="Заглавие"><Input value={form.contact_title ?? ""} onChange={(e) => set("contact_title", e.target.value)} /></Row>
            <div className="sm:col-span-2">
              <Row label="Подзаглавие"><Textarea rows={2} value={form.contact_subtitle ?? ""} onChange={(e) => set("contact_subtitle", e.target.value)} /></Row>
            </div>
            <div className="sm:col-span-2">
              <Row label="Google Maps embed URL"><Input value={form.contact_map_embed ?? ""} onChange={(e) => set("contact_map_embed", e.target.value)} placeholder="https://www.google.com/maps?...&output=embed" /></Row>
            </div>
            <Row label="Google Maps линк (за адрес)"><Input value={form.contact_map_url ?? ""} onChange={(e) => set("contact_map_url", e.target.value)} placeholder="https://maps.app.goo.gl/..." /></Row>
          </div>
        </Section>

        <Section title="Footer">
          <div className="grid gap-4">
            <Row label="Описание"><Textarea rows={3} value={form.footer_description ?? ""} onChange={(e) => set("footer_description", e.target.value)} /></Row>
            <Row label="Copyright текст (използвайте {year} за текущата година)">
              <Input value={form.footer_copyright ?? ""} onChange={(e) => set("footer_copyright", e.target.value)} />
            </Row>
          </div>
        </Section>

        <Section title="За нас — допълнителна карта">
          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Надзаглавие на секцията"><Input value={form.about_eyebrow ?? ""} onChange={(e) => set("about_eyebrow", e.target.value)} /></Row>
            <div />
            <Row label="Карта 4 — стойност"><Input value={form.about_stat4_value ?? ""} onChange={(e) => set("about_stat4_value", e.target.value)} /></Row>
            <Row label="Карта 4 — етикет"><Input value={form.about_stat4_label ?? ""} onChange={(e) => set("about_stat4_label", e.target.value)} /></Row>
          </div>
        </Section>

        <Section title="SEO — начална страница">
          <div className="grid gap-4">
            <Row label="Meta title"><Input value={form.seo_home_title ?? ""} onChange={(e) => set("seo_home_title", e.target.value)} /></Row>
            <Row label="Meta description"><Textarea rows={2} value={form.seo_home_description ?? ""} onChange={(e) => set("seo_home_description", e.target.value)} /></Row>
          </div>
        </Section>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="bg-navy hover:bg-navy-deep">
            {saving ? "Запазване..." : "Запази настройките"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="space-y-5 p-6">
        <h3 className="font-display text-xl text-navy">{title}</h3>
        {children}
      </CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><Label>{label}</Label><div className="mt-1.5">{children}</div></div>);
}



