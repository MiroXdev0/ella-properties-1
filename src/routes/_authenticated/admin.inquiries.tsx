import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { InquiryRow } from "@/lib/admin/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Route as AuthenticatedRoute } from "./route";

export const Route = createFileRoute("/_authenticated/admin/inquiries")({
  component: InquiriesAdmin,
});

const STATUSES: InquiryRow["status"][] = ["Ново", "Обработено", "Завършено"];
const PAGE_SIZE = 25;
type InquiryWithProperty = InquiryRow & {
  property: { id: string; title: string } | null;
};

function InquiriesAdmin() {
  const qc = useQueryClient();
  const { isAdmin } = AuthenticatedRoute.useRouteContext();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InquiryRow["status"] | "all">("all");
  const [page, setPage] = useState(0);
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const pendingRowsRef = useRef(new Set<string>());
  const [pendingRows, setPendingRows] = useState<Set<string>>(new Set());
  const normalizedSearch = search.trim();
  const inquiriesQuery = useQuery({
    queryKey: ["admin-inquiries", { search: normalizedSearch, status, sortDirection, page }],
    queryFn: async () => {
      let query = supabase
        .from("inquiries")
        .select("*,property:properties!inquiries_property_id_fkey(id,title)", { count: "exact" })
        .order("created_at", { ascending: sortDirection === "asc" })
        .order("id", { ascending: true });
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
      const { data, error, count } = await query.range(
        page * PAGE_SIZE,
        (page + 1) * PAGE_SIZE - 1,
      );
      if (error) throw error;
      return { items: data as InquiryWithProperty[], count: count ?? 0 };
    },
  });

  function beginRowAction(id: string): boolean {
    if (pendingRowsRef.current.has(id)) return false;
    pendingRowsRef.current.add(id);
    setPendingRows(new Set(pendingRowsRef.current));
    return true;
  }

  function finishRowAction(id: string) {
    pendingRowsRef.current.delete(id);
    setPendingRows(new Set(pendingRowsRef.current));
  }

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InquiryRow["status"] }) => {
      const { data, error } = await supabase
        .from("inquiries")
        .update({ status })
        .eq("id", id)
        .select("id,status")
        .maybeSingle();
      if (error) throw error;
      if (!data || data.status !== status) {
        throw new Error("Запитването не беше намерено или статусът не се промени.");
      }
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-inquiries"] }),
        qc.invalidateQueries({ queryKey: ["admin-stats"] }),
      ]);
      toast.success("Статусът е обновен");
    },
    onError: (error: Error) => toast.error(`Неуспешно обновяване: ${error.message}`),
    onSettled: (_data, _error, variables) => finishRowAction(variables.id),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("inquiries")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Запитването не беше намерено или не може да бъде изтрито.");
    },
    onSuccess: async () => {
      toast.success("Запитването е изтрито");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-inquiries"] }),
        qc.invalidateQueries({ queryKey: ["admin-stats"] }),
      ]);
    },
    onError: (error: Error) => toast.error(`Неуспешно изтриване: ${error.message}`),
    onSettled: (_data, _error, id) => finishRowAction(id),
  });

  useEffect(() => {
    if (!inquiriesQuery.data) return;
    const lastPage = Math.max(0, Math.ceil(inquiriesQuery.data.count / PAGE_SIZE) - 1);
    if (page > lastPage) setPage(lastPage);
  }, [inquiriesQuery.data, page]);

  function changeInquiryStatus(id: string, nextStatus: InquiryRow["status"]) {
    if (beginRowAction(id)) updateStatus.mutate({ id, status: nextStatus });
  }

  function deleteInquiry(id: string) {
    if (beginRowAction(id)) del.mutate(id);
  }

  const items = inquiriesQuery.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((inquiriesQuery.data?.count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-navy">Запитвания</h1>
        <p className="text-sm text-muted-foreground">
          Съобщения, изпратени през формата за контакт · {inquiriesQuery.data?.count ?? "—"} общо
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_220px_180px]">
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
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as InquiryRow["status"] | "all");
              setPage(0);
            }}
          >
            <SelectTrigger aria-label="Филтър по статус">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всички статуси</SelectItem>
              {STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sortDirection}
            onValueChange={(value) => {
              setSortDirection(value as "desc" | "asc");
              setPage(0);
            }}
          >
            <SelectTrigger aria-label="Сортиране по дата">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Най-нови първо</SelectItem>
              <SelectItem value="asc">Най-стари първо</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {inquiriesQuery.isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            Зареждане...
          </CardContent>
        </Card>
      ) : inquiriesQuery.isError ? (
        <Card role="alert" className="border-0 shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-8 text-sm text-destructive">
            <span>Запитванията не можаха да се заредят: {inquiriesQuery.error.message}</span>
            <Button variant="outline" onClick={() => void inquiriesQuery.refetch()}>
              Опитай отново
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            Няма запитвания за избраните критерии.
          </CardContent>
        </Card>
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
                      {i.phone && (
                        <a
                          href={`tel:${i.phone}`}
                          className="flex items-center gap-1.5 hover:text-navy"
                        >
                          <Phone className="h-3.5 w-3.5" /> {i.phone}
                        </a>
                      )}
                      {i.email && (
                        <a
                          href={`mailto:${i.email}`}
                          className="flex items-center gap-1.5 hover:text-navy"
                        >
                          <Mail className="h-3.5 w-3.5" /> {i.email}
                        </a>
                      )}
                    </div>
                    {i.property && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Имот:{" "}
                        <Link
                          to="/properties/$id"
                          params={{ id: i.property.id }}
                          className="font-medium text-navy underline-offset-2 hover:underline"
                        >
                          {i.property.title}
                        </Link>
                      </p>
                    )}
                    <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/85">
                      {i.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={i.status}
                      disabled={pendingRows.has(i.id)}
                      onValueChange={(value) =>
                        changeInquiryStatus(i.id, value as InquiryRow["status"])
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={pendingRows.has(i.id)}
                        aria-label={`Изтрий запитването от ${i.name}`}
                        onClick={() => {
                          if (confirm(`Изтрий запитването от ${i.name}?`)) deleteInquiry(i.id);
                        }}
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
            <span className="text-muted-foreground">
              Страница {page + 1} от {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0 || inquiriesQuery.isFetching}
                onClick={() => setPage((current) => current - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Назад
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages || inquiriesQuery.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Напред <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
