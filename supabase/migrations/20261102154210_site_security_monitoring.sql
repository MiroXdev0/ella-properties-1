create table public.site_security_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references public.honeypot_visitors(id) on delete set null,
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  category text not null check (
    category in ('admin', 'authentication', 'api', 'property', 'form', 'traffic')
  ),
  event_type text not null check (event_type ~ '^[a-z][a-z0-9_]{0,79}$'),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  risk_score smallint not null check (risk_score between 1 and 100),
  request_method text not null check (request_method ~ '^[A-Z]{1,16}$'),
  route text not null check (
    length(route) between 1 and 200
    and route ~ '^/$|^(/[A-Za-z0-9:_-]{1,60}){1,6}$'
  ),
  http_status smallint not null check (http_status between 100 and 599),
  signals jsonb not null check (
    jsonb_typeof(signals) = 'array'
    and jsonb_array_length(signals) between 1 and 13
  ),
  correlation_id uuid not null,
  dedupe_key text not null unique check (dedupe_key ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  observed_requests smallint not null default 1 check (observed_requests between 1 and 120),
  created_at timestamptz not null default now(),
  check (last_seen >= first_seen),
  check (
    (severity = 'low' and risk_score < 6)
    or (severity = 'medium' and risk_score between 6 and 8)
    or (severity = 'high' and risk_score between 9 and 12)
    or (severity = 'critical' and risk_score >= 13)
  )
);

create index site_security_events_detected_at_idx
  on public.site_security_events (last_seen desc, id desc);
create index site_security_events_severity_last_seen_idx
  on public.site_security_events (severity, last_seen desc);
create index site_security_events_category_last_seen_idx
  on public.site_security_events (category, last_seen desc);
create index site_security_events_source_last_seen_idx
  on public.site_security_events (source_hash, last_seen desc);
create index site_security_events_visitor_last_seen_idx
  on public.site_security_events (visitor_id, last_seen desc)
  where visitor_id is not null;
create index site_security_events_route_last_seen_idx
  on public.site_security_events (route, last_seen desc);

alter table public.site_security_events enable row level security;
alter table public.site_security_events force row level security;
revoke all on public.site_security_events from public, anon, authenticated;
grant select, insert, update, delete on public.site_security_events to service_role;

create or replace function public.record_site_security_event(
  p_category text,
  p_event_type text,
  p_dedupe_key text,
  p_http_status integer,
  p_observed_requests integer,
  p_request_method text,
  p_risk_score integer,
  p_route text,
  p_severity text,
  p_signals jsonb,
  p_source_hash text,
  p_window_started_at timestamptz,
  p_correlation_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_event_id uuid;
begin
  if p_category is null
     or p_category not in ('admin', 'authentication', 'api', 'property', 'form', 'traffic') then
    raise exception 'Invalid security event category';
  end if;
  if p_event_type is null or p_event_type !~ '^[a-z][a-z0-9_]{0,79}$' then
    raise exception 'Invalid security event type';
  end if;
  if p_dedupe_key is null or p_dedupe_key !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid security event deduplication key';
  end if;
  if p_http_status is null or p_http_status not between 100 and 599 then
    raise exception 'Invalid security event HTTP status';
  end if;
  if p_observed_requests is null or p_observed_requests not between 1 and 120 then
    raise exception 'Invalid observed security request count';
  end if;
  if p_request_method is null or p_request_method !~ '^[A-Z]{1,16}$' then
    raise exception 'Invalid security event request method';
  end if;
  if p_risk_score is null or p_risk_score not between 1 and 100 then
    raise exception 'Invalid security event risk score';
  end if;
  if p_route is null or length(p_route) > 200
     or p_route !~ '^/$|^(/[A-Za-z0-9:_-]{1,60}){1,6}$' then
    raise exception 'Invalid security event route';
  end if;
  if p_severity is null
     or p_severity not in ('low', 'medium', 'high', 'critical')
     or (p_severity = 'low' and p_risk_score >= 6)
     or (p_severity = 'medium' and p_risk_score not between 6 and 8)
     or (p_severity = 'high' and p_risk_score not between 9 and 12)
     or (p_severity = 'critical' and p_risk_score < 13) then
    raise exception 'Security event severity does not match its risk score';
  end if;
  if p_signals is null
     or jsonb_typeof(p_signals) <> 'array'
     or jsonb_array_length(p_signals) not between 1 and 13
     or octet_length(p_signals::text) > 512
     or exists (
       select 1
       from jsonb_array_elements(p_signals) as signal(value)
       where jsonb_typeof(signal.value) <> 'string'
         or signal.value #>> '{}' not in (
           'high_request_rate',
           'repeated_endpoint',
           'multi_endpoint_burst',
           'sensitive_route_frequency',
           'property_page_enumeration',
           'client_error_burst',
           'unexpected_method',
           'malformed_api_burst',
           'unauthorized_admin_attempt',
           'form_honeypot_filled',
           'form_submitted_too_fast',
           'registration_failed',
           'invalid_auth_token'
         )
     ) then
    raise exception 'Invalid security event signals';
  end if;
  if p_source_hash is null or p_source_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid security event source identifier';
  end if;
  if p_window_started_at is null
     or p_window_started_at > now()
     or p_window_started_at < now() - interval '20 minutes'
     or mod(extract(epoch from p_window_started_at)::bigint, 600) <> 0 then
    raise exception 'Invalid security event aggregation window';
  end if;
  if p_correlation_id is null then
    raise exception 'Security event correlation identifier is required';
  end if;

  insert into public.site_security_events as existing (
    visitor_id,
    source_hash,
    category,
    event_type,
    severity,
    risk_score,
    request_method,
    route,
    http_status,
    signals,
    correlation_id,
    dedupe_key,
    window_started_at,
    observed_requests
  )
  select
    (select visitors.id from public.honeypot_visitors visitors
      where visitors.source_hash = p_source_hash limit 1),
    p_source_hash,
    p_category,
    p_event_type,
    p_severity,
    p_risk_score,
    p_request_method,
    p_route,
    p_http_status,
    p_signals,
    p_correlation_id,
    p_dedupe_key,
    p_window_started_at,
    p_observed_requests
  on conflict (dedupe_key) do update
  set
    severity = case
      when excluded.risk_score > existing.risk_score then excluded.severity
      else existing.severity
    end,
    risk_score = greatest(existing.risk_score, excluded.risk_score),
    request_method = excluded.request_method,
    http_status = excluded.http_status,
    signals = (
      select coalesce(jsonb_agg(merged.signal), '[]'::jsonb)
      from (
        select distinct signals.value as signal
        from jsonb_array_elements(existing.signals || excluded.signals) as signals(value)
        limit 13
      ) as merged
    ),
    last_seen = now(),
    occurrence_count = least(existing.occurrence_count + 1, 2147483647),
    observed_requests = greatest(existing.observed_requests, excluded.observed_requests)
  where existing.source_hash = excluded.source_hash
    and existing.category = excluded.category
    and existing.event_type = excluded.event_type
    and existing.route = excluded.route
    and existing.last_seen <= now() - interval '60 seconds'
  returning id into v_event_id;

  if v_event_id is null then
    select events.id
      into v_event_id
      from public.site_security_events events
      where events.dedupe_key = p_dedupe_key
        and events.source_hash = p_source_hash
        and events.category = p_category
        and events.event_type = p_event_type
        and events.route = p_route;
  end if;

  if v_event_id is null then
    raise exception 'Security event deduplication key conflicts with a different event';
  end if;

  return v_event_id;
end;
$$;

revoke all on function public.record_site_security_event(
  text, text, text, integer, integer, text, integer, text, text, jsonb, text, timestamptz, uuid
) from public, anon, authenticated;
grant execute on function public.record_site_security_event(
  text, text, text, integer, integer, text, integer, text, text, jsonb, text, timestamptz, uuid
) to service_role;

create or replace function public.site_security_overview()
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'totalEvents', (select count(*) from public.site_security_events),
    'last24Hours', (
      select count(*) from public.site_security_events
      where last_seen >= now() - interval '24 hours'
    ),
    'bySeverity', coalesce((
      select jsonb_object_agg(summary.severity, summary.event_count)
      from (
        select severity, count(*) as event_count
        from public.site_security_events
        group by severity
      ) summary
    ), '{}'::jsonb),
    'byCategory', coalesce((
      select jsonb_object_agg(summary.category, summary.event_count)
      from (
        select category, count(*) as event_count
        from public.site_security_events
        group by category
      ) summary
    ), '{}'::jsonb),
    'topRoutes', coalesce((
      select jsonb_agg(to_jsonb(summary))
      from (
        select route, sum(occurrence_count)::bigint as occurrence_count
        from public.site_security_events
        group by route
        order by sum(occurrence_count) desc, route
        limit 5
      ) summary
    ), '[]'::jsonb),
    'recentHighRisk', coalesce((
      select jsonb_agg(to_jsonb(summary))
      from (
        select id, visitor_id, left(source_hash, 12) as source_id,
          category, event_type, severity, risk_score, route, last_seen
        from public.site_security_events
        where severity in ('high', 'critical')
        order by risk_score desc, last_seen desc
        limit 5
      ) summary
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.site_security_overview() from public, anon, authenticated;
grant execute on function public.site_security_overview() to service_role;

create or replace function public.purge_site_security_events()
returns bigint
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_deleted bigint;
begin
  delete from public.site_security_events
  where last_seen < now() - interval '90 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.purge_site_security_events() from public, anon, authenticated;
grant execute on function public.purge_site_security_events() to service_role;
