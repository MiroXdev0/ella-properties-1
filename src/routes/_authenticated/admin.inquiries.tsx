import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { InquiryRow } from "@/lib/admin/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Route as AuthenticatedRoute } from "./route";

export const Route = createFileRoute("/_authenticated/admin/inquiries")({
  component: InquiriesAdmin,
});

const STATUSES: InquiryRow["status"][] = ["Ново", "Обработено", "Завършено"];
const PAGE_SIZE = 25;

function InquiriesAdmin() {
  const qc = useQueryClient();
  const { isAdmin } = AuthenticatedRoute.useRouteContext();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InquiryRow["status"] | "all">("all");
  const [page, setPage] = useState(0);
  const normalizedSearch = search.trim();
  const inquiriesQuery = useQuery({
    queryKey: ["admin-inquiries", { search: normalizedSearch, status, page }],
    queryFn: async () => {
      let query = supabase
        .from("inquiries")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (status !== "all") query = query.eq("status", status);
      if (normalizedSearch) {
        const term = normalizedSearch
          .replaceAll("\\", "\\\\")
          .replaceAll('"', '\\"')
          .replaceAll("%", "\\%")
          .replaceAll("_", "\\_");
        query = query.or(
          `name.ilike."%${term}%",email.ilike."%${term}%",phone.ilike."%${term}%",message.ilike."%${term}%"`,
        );
      }
      const { data, error, count } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return { items: data as InquiryRow[], count: count ?? 0 };
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InquiryRow["status"] }) => {
      const { error } = await supabase.from("inquiries").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-inquiries"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Статусът е обновен");
    },
    onError: (error: Error) => toast.error(`Неуспешно обновяване: ${error.message}`),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inquiries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Запитването е изтрито");
      qc.invalidateQueries({ queryKey: ["admin-inquiries"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error: Error) => toast.error(`Неуспешно изтриване: ${error.message}`),
  });

  const items = inquiriesQuery.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((inquiriesQuery.data?.count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-navy">Запитвания</h1>
        <p className="text-sm text-muted-foreground">Съобщения, изпратени през формата за контакт · {inquiriesQuery.data?.count ?? "—"} общо</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Търсене по име, контакт или съобщение"
              className="pl-9"
              aria-label="Търсене на запитвания"
            />
          </div>
          <Select value={status} onValueChange={(value) => {
            setStatus(value as InquiryRow["status"] | "all");
            setPage(0);
          }}>
            <SelectTrigger aria-label="Филтър по статус"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всички статуси</SelectItem>
              {STATUSES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {inquiriesQuery.isLoading ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">Зареждане...</CardContent></Card>
      ) : inquiriesQuery.isError ? (
        <Card role="alert" className="border-0 shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-8 text-sm text-destructive">
            <span>Запитванията не можаха да се заредят: {inquiriesQuery.error.message}</span>
            <Button variant="outline" onClick={() => void inquiriesQuery.refetch()}>Опитай отново</Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">Няма запитвания за избраните критерии.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {items.map((i) => (
            <Card key={i.id} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-display text-xl text-navy">{i.name}</div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(i.created_at).toLocaleString("bg-BG")}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {i.phone && <a href={`tel:${i.phone}`} className="flex items-center gap-1.5 hover:text-navy"><Phone className="h-3.5 w-3.5" /> {i.phone}</a>}
                      {i.email && <a href={`mailto:${i.email}`} className="flex items-center gap-1.5 hover:text-navy"><Mail className="h-3.5 w-3.5" /> {i.email}</a>}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/85">{i.message}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={i.status}
                      disabled={updateStatus.isPending}
                      onValueChange={(v) => updateStatus.mutate({ id: i.id, status: v as InquiryRow["status"] })}
                    >
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={del.isPending}
                        aria-label={`Изтрий запитването от ${i.name}`}
                        onClick={() => { if (confirm(`Изтрий запитването от ${i.name}?`)) del.mutate(i.id); }}
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Страница {page + 1} от {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0 || inquiriesQuery.isFetching} onClick={() => setPage((current) => current - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Назад
              </Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages || inquiriesQuery.isFetching} onClick={() => setPage((current) => current + 1)}>
                Напред <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




