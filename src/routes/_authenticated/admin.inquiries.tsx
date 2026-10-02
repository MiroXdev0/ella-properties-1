import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { InquiryRow } from "@/lib/admin/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/inquiries")({
  component: InquiriesAdmin,
});

const STATUSES: InquiryRow["status"][] = ["Ново", "Обработено", "Завършено"];

function InquiriesAdmin() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-inquiries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as InquiryRow[];
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
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inquiries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Изтрито");
      qc.invalidateQueries({ queryKey: ["admin-inquiries"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-navy">Запитвания</h1>
        <p className="text-sm text-muted-foreground">Съобщения, изпратени през формата за контакт</p>
      </div>

      {isLoading ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">Зареждане...</CardContent></Card>
      ) : items.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">Все още няма запитвания.</CardContent></Card>
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
                    <Select value={i.status} onValueChange={(v) => updateStatus.mutate({ id: i.id, status: v as InquiryRow["status"] })}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Изтрий?")) del.mutate(i.id); }}>
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}





