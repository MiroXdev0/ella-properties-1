import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { mediaUrl, fileExt, isImageFile, MAX_UPLOAD_BYTES } from "@/lib/media";
import type { TeamRow } from "@/lib/admin/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { requireAdmin } from "@/lib/admin/guards";

export const Route = createFileRoute("/_authenticated/admin/team")({
  beforeLoad: ({ context }) => requireAdmin(context),
  component: TeamAdmin,
});

const empty = { name: "", role: "", photo_url: "", phone: "", email: "", description: "", sort_order: 0, is_active: true };

function TeamAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeamRow | null>(null);
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ["admin-team"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("*").order("sort_order");
      if (error) throw error;
      return data as TeamRow[];
    },
  });

  function openNew() {
    setEditing(null); setForm(empty); setOpen(true);
  }
  function openEdit(t: TeamRow) {
    setEditing(t);
    setForm({
      name: t.name, role: t.role ?? "", photo_url: t.photo_url ?? "",
      phone: t.phone ?? "", email: t.email ?? "", description: t.description ?? "",
      sort_order: t.sort_order, is_active: t.is_active,
    });
    setOpen(true);
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      if (!isImageFile(file)) {
        toast.error("Неподдържан файл.");
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error("Файлът е твърде голям (макс. 25MB)");
        return;
      }
      const path = `team/${crypto.randomUUID()}.${fileExt(file)}`;
      const { error } = await supabase.storage.from("property-images").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (error) throw error;
      setForm((f) => ({ ...f, photo_url: mediaUrl(path) }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Грешка");
    } finally { setUploading(false); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Въведете име");
    if (editing) {
      const { error } = await supabase.from("team_members").update(form).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("team_members").insert(form);
      if (error) return toast.error(error.message);
    }
    toast.success("Запазено");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-team"] });
  }

  async function del(id: string) {
    if (!confirm("Изтрий брокера?")) return;
    await supabase.from("team_members").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-team"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-navy">Екип</h1>
          <p className="text-sm text-muted-foreground">Брокери и контактни лица</p>
        </div>
        <Button onClick={openNew} className="bg-navy hover:bg-navy-deep"><Plus className="mr-2 h-4 w-4" /> Добави</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <Card key={t.id} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                {t.photo_url ? (
                  <img src={t.photo_url} alt={t.name} className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-navy text-xl text-gold">{t.name[0]}</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg text-navy">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                  <div className="mt-2 space-y-0.5 text-xs">
                    {t.phone && <div>{t.phone}</div>}
                    {t.email && <div className="truncate text-muted-foreground">{t.email}</div>}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del(t.id)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display text-2xl text-navy">{editing ? "Редактирай" : "Нов брокер"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label>Снимка</Label>
              <div className="mt-1.5 flex items-center gap-3">
                {form.photo_url && <img src={form.photo_url} alt="" className="h-16 w-16 rounded-full object-cover" />}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                  <Upload className="h-4 w-4" /> {uploading ? "Качване..." : "Качи снимка"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
                </label>
              </div>
            </div>
            <div><Label>Име *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><Label>Длъжност</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="напр. Брокер" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Телефон</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Имейл</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label>Описание</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Активен
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Откажи</Button>
              <Button type="submit" className="bg-navy hover:bg-navy-deep">Запази</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}





