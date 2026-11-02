do $$
begin
  if exists (
    select 1
    from public.honeypot_ip_restrictions
    where ip_address is not null
      and status in ('pending', 'active', 'pending_removal')
    group by ip_address
    having count(*) > 1
  ) then
    raise exception
      'Duplicate pending or active honeypot restrictions exist for an IP; reconcile them before applying this migration';
  end if;
end;
$$;

create unique index honeypot_one_live_restriction_per_ip_idx
  on public.honeypot_ip_restrictions (ip_address)
  where ip_address is not null and status in ('pending', 'active', 'pending_removal');
