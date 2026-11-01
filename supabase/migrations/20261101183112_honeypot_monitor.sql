create table public.honeypot_visitors (
  id uuid primary key default gen_random_uuid(),
  source_hash text not null unique check (source_hash ~ '^[a-f0-9]{64}$'),
  ip_address inet,
  country text check (country is null or length(country) between 1 and 100),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  city text check (city is null or length(city) between 1 and 100),
  region text check (region is null or length(region) between 1 and 100),
  operating_system text check (operating_system is null or length(operating_system) between 1 and 80),
  browser text check (browser is null or length(browser) between 1 and 80),
  browser_version text check (browser_version is null or length(browser_version) between 1 and 40),
  device_type text check (device_type is null or length(device_type) between 1 and 80),
  asn bigint check (asn is null or asn > 0),
  as_organization text check (as_organization is null or length(as_organization) between 1 and 120),
  hosting_classification text check (hosting_classification is null or length(hosting_classification) between 1 and 120),
  user_agent text check (user_agent is null or length(user_agent) between 1 and 512),
  metadata_sources jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata_sources) = 'object'
  ),
  is_trusted boolean not null default false,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  identity_purged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.honeypot_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references public.honeypot_visitors(id) on delete cascade,
  detected_at timestamptz not null default now(),
  detection_reason text not null check (length(detection_reason) between 1 and 300),
  hostname text not null check (
    length(hostname) between 1 and 253
    and hostname = lower(hostname)
    and hostname ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$'
  ),
  endpoint text not null check (length(endpoint) between 1 and 300),
  request_method text not null check (length(request_method) between 1 and 16),
  referrer text check (referrer is null or length(referrer) <= 500),
  user_agent text check (user_agent is null or length(user_agent) <= 512),
  status text not null default 'new'
    check (status in ('new', 'investigating', 'confirmed_suspicious', 'restricted', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (id, visitor_id)
);

create table public.honeypot_activity (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  event_id uuid not null unique,
  activity_type text not null default 'honeypot_access' check (activity_type = 'honeypot_access'),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint honeypot_activity_event_visitor_fkey
    foreign key (event_id, visitor_id)
    references public.honeypot_events(id, visitor_id) on delete cascade
);

create table public.honeypot_ip_restrictions (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references public.honeypot_visitors(id) on delete set null,
  ip_address inet,
  cloudflare_rule_id text unique,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'pending_removal', 'unbanned', 'expired', 'failed')),
  duration text not null check (duration in ('1_hour', '24_hours', '7_days', 'permanent')),
  reason text not null check (length(reason) between 1 and 500),
  administrator_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  released_at timestamptz,
  updated_at timestamptz not null default now(),
  check ((duration = 'permanent' and expires_at is null) or (duration <> 'permanent' and expires_at is not null)),
  check (
    status not in ('pending', 'active', 'pending_removal')
    or (visitor_id is not null and ip_address is not null)
  ),
  check (
    status not in ('active', 'pending_removal')
    or cloudflare_rule_id is not null
  )
);

create table public.honeypot_admin_notes (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  event_id uuid,
  administrator_id uuid not null,
  note text not null check (length(btrim(note)) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint honeypot_admin_notes_visitor_id_fkey
    foreign key (visitor_id) references public.honeypot_visitors(id) on delete cascade,
  constraint honeypot_admin_notes_event_visitor_fkey
    foreign key (event_id, visitor_id)
    references public.honeypot_events(id, visitor_id) on delete cascade
);

create table public.honeypot_admin_audit (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references public.honeypot_visitors(id) on delete set null,
  event_id uuid references public.honeypot_events(id) on delete set null,
  restriction_id uuid references public.honeypot_ip_restrictions(id) on delete set null,
  administrator_id uuid,
  action text not null check (action in (
    'event_status_changed',
    'note_added',
    'restriction_requested',
    'restriction_activated',
    'restriction_failed',
    'restriction_removal_requested',
    'restriction_removal_failed',
    'restriction_removed',
    'restriction_expired',
    'retention_purge'
  )),
  outcome text not null default 'success' check (outcome in ('pending', 'success', 'failed')),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create index honeypot_events_detected_at_idx on public.honeypot_events (detected_at desc, id desc);
create index honeypot_events_status_detected_at_idx on public.honeypot_events (status, detected_at desc);
create index honeypot_events_visitor_detected_at_idx on public.honeypot_events (visitor_id, detected_at desc);
create index honeypot_events_visitor_hostname_idx on public.honeypot_events (visitor_id, hostname);
create index honeypot_activity_visitor_occurred_at_idx on public.honeypot_activity (visitor_id, occurred_at desc);
create index honeypot_activity_event_visitor_idx on public.honeypot_activity (event_id, visitor_id);
create index honeypot_visitors_last_seen_idx on public.honeypot_visitors (last_seen desc);
create index honeypot_visitors_ip_address_idx on public.honeypot_visitors (ip_address) where ip_address is not null;
create index honeypot_visitors_country_code_idx on public.honeypot_visitors (country_code);
create index honeypot_ip_restrictions_status_expires_at_idx on public.honeypot_ip_restrictions (status, expires_at);
create index honeypot_ip_restrictions_visitor_idx on public.honeypot_ip_restrictions (visitor_id, created_at desc);
create unique index honeypot_one_pending_or_active_restriction_idx
  on public.honeypot_ip_restrictions (visitor_id)
  where visitor_id is not null and status in ('pending', 'active', 'pending_removal');
create index honeypot_admin_notes_visitor_created_at_idx on public.honeypot_admin_notes (visitor_id, created_at desc);
create index honeypot_admin_notes_event_visitor_idx
  on public.honeypot_admin_notes (event_id, visitor_id) where event_id is not null;
create index honeypot_admin_audit_visitor_created_at_idx on public.honeypot_admin_audit (visitor_id, created_at desc);

create function public.validate_honeypot_restriction()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_ip_address inet;
begin
  if current_setting('app.honeypot_retention_purge', true) = 'on'
     and (new.visitor_id is null or new.ip_address is null) then
    return new;
  end if;
  if new.visitor_id is null or new.ip_address is null then
    raise exception 'A honeypot restriction requires a visitor and IP address';
  end if;

  select visitors.ip_address into v_ip_address
  from public.honeypot_visitors visitors
  where visitors.id = new.visitor_id;

  if v_ip_address is null or v_ip_address is distinct from new.ip_address then
    raise exception 'Restriction IP address does not match the visitor';
  end if;
  return new;
end;
$$;

create trigger honeypot_restriction_visitor_ip_check
before insert or update of visitor_id, ip_address on public.honeypot_ip_restrictions
for each row execute function public.validate_honeypot_restriction();

create function public.validate_honeypot_audit_references()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_visitor_id uuid;
begin
  if new.event_id is not null then
    select events.visitor_id into v_visitor_id
    from public.honeypot_events events
    where events.id = new.event_id;
    if not found or new.visitor_id is distinct from v_visitor_id then
      raise exception 'Audit event does not belong to the specified visitor';
    end if;
  end if;

  if new.restriction_id is not null then
    select restrictions.visitor_id into v_visitor_id
    from public.honeypot_ip_restrictions restrictions
    where restrictions.id = new.restriction_id;
    if not found or new.visitor_id is distinct from v_visitor_id then
      raise exception 'Audit restriction does not belong to the specified visitor';
    end if;
  end if;
  return new;
end;
$$;

create trigger honeypot_audit_reference_check
before insert on public.honeypot_admin_audit
for each row execute function public.validate_honeypot_audit_references();

create function public.enforce_honeypot_audit_append_only()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' then
    if current_setting('app.honeypot_retention_purge', true) = 'on'
       and (to_jsonb(new) - array['visitor_id', 'event_id', 'restriction_id'])
         = (to_jsonb(old) - array['visitor_id', 'event_id', 'restriction_id'])
       and (new.visitor_id is null or new.visitor_id is not distinct from old.visitor_id)
       and (new.event_id is null or new.event_id is not distinct from old.event_id)
       and (new.restriction_id is null or new.restriction_id is not distinct from old.restriction_id)
       and (
         new.visitor_id is distinct from old.visitor_id
         or new.event_id is distinct from old.event_id
         or new.restriction_id is distinct from old.restriction_id
       ) then
      return new;
    end if;
    raise exception 'Honeypot audit records are append-only';
  end if;

  if current_setting('app.honeypot_retention_purge', true) = 'on'
     and old.created_at < now() - interval '365 days' then
    return old;
  end if;
  raise exception 'Honeypot audit records may only be deleted by retention cleanup';
end;
$$;

create trigger honeypot_audit_append_only
before update or delete on public.honeypot_admin_audit
for each row execute function public.enforce_honeypot_audit_append_only();

alter table public.honeypot_visitors enable row level security;
alter table public.honeypot_visitors force row level security;
alter table public.honeypot_events enable row level security;
alter table public.honeypot_events force row level security;
alter table public.honeypot_activity enable row level security;
alter table public.honeypot_activity force row level security;
alter table public.honeypot_ip_restrictions enable row level security;
alter table public.honeypot_ip_restrictions force row level security;
alter table public.honeypot_admin_notes enable row level security;
alter table public.honeypot_admin_notes force row level security;
alter table public.honeypot_admin_audit enable row level security;
alter table public.honeypot_admin_audit force row level security;

revoke all on public.honeypot_visitors, public.honeypot_events, public.honeypot_activity,
  public.honeypot_ip_restrictions, public.honeypot_admin_notes, public.honeypot_admin_audit
  from public, anon, authenticated;
grant all on public.honeypot_visitors, public.honeypot_events, public.honeypot_activity,
  public.honeypot_ip_restrictions, public.honeypot_admin_notes
  to service_role;
revoke all on public.honeypot_admin_audit from service_role;
grant select, insert, delete on public.honeypot_admin_audit to service_role;
revoke execute on function public.validate_honeypot_restriction() from public, anon, authenticated;
revoke execute on function public.validate_honeypot_audit_references() from public, anon, authenticated;
revoke execute on function public.enforce_honeypot_audit_append_only() from public, anon, authenticated;

create or replace function public.record_honeypot_detection(
  p_source_hash text,
  p_ip_address inet,
  p_country text,
  p_country_code text,
  p_city text,
  p_region text,
  p_operating_system text,
  p_browser text,
  p_browser_version text,
  p_device_type text,
  p_asn bigint,
  p_as_organization text,
  p_hosting_classification text,
  p_user_agent text,
  p_metadata_sources jsonb,
  p_is_trusted boolean,
  p_detection_reason text,
  p_hostname text,
  p_endpoint text,
  p_request_method text,
  p_referrer text
)
returns table (visitor_id uuid, event_id uuid, request_count integer)
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_visitor_id uuid;
  v_request_count integer;
  v_recent_count integer;
  v_metadata_key_count integer;
  v_event_id uuid;
  v_reason text;
begin
  if p_source_hash is null or p_source_hash !~ '^[a-f0-9]{64}$'
     or (p_ip_address is not null and masklen(p_ip_address) <>
       case family(p_ip_address) when 4 then 32 else 128 end)
     or (p_country is not null and (
       length(btrim(p_country)) not between 1 and 100 or p_country ~ '[[:cntrl:]]'
     ))
     or (p_country_code is not null and p_country_code !~ '^[A-Z]{2}$')
     or (p_city is not null and (
       length(btrim(p_city)) not between 1 and 100 or p_city ~ '[[:cntrl:]]'
     ))
     or (p_region is not null and (
       length(btrim(p_region)) not between 1 and 100 or p_region ~ '[[:cntrl:]]'
     ))
     or (p_operating_system is not null and (
       length(btrim(p_operating_system)) not between 1 and 80 or p_operating_system ~ '[[:cntrl:]]'
     ))
     or (p_browser is not null and (
       length(btrim(p_browser)) not between 1 and 80 or p_browser ~ '[[:cntrl:]]'
     ))
     or (p_browser_version is not null and (
       length(btrim(p_browser_version)) not between 1 and 40 or p_browser_version ~ '[[:cntrl:]]'
     ))
     or (p_device_type is not null and (
       length(btrim(p_device_type)) not between 1 and 80 or p_device_type ~ '[[:cntrl:]]'
     ))
     or (p_asn is not null and p_asn not between 1 and 4294967295)
     or (p_as_organization is not null and (
       length(btrim(p_as_organization)) not between 1 and 120 or p_as_organization ~ '[[:cntrl:]]'
     ))
     or (p_hosting_classification is not null and (
       length(btrim(p_hosting_classification)) not between 1 and 120
       or p_hosting_classification ~ '[[:cntrl:]]'
     ))
     or (p_user_agent is not null and (
       length(btrim(p_user_agent)) not between 1 and 512 or p_user_agent ~ '[[:cntrl:]]'
     ))
     or p_is_trusted is null
     or p_detection_reason is null or p_detection_reason not in (
       'Decoy credentials resource requested',
       'Sensitive configuration decoy requested',
       'Backup archive decoy requested',
       'Database dump decoy requested',
       'CMS configuration decoy requested',
       'Database administration decoy requested'
     )
     or p_hostname is null or length(p_hostname) not between 1 and 253
     or p_hostname !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$'
     or p_endpoint is null or p_endpoint not in (
       '/passwords.json', '/.env', '/backup.zip', '/database.sql',
       '/wp-config.php', '/adminer.php', '/phpmyadmin'
     )
     or p_request_method is null or p_request_method !~ '^[A-Z][A-Z0-9_-]{0,15}$'
     or (p_referrer is not null and (
       length(btrim(p_referrer)) not between 1 and 500
       or p_referrer ~ '[?#[:cntrl:]]'
       or p_referrer !~* '^https?://[^/@?#]+(/[^?#]*)?$'
     )) then
    raise exception 'Invalid honeypot event';
  end if;

  if jsonb_typeof(p_metadata_sources) is distinct from 'object' then
    raise exception 'Invalid honeypot metadata source map';
  end if;
  select count(*) into v_metadata_key_count
  from jsonb_object_keys(p_metadata_sources);
  if v_metadata_key_count > 32 then
    raise exception 'Invalid honeypot metadata source map';
  end if;
  if exists (
    select 1
    from jsonb_each(p_metadata_sources) as metadata(key, value)
    where length(metadata.key) not between 1 and 64
       or metadata.key ~ '[[:cntrl:]]'
       or jsonb_typeof(metadata.value) is distinct from 'string'
       or length(metadata.value #>> '{}') not between 1 and 200
       or metadata.value #>> '{}' ~ '[[:cntrl:]]'
  ) then
    raise exception 'Invalid honeypot metadata source entry';
  end if;

  insert into public.honeypot_visitors (
    source_hash, ip_address, country, country_code, city, region, operating_system,
    browser, browser_version, device_type, asn, as_organization, hosting_classification,
    user_agent, metadata_sources, is_trusted
  ) values (
    p_source_hash, p_ip_address, p_country, p_country_code, p_city, p_region,
    p_operating_system, p_browser, p_browser_version, p_device_type, p_asn,
    p_as_organization, p_hosting_classification, p_user_agent, p_metadata_sources, p_is_trusted
  )
  on conflict (source_hash) do update set
    ip_address = excluded.ip_address,
    country = excluded.country,
    country_code = excluded.country_code,
    city = excluded.city,
    region = excluded.region,
    operating_system = excluded.operating_system,
    browser = excluded.browser,
    browser_version = excluded.browser_version,
    device_type = excluded.device_type,
    asn = excluded.asn,
    as_organization = excluded.as_organization,
    hosting_classification = excluded.hosting_classification,
    user_agent = excluded.user_agent,
    metadata_sources = excluded.metadata_sources,
    is_trusted = excluded.is_trusted,
    last_seen = now(),
    request_count = honeypot_visitors.request_count + 1,
    updated_at = now()
  where honeypot_visitors.ip_address is not distinct from excluded.ip_address
  returning id, honeypot_visitors.request_count into v_visitor_id, v_request_count;

  if v_visitor_id is null then
    raise exception 'Honeypot source hash does not match the recorded IP address';
  end if;

  select count(*)::integer into v_recent_count
  from public.honeypot_activity
  where honeypot_activity.visitor_id = v_visitor_id
    and honeypot_activity.occurred_at > now() - interval '10 minutes';

  v_reason := p_detection_reason;
  if v_recent_count >= 3 then
    v_reason := v_reason || ' · High-frequency repeat access';
  elsif v_request_count > 1 then
    v_reason := v_reason || ' · Repeat access';
  end if;

  insert into public.honeypot_events (
    visitor_id, detection_reason, hostname, endpoint, request_method, referrer, user_agent
  ) values (
    v_visitor_id, v_reason, p_hostname, p_endpoint, p_request_method, p_referrer, p_user_agent
  ) returning id into v_event_id;

  insert into public.honeypot_activity (visitor_id, event_id)
  values (v_visitor_id, v_event_id);

  return query select v_visitor_id, v_event_id, v_request_count;
end;
$$;

revoke all on function public.record_honeypot_detection(
  text, inet, text, text, text, text, text, text, text, text, bigint, text, text, text,
  jsonb, boolean, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.record_honeypot_detection(
  text, inet, text, text, text, text, text, text, text, text, bigint, text, text, text,
  jsonb, boolean, text, text, text, text, text
) to service_role;

create or replace function public.purge_honeypot_data()
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_deleted integer;
begin
  perform set_config('app.honeypot_retention_purge', 'on', true);

  delete from public.honeypot_admin_notes
  where created_at < now() - interval '90 days';

  delete from public.honeypot_events
  where detected_at < now() - interval '90 days';

  delete from public.honeypot_visitors v
  where v.last_seen < now() - interval '90 days'
    and not exists (
      select 1 from public.honeypot_ip_restrictions r
      where r.visitor_id = v.id and r.status in ('pending', 'active', 'pending_removal')
    );
  get diagnostics v_deleted = row_count;

  update public.honeypot_visitors v
  set source_hash = md5(gen_random_uuid()::text || clock_timestamp()::text)
      || md5(gen_random_uuid()::text || random()::text),
      ip_address = null,
      country = null,
      country_code = null,
      city = null,
      region = null,
      operating_system = null,
      browser = null,
      browser_version = null,
      device_type = null,
      asn = null,
      as_organization = null,
      hosting_classification = null,
      user_agent = null,
      metadata_sources = '{}'::jsonb,
      identity_purged_at = now(),
      updated_at = now()
  where v.last_seen < now() - interval '90 days'
    and v.ip_address is not null
    and exists (
      select 1 from public.honeypot_ip_restrictions r
      where r.visitor_id = v.id and r.status in ('pending', 'active', 'pending_removal')
    );

  update public.honeypot_ip_restrictions
  set ip_address = null, updated_at = now()
  where status in ('unbanned', 'expired', 'failed')
    and coalesce(released_at, expires_at, updated_at) < now() - interval '90 days'
    and ip_address is not null;

  delete from public.honeypot_admin_audit
  where created_at < now() - interval '365 days';

  delete from public.honeypot_ip_restrictions
  where status in ('unbanned', 'expired', 'failed')
    and coalesce(released_at, expires_at, updated_at) < now() - interval '365 days';

  return v_deleted;
end;
$$;

revoke all on function public.purge_honeypot_data() from public, anon, authenticated;
grant execute on function public.purge_honeypot_data() to service_role;

create or replace function public.honeypot_hourly_volume()
returns table (hour timestamptz, event_count bigint)
language sql
stable
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
  select buckets.hour, count(events.id) as event_count
  from generate_series(
    date_trunc('hour', now()) - interval '23 hours',
    date_trunc('hour', now()),
    interval '1 hour'
  ) as buckets(hour)
  left join public.honeypot_events events
    on events.detected_at >= buckets.hour
    and events.detected_at < buckets.hour + interval '1 hour'
  group by buckets.hour
  order by buckets.hour;
$$;

revoke all on function public.honeypot_hourly_volume() from public, anon, authenticated;
grant execute on function public.honeypot_hourly_volume() to service_role;

create or replace function public.honeypot_hosts_match_zone(
  p_visitor_id uuid,
  p_zone_hostname text
)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(
    p_zone_hostname is not null
  and p_zone_hostname = lower(p_zone_hostname)
  and length(p_zone_hostname) between 1 and 253
  and p_zone_hostname ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$'
  and exists (
    select 1
    from public.honeypot_events events
    where events.visitor_id = p_visitor_id
  )
  and not exists (
    select 1
    from public.honeypot_events events
    where events.visitor_id = p_visitor_id
      and (
        events.hostname <> lower(events.hostname)
        or events.hostname !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$'
        or (
          lower(events.hostname) <> lower(p_zone_hostname)
          and right(lower(events.hostname), length(p_zone_hostname) + 1)
            <> '.' || lower(p_zone_hostname)
        )
      )
  ), false);
$$;

revoke all on function public.honeypot_hosts_match_zone(uuid, text) from public, anon, authenticated;
grant execute on function public.honeypot_hosts_match_zone(uuid, text) to service_role;