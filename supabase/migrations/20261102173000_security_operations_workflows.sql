alter table public.site_security_events
  add column review_status text not null default 'new'
    check (review_status in ('new', 'reviewed', 'investigating', 'resolved', 'false_positive')),
  add column reviewed_by uuid,
  add column reviewed_at timestamptz;

alter table public.honeypot_visitors
  add column review_status text not null default 'new'
    check (review_status in ('new', 'investigating', 'cleared')),
  add column reviewed_by uuid,
  add column reviewed_at timestamptz;

alter table public.honeypot_ip_restrictions
  add column last_verified_at timestamptz;

create index site_security_events_review_status_last_seen_idx
  on public.site_security_events (review_status, last_seen desc, id desc);

create table public.site_security_admin_audit (
  id uuid primary key default gen_random_uuid(),
  administrator_id uuid,
  event_id uuid,
  action text not null check (
    action in ('event_review_status_changed', 'visitor_review_status_changed')
  ),
  previous_status text check (
    previous_status is null
    or previous_status in ('new', 'reviewed', 'investigating', 'resolved', 'false_positive', 'cleared')
  ),
  new_status text not null check (
    new_status in ('new', 'reviewed', 'investigating', 'resolved', 'false_positive', 'cleared')
  ),
  visitor_id uuid,
  details jsonb not null default '{}'::jsonb check (
    jsonb_typeof(details) = 'object'
    and octet_length(details::text) <= 1024
  ),
  created_at timestamptz not null default now()
);

create index site_security_admin_audit_created_at_idx
  on public.site_security_admin_audit (created_at desc, id desc);
create index site_security_admin_audit_event_created_at_idx
  on public.site_security_admin_audit (event_id, created_at desc)
  where event_id is not null;

alter table public.site_security_admin_audit enable row level security;
alter table public.site_security_admin_audit force row level security;
revoke all on public.site_security_admin_audit from public, anon, authenticated;
revoke all on public.site_security_admin_audit from service_role;
grant select, insert, delete on public.site_security_admin_audit to service_role;

create function public.enforce_site_security_audit_append_only()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'Security operations audit records are append-only';
  end if;

  if current_setting('app.security_audit_purge', true) = 'on'
     and old.created_at < now() - interval '365 days' then
    return old;
  end if;

  raise exception 'Security operations audit records may only be deleted by retention cleanup';
end;
$$;

create trigger site_security_admin_audit_append_only
before update or delete on public.site_security_admin_audit
for each row execute function public.enforce_site_security_audit_append_only();

revoke execute on function public.enforce_site_security_audit_append_only()
  from public, anon, authenticated;

create or replace function public.review_site_security_events(
  p_event_ids uuid[],
  p_review_status text,
  p_administrator_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_event_id uuid;
  v_previous_status text;
  v_updated integer := 0;
  v_event_count integer;
begin
  if p_event_ids is null
     or cardinality(p_event_ids) not between 1 and 50
     or array_position(p_event_ids, null) is not null
     or cardinality(p_event_ids) <> (
       select count(distinct ids.event_id) from unnest(p_event_ids) as ids(event_id)
     ) then
    raise exception 'Select between 1 and 50 unique security events';
  end if;
  if p_review_status is null
     or p_review_status not in ('new', 'reviewed', 'investigating', 'resolved', 'false_positive') then
    raise exception 'Invalid security event review status';
  end if;
  if p_administrator_id is null or not exists (
    select 1
    from public.user_roles roles
    where roles.user_id = p_administrator_id
      and roles.role = 'admin'
  ) then
    raise exception 'Administrator authorization required';
  end if;

  select count(*) into v_event_count
  from public.site_security_events events
  where events.id = any(p_event_ids);
  if v_event_count <> cardinality(p_event_ids) then
    raise exception 'One or more security events no longer exist';
  end if;

  foreach v_event_id in array p_event_ids loop
    select events.review_status into v_previous_status
    from public.site_security_events events
    where events.id = v_event_id
    for update;

    if v_previous_status is distinct from p_review_status then
      update public.site_security_events
      set review_status = p_review_status,
          reviewed_by = p_administrator_id,
          reviewed_at = now()
      where id = v_event_id;

      insert into public.site_security_admin_audit (
        administrator_id,
        event_id,
        action,
        visitor_id,
        previous_status,
        new_status
      )
      values (
        p_administrator_id,
        v_event_id,
        'event_review_status_changed',
        null,
        v_previous_status,
        p_review_status
      );
      v_updated := v_updated + 1;
    end if;
  end loop;

  return v_updated;
end;
$$;

revoke all on function public.review_site_security_events(uuid[], text, uuid)
  from public, anon, authenticated;
grant execute on function public.review_site_security_events(uuid[], text, uuid)
  to service_role;

create function public.review_site_security_visitor(
  p_visitor_id uuid,
  p_review_status text,
  p_administrator_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_previous_status text;
begin
  if p_visitor_id is null
     or p_review_status is null
     or p_review_status not in ('new', 'investigating', 'cleared') then
    raise exception 'Invalid visitor review status';
  end if;
  if p_administrator_id is null or not exists (
    select 1
    from public.user_roles roles
    where roles.user_id = p_administrator_id
      and roles.role = 'admin'
  ) then
    raise exception 'Administrator authorization required';
  end if;

  select visitors.review_status into v_previous_status
  from public.honeypot_visitors visitors
  where visitors.id = p_visitor_id
  for update;
  if not found then
    raise exception 'Visitor record no longer exists';
  end if;
  if v_previous_status = p_review_status then
    return false;
  end if;

  update public.honeypot_visitors
  set review_status = p_review_status,
      reviewed_by = p_administrator_id,
      reviewed_at = now()
  where id = p_visitor_id;

  insert into public.site_security_admin_audit (
    administrator_id,
    action,
    visitor_id,
    previous_status,
    new_status
  )
  values (
    p_administrator_id,
    'visitor_review_status_changed',
    p_visitor_id,
    v_previous_status,
    p_review_status
  );
  return true;
end;
$$;

revoke all on function public.review_site_security_visitor(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.review_site_security_visitor(uuid, text, uuid)
  to service_role;

create or replace function public.site_security_dashboard(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_step_seconds integer;
  v_step interval;
  v_dashboard jsonb;
begin
  if p_from is null or p_to is null
     or p_from >= p_to
     or p_to > now() + interval '1 minute'
     or p_from < p_to - interval '30 days' then
    raise exception 'Security dashboard range must be between 1 minute and 30 days';
  end if;

  v_step_seconds := greatest(
    60,
    ceil(extract(epoch from (p_to - p_from)) / 24)::integer
  );
  v_step := make_interval(secs => v_step_seconds);

  with filtered as materialized (
    select events.*
    from public.site_security_events events
    where events.last_seen >= p_from
      and events.last_seen < p_to
  ),
  buckets as (
    select generate_series(p_from, p_to - interval '1 microsecond', v_step) as bucket
  ),
  time_series as (
    select
      buckets.bucket,
      count(filtered.id)::bigint as event_count
    from buckets
    left join filtered
      on filtered.last_seen >= buckets.bucket
     and filtered.last_seen < buckets.bucket + v_step
    group by buckets.bucket
  )
  select jsonb_build_object(
    'totalEvents', (select count(*) from filtered),
    'last24Hours', (
      select count(*) from public.site_security_events
      where last_seen >= now() - interval '24 hours'
    ),
    'highRiskVisitors', (
      select count(distinct source_hash) from filtered where risk_score >= 9
    ),
    'criticalEvents', (
      select count(*) from filtered where severity = 'critical'
    ),
    'activeRestrictions', (
      select count(*) from public.honeypot_ip_restrictions
      where status = 'active'
    ),
    'failedAuthentication', (
      select count(*) from filtered where category = 'authentication'
    ),
    'suspiciousApiActivity', (
      select count(*) from filtered where category = 'api'
    ),
    'automatedTraffic', (
      select count(distinct events.id)
      from filtered events
      where events.signals ?| array['high_request_rate', 'repeated_endpoint', 'property_page_enumeration']
    ),
    'bySeverity', coalesce((
      select jsonb_object_agg(summary.severity, summary.event_count)
      from (
        select severity, count(*)::bigint as event_count
        from filtered
        group by severity
      ) summary
    ), '{}'::jsonb),
    'byCategory', coalesce((
      select jsonb_object_agg(summary.category, summary.event_count)
      from (
        select category, count(*)::bigint as event_count
        from filtered
        group by category
      ) summary
    ), '{}'::jsonb),
    'eventsOverTime', coalesce((
      select jsonb_agg(
        jsonb_build_object('bucket', series.bucket, 'event_count', series.event_count)
        order by series.bucket
      )
      from time_series series
    ), '[]'::jsonb),
    'recentHighRisk', coalesce((
      select jsonb_agg(to_jsonb(summary))
      from (
        select id, visitor_id, left(source_hash, 12) as source_id,
          category, event_type, severity, risk_score, route, last_seen
        from filtered
        where risk_score >= 9
        order by risk_score desc, last_seen desc
        limit 5
      ) summary
    ), '[]'::jsonb),
    'topRoutes', coalesce((
      select jsonb_agg(to_jsonb(summary))
      from (
        select route, count(*)::bigint as occurrence_count
        from filtered
        group by route
        order by count(*) desc, route
        limit 8
      ) summary
    ), '[]'::jsonb),
    'topSignals', coalesce((
      select jsonb_agg(to_jsonb(summary))
      from (
        select signals.value as signal, count(*)::bigint as occurrence_count
        from filtered events
        cross join lateral jsonb_array_elements_text(events.signals) as signals(value)
        group by signals.value
        order by count(*) desc, signals.value
        limit 8
      ) summary
    ), '[]'::jsonb),
    'riskDistribution', coalesce((
      select jsonb_object_agg(summary.band, summary.event_count)
      from (
        select band, count(*)::bigint as event_count
        from (
          select case
            when risk_score <= 5 then 'low'
            when risk_score <= 8 then 'medium'
            when risk_score <= 12 then 'high'
            else 'critical'
          end as band
          from filtered
        ) bands
        group by band
      ) summary
    ), '{}'::jsonb)
  ) into v_dashboard;

  return v_dashboard;
end;
$$;

revoke all on function public.site_security_dashboard(timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.site_security_dashboard(timestamptz, timestamptz)
  to service_role;

create or replace function public.purge_site_security_admin_audit()
returns bigint
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_deleted bigint;
begin
  perform set_config('app.security_audit_purge', 'on', true);
  delete from public.site_security_admin_audit
  where created_at < now() - interval '365 days';
  get diagnostics v_deleted = row_count;
  perform set_config('app.security_audit_purge', 'off', true);
  return v_deleted;
end;
$$;

revoke all on function public.purge_site_security_admin_audit()
  from public, anon, authenticated;
grant execute on function public.purge_site_security_admin_audit()
  to service_role;
