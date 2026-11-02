import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserCheck, UserX, UserPlus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { SettingsRow } from "@/lib/admin/queries";
import { createAccessUser, updateUserName } from "@/lib/admin/users.functions";
import { requireAdmin } from "@/lib/admin/guards";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/users")({
  beforeLoad: ({ context }) => requireAdmin(context),
  component: UsersAdmin,
});

function UsersAdmin() {
  const queryClient = useQueryClient();
  const [allow, setAllow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "editor">("editor");
  const [creating, setCreating] = useState(false);
  const createFn = useServerFn(createAccessUser);
  const updateNameFn = useServerFn(updateUserName);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingNameId, setSavingNameId] = useState<string | null>(null);

  const {
    data,
    isLoading: settingsLoading,
    isError: settingsIsError,
    refetch,
  } = useQuery({
    queryKey: ["admin-users-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as SettingsRow | null;
    },
  });

  useEffect(() => {
    if (data) setAllow(!!data.allow_registration);
  }, [data]);

  const {
    data: roles,
    isLoading: rolesLoading,
    isError: rolesIsError,
    refetch: refetchRoles,
  } = useQuery({
    queryKey: ["admin-users-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const {
    data: profiles,
    isLoading: profilesLoading,
    isError: profilesIsError,
    refetch: refetchProfiles,
  } = useQuery({
    queryKey: ["admin-users-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, display_name");
      if (error) throw error;
      return data;
    },
  });

  const nameByUserId = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name] as const));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    if (!email || password.length < 8 || !name.trim()) {
      toast.error("Въведете име, имейл и парола (мин. 8 символа)");
      return;
    }
    setCreating(true);
    try {
      await createFn({ data: { email, password, role, name: name.trim() } });
      toast.success("Потребителят е създаден");
      setEmail("");
      setPassword("");
      setName("");
      setRole("editor");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-users-roles"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-users-profiles"] }),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Грешка при създаване");
    } finally {
      setCreating(false);
    }
  }

  async function saveName(userId: string) {
    if (savingNameId) return;
    const trimmed = editingName.trim();
    if (!trimmed) return toast.error("Въведете име");
    setSavingNameId(userId);
    try {
      await updateNameFn({ data: { user_id: userId, name: trimmed } });
      toast.success("Името е обновено");
      setEditingId(null);
      await refetchProfiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Грешка");
    } finally {
      setSavingNameId(null);
    }
  }

  async function toggle(next: boolean) {
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .update({ allow_registration: next } as never)
        .eq("id", 1);
      if (error) throw error;
      setAllow(next);
      toast.success(next ? "Регистрацията е разрешена" : "Регистрацията е забранена");
      await refetch();
    } catch (error) {
      console.error("[admin-users] Registration setting update failed", error);
      toast.error(error instanceof Error ? error.message : "Настройката не можа да се запази.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-navy">Потребители</h1>
        <p className="text-sm text-muted-foreground">Контрол на достъпа до админ панела</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className={`grid h-12 w-12 place-items-center rounded-xl ${allow ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
              >
                {allow ? <UserCheck className="h-5 w-5" /> : <UserX className="h-5 w-5" />}
              </div>
              <div>
                <Label className="text-base font-semibold text-navy">
                  Разреши регистрация на нови потребители
                </Label>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  Когато е включено, посетителите могат да създадат акаунт от страницата за вход.
                  Новорегистрираните потребители нямат достъп до админ панела, докато не им бъде
                  дадена роля (admin или editor).
                </p>
              </div>
            </div>
            <Switch
              checked={allow}
              onCheckedChange={toggle}
              disabled={saving || settingsLoading || settingsIsError}
              aria-label="Разреши регистрация на нови потребители"
            />
          </div>
          {settingsLoading && (
            <p role="status" className="mt-4 text-sm text-muted-foreground">
              Зареждане на настройката за регистрация…
            </p>
          )}
          {settingsIsError && (
            <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-destructive">Настройката за регистрация не се зареди.</p>
              <Button type="button" variant="outline" onClick={() => void refetch()}>
                Опитай отново
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gold/20 text-navy">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl text-navy">Създай потребител с достъп</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Създайте акаунт директно с роля admin или editor. Потребителят ще може веднага да
                влезе.
              </p>
              <form
                onSubmit={handleCreate}
                className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_1fr_180px_auto]"
              >
                <div>
                  <Label htmlFor="access-user-name" className="text-xs">
                    Име
                  </Label>
                  <Input
                    id="access-user-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Име"
                    required
                    maxLength={100}
                  />
                </div>
                <div>
                  <Label htmlFor="access-user-email" className="text-xs">
                    Имейл
                  </Label>
                  <Input
                    id="access-user-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="access-user-password" className="text-xs">
                    Парола
                  </Label>
                  <Input
                    id="access-user-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="мин. 8 символа"
                    minLength={8}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="access-user-role" className="text-xs">
                    Роля
                  </Label>
                  <Select value={role} onValueChange={(v) => setRole(v as "admin" | "editor")}>
                    <SelectTrigger id="access-user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Администратор</SelectItem>
                      <SelectItem value="editor">Редактор</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="submit"
                    disabled={creating}
                    className="bg-navy text-white hover:bg-navy/90"
                  >
                    {creating ? "Създаване..." : "Създай"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-display text-xl text-navy">Потребители с достъп</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Списък с администратори и редактори (по user_id)
          </p>
          {rolesIsError ? (
            <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-destructive">Потребителите не можаха да се заредят.</p>
              <Button type="button" variant="outline" onClick={() => void refetchRoles()}>
                Опитай отново
              </Button>
            </div>
          ) : rolesLoading ? (
            <p role="status" className="mt-4 text-sm text-muted-foreground">
              Зареждане на потребителите…
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-6">Име</th>
                    <th className="py-2 pr-6">User ID</th>
                    <th className="py-2 pr-6">Роля</th>
                    <th className="py-2 pr-6">Дата</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(roles ?? []).map((r) => (
                    <tr key={`${r.user_id}-${r.role}`}>
                      <td className="py-3 pr-6">
                        {profilesIsError ? (
                          <span className="text-muted-foreground">—</span>
                        ) : editingId === r.user_id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="h-8 w-48"
                              maxLength={100}
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={savingNameId !== null}
                              aria-label="Запази името"
                              onClick={() => void saveName(r.user_id)}
                            >
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={savingNameId !== null}
                              aria-label="Откажи редакцията"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="font-medium text-navy">
                            {nameByUserId.get(r.user_id) || (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td
                        className="max-w-40 truncate py-3 pr-6 font-mono text-xs"
                        title={r.user_id}
                      >
                        {r.user_id}
                      </td>
                      <td className="py-3 pr-6">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${r.role === "admin" ? "bg-gold/20 text-navy" : "bg-slate-100 text-slate-700"}`}
                        >
                          {r.role}
                        </span>
                      </td>
                      <td className="py-3 pr-6 text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("bg-BG")}
                      </td>
                      <td className="py-3 text-right">
                        {editingId !== r.user_id && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Редактирай името на ${nameByUserId.get(r.user_id) ?? r.user_id}`}
                            onClick={() => {
                              setEditingId(r.user_id);
                              setEditingName(nameByUserId.get(r.user_id) ?? "");
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(roles ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        Няма записи
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {profilesIsError && !rolesIsError && !rolesLoading && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              Имената на профилите не се заредиха. Идентификаторите и ролите остават налични.
              <Button
                type="button"
                variant="link"
                className="ml-1 h-auto p-0"
                onClick={() => void refetchProfiles()}
              >
                Опитай отново
              </Button>
            </p>
          )}
          {profilesLoading && !rolesLoading && !rolesIsError && (
            <p role="status" className="mt-3 text-sm text-muted-foreground">
              Зареждане на имената…
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
