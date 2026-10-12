import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { requireAdmin } from "@/lib/admin/guards";
import { pageContentJson, readPageContent, type PageContent } from "@/lib/site-pages";
import type { Database } from "@/integrations/supabase/types";

type SitePage = Database["public"]["Tables"]["site_pages"]["Row"];
type PageForm = {
  slug: string;
  is_published: boolean;
  content: PageContent;
  seo_title: string;
  seo_description: string;
};

const emptyForm: PageForm = {
  slug: "",
  is_published: false,
  content: {
    bg: { title: "", body: "", seoTitle: "", seoDescription: "" },
    en: { title: "", body: "", seoTitle: "", seoDescription: "" },
  },
  seo_title: "",
  seo_description: "",
};

export const Route = createFileRoute("/_authenticated/admin/pages")({
  beforeLoad: ({ context }) => requireAdmin(context),
  component: PagesAdmin,
});

function PagesAdmin() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SitePage | null>(null);
  const [form, setForm] = useState<PageForm>(emptyForm);
  const [open, setOpen] = useState(false);

  const pagesQuery = useQuery({
    queryKey: ["admin-site-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_pages")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug.trim().toLowerCase();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new Error("Адресът трябва да съдържа малки латински букви, цифри и тирета.");
      }
      const title = form.content.bg.title.trim() || form.content.en.title.trim();
      if (!title) throw new Error("Въведете заглавие на български или английски.");
      const values = {
        slug,
        title,
        content: pageContentJson(form.content),
        is_published: form.is_published,
        seo_title: form.seo_title.trim() || null,
        seo_description: form.seo_description.trim() || null,
      };
      const result = editing
        ? await supabase.from("site_pages").update(values).eq("id", editing.id).select("*").single()
        : await supabase.from("site_pages").insert(values).select("*").single();
      if (result.error) {
        if (result.error.code === "23505") throw new Error("Този адрес вече се използва от друга страница.");
        throw result.error;
      }
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-site-pages"] });
      await queryClient.invalidateQueries({ queryKey: ["public-site-pages"] });
      toast.success("Страницата е запазена");
      setOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function startNew() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function startEdit(page: SitePage) {
    const content = readPageContent(page.content, page.title);
    setEditing(page);
    setForm({
      slug: page.slug,
      is_published: page.is_published,
      content,
      seo_title: page.seo_title ?? "",
      seo_description: page.seo_description ?? "",
    });
    setOpen(true);
  }

  async function deletePage(page: SitePage) {
    if (!confirm(`Изтрий страницата „${page.title}“? Провери дали не е добавена в навигацията.`)) return;
    const { error } = await supabase.from("site_pages").delete().eq("id", page.id);
    if (error) {
      toast.error(`Страницата не може да бъде изтрита: ${error.message}`);
      return;
    }
    toast.success("Страницата е изтрита");
    await queryClient.invalidateQueries({ queryKey: ["admin-site-pages"] });
  }

  function setLocale<K extends keyof PageContent["bg"]>(
    locale: "bg" | "en",
    key: K,
    value: PageContent["bg"][K],
  ) {
    setForm((current) => ({
      ...current,
      content: {
        ...current.content,
        [locale]: { ...current.content[locale], [key]: value },
      },
    }));
  }

  const pages = pagesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-navy">Страници</h1>
          <p className="text-sm text-muted-foreground">Съдържание на български и английски с чернови и SEO метаданни.</p>
        </div>
        <Button onClick={startNew} className="bg-navy hover:bg-navy-deep">
          <FilePlus2 className="mr-2 h-4 w-4" /> Нова страница
        </Button>
      </div>

      {pagesQuery.isLoading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Зареждане...</CardContent></Card>
      ) : pagesQuery.isError ? (
        <Card role="alert"><CardContent className="flex flex-wrap items-center justify-between gap-3 py-8 text-sm text-destructive">
          <span>Страниците не можаха да се заредят: {pagesQuery.error.message}</span>
          <Button variant="outline" onClick={() => void pagesQuery.refetch()}>Опитай отново</Button>
        </CardContent></Card>
      ) : pages.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Все още няма допълнителни страници.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {pages.map((page) => (
            <Card key={page.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <h2 className="truncate font-medium text-navy">{page.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    /pages/{page.slug} · {page.is_published ? "Публикувана" : "Чернова"} · Обновена {new Date(page.updated_at).toLocaleDateString("bg-BG")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {page.is_published && <Button variant="outline" asChild><a href={`/pages/${encodeURIComponent(page.slug)}`} target="_blank" rel="noreferrer">Преглед</a></Button>}
                  <Button size="icon" variant="outline" aria-label={`Редактирай ${page.title}`} onClick={() => startEdit(page)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label={`Изтрий ${page.title}`} onClick={() => void deletePage(page)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl text-navy">{editing ? "Редакция на страница" : "Нова страница"}</DialogTitle></DialogHeader>
          <form onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="page-slug">Адрес (slug)</Label>
                <Input id="page-slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="za-nas" required maxLength={100} />
                <p className="mt-1 text-xs text-muted-foreground">Публичен адрес: /pages/{form.slug || "..."}</p>
              </div>
              <label className="flex items-center gap-2 self-center text-sm">
                <Switch checked={form.is_published} onCheckedChange={(is_published) => setForm({ ...form, is_published })} />
                Публикувана
              </label>
            </div>

            {(["bg", "en"] as const).map((locale) => (
              <section key={locale} className="space-y-3 rounded-lg border p-4">
                <h3 className="font-medium text-navy">{locale === "bg" ? "Български" : "English"}</h3>
                <div>
                  <Label htmlFor={`${locale}-title`}>Заглавие</Label>
                  <Input id={`${locale}-title`} value={form.content[locale].title} onChange={(event) => setLocale(locale, "title", event.target.value)} maxLength={200} />
                </div>
                <div>
                  <Label htmlFor={`${locale}-body`}>Съдържание</Label>
                  <Textarea id={`${locale}-body`} rows={7} value={form.content[locale].body} onChange={(event) => setLocale(locale, "body", event.target.value)} maxLength={30000} />
                </div>
                <div className="rounded-md bg-muted/40 p-4">
                  <p className="font-display text-xl text-navy">{form.content[locale].title || "Преглед на заглавието"}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{form.content[locale].body || "Съдържанието ще се визуализира тук."}</p>
                </div>
              </section>
            ))}

            <section className="space-y-3 rounded-lg border p-4">
              <h3 className="font-medium text-navy">SEO</h3>
              <div><Label htmlFor="page-seo-title">SEO заглавие</Label><Input id="page-seo-title" value={form.seo_title} onChange={(event) => setForm({ ...form, seo_title: event.target.value })} maxLength={200} /></div>
              <div><Label htmlFor="page-seo-description">SEO описание</Label><Textarea id="page-seo-description" rows={2} value={form.seo_description} onChange={(event) => setForm({ ...form, seo_description: event.target.value })} maxLength={500} /></div>
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                <div className="font-medium text-blue-800">{form.seo_title || form.content.bg.title || "Преглед на заглавието"}</div>
                <p className="mt-1 text-muted-foreground">{form.seo_description || form.content.bg.body.slice(0, 158) || "Преглед на описанието"}</p>
              </div>
            </section>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Откажи</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-navy hover:bg-navy-deep">{saveMutation.isPending ? "Запазване..." : "Запази"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
