alter table public.honeypot_ip_restrictions
  add column enforcement_mode text not null default 'cloudflare_zone'
    check (enforcement_mode in ('cloudflare_zone', 'worker_only'));

do $$
declare
  v_constraint_name text;
begin
  select constraint_row.conname
    into v_constraint_name
  from pg_constraint constraint_row
  where constraint_row.conrelid = 'public.honeypot_ip_restrictions'::regclass
    and constraint_row.contype = 'c'
    and pg_get_constraintdef(constraint_row.oid) ilike '%cloudflare_rule_id IS NOT NULL%';

  if v_constraint_name is null then
    raise exception 'Could not find the existing Cloudflare restriction constraint';
  end if;

  execute format(
    'alter table public.honeypot_ip_restrictions drop constraint %I',
    v_constraint_name
  );
end;
$$;

alter table public.honeypot_ip_restrictions
  add constraint honeypot_ip_restrictions_active_enforcement_check
    check (
      status not in ('active', 'pending_removal')
      or (
        enforcement_mode = 'cloudflare_zone'
        and cloudflare_rule_id is not null
      )
      or (
        enforcement_mode = 'worker_only'
        and cloudflare_rule_id is null
      )
    ),
  add constraint honeypot_ip_restrictions_worker_rule_check
    check (enforcement_mode <> 'worker_only' or cloudflare_rule_id is null);
