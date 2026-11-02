begin;

select plan(61);

select ok(
  (
    select count(*) = 6
    from pg_class
    where relnamespace = 'public'::regnamespace
      and relname in (
        'honeypot_visitors',
        'honeypot_events',
        'honeypot_activity',
        'honeypot_ip_restrictions',
        'honeypot_admin_notes',
        'honeypot_admin_audit'
      )
      and relrowsecurity
      and relforcerowsecurity
  ),
  'all honeypot tables force row-level security'
);

select ok(
  (
    select relrowsecurity and relforcerowsecurity
    from pg_class
    where oid = 'public.site_security_events'::regclass
  ),
  'site security events force row-level security'
);

select ok(
  not exists (
    select 1
    from (values
      ('anon'),
      ('authenticated')
    ) as roles(role_name)
    cross join (values
      ('SELECT'),
      ('INSERT'),
      ('UPDATE'),
      ('DELETE'),
      ('TRUNCATE'),
      ('REFERENCES'),
      ('TRIGGER')
    ) as privileges(privilege)
    where has_table_privilege(
      roles.role_name,
      'public.site_security_events',
      privileges.privilege
    )
  ),
  'public and authenticated clients cannot access site security events'
);

select ok(
  has_table_privilege('service_role', 'public.site_security_events', 'SELECT')
  and has_table_privilege('service_role', 'public.site_security_events', 'INSERT')
  and has_table_privilege('service_role', 'public.site_security_events', 'UPDATE')
  and has_table_privilege('service_role', 'public.site_security_events', 'DELETE')
  and not has_table_privilege('service_role', 'public.site_security_events', 'TRUNCATE'),
  'service role can operate the monitoring table without truncate'
);

select ok(
  (
    select count(*) = 3 and bool_and(not prosecdef)
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in (
        'record_site_security_event',
        'site_security_overview',
        'purge_site_security_events'
      )
  ),
  'site security RPC functions run as invokers'
);

select ok(
  (
    select count(*) = 3
    from pg_proc functions
    where functions.pronamespace = 'public'::regnamespace
      and functions.proname in (
        'record_site_security_event',
        'site_security_overview',
        'purge_site_security_events'
      )
      and has_function_privilege('service_role', functions.oid, 'EXECUTE')
      and not has_function_privilege('anon', functions.oid, 'EXECUTE')
      and not has_function_privilege('authenticated', functions.oid, 'EXECUTE')
  ),
  'only the service role can execute the site security RPC functions'
);

select throws_ok(
  $$
    select public.record_site_security_event(
      null, 'abnormal_request_frequency', repeat('a', 64), 200, 30, 'GET', 5,
      '/', 'low', '["high_request_rate","multi_endpoint_burst"]'::jsonb,
      repeat('b', 64), to_timestamp(floor(extract(epoch from now()) / 600) * 600),
      gen_random_uuid()
    )
  $$,
  'P0001',
  'Invalid security event category',
  'site security RPC rejects a null category'
);

select throws_ok(
  $$
    select public.record_site_security_event(
      'traffic', 'abnormal_request_frequency', repeat('c', 64), 200, null, 'GET', 5,
      '/', 'low', '["high_request_rate","multi_endpoint_burst"]'::jsonb,
      repeat('d', 64), to_timestamp(floor(extract(epoch from now()) / 600) * 600),
      gen_random_uuid()
    )
  $$,
  'P0001',
  'Invalid observed security request count',
  'site security RPC rejects a null request count'
);

select throws_ok(
  $$
    select public.record_site_security_event(
      'traffic', 'abnormal_request_frequency', repeat('e', 64), 200, 30, 'GET', 5,
      '/', 'low', '["unknown_signal"]'::jsonb,
      repeat('f', 64), to_timestamp(floor(extract(epoch from now()) / 600) * 600),
      gen_random_uuid()
    )
  $$,
  'P0001',
  'Invalid security event signals',
  'site security RPC rejects unknown signal values'
);

select lives_ok(
  $$
    select public.record_site_security_event(
      'traffic', 'abnormal_request_frequency', repeat('1', 64), 200, 30, 'GET', 5,
      '/', 'low', '["high_request_rate","multi_endpoint_burst"]'::jsonb,
      repeat('2', 64), to_timestamp(floor(extract(epoch from now()) / 600) * 600),
      gen_random_uuid()
    )
  $$,
  'site security RPC accepts valid signals and a bounded observed request count'
);

select is(
  (
    select observed_requests::integer
    from public.site_security_events
    where dedupe_key = repeat('1', 64)
  ),
  30,
  'site security RPC stores the observed request sample count'
);

select ok(
  to_regclass('public.honeypot_one_live_restriction_per_ip_idx') is not null,
  'an IP cannot have multiple pending or active honeypot restrictions'
);

select ok(
  (select rolbypassrls from pg_roles where rolname = 'service_role'),
  'Supabase service role bypasses forced RLS for security-invoker worker RPCs'
);

select ok(
  not exists (
    select 1
    from (values
      ('honeypot_visitors'),
      ('honeypot_events'),
      ('honeypot_activity'),
      ('honeypot_ip_restrictions'),
      ('honeypot_admin_notes'),
      ('honeypot_admin_audit')
    ) as tables(table_name)
    cross join (values
      ('SELECT'),
      ('INSERT'),
      ('UPDATE'),
      ('DELETE'),
      ('TRUNCATE'),
      ('REFERENCES'),
      ('TRIGGER')
    ) as privileges(privilege)
    where has_table_privilege('anon', 'public.' || tables.table_name, privileges.privilege)
  ),
  'anon has no honeypot table privileges'
);

select ok(
  not exists (
    select 1
    from (values
      ('honeypot_visitors'),
      ('honeypot_events'),
      ('honeypot_activity'),
      ('honeypot_ip_restrictions'),
      ('honeypot_admin_notes'),
      ('honeypot_admin_audit')
    ) as tables(table_name)
    cross join (values
      ('SELECT'),
      ('INSERT'),
      ('UPDATE'),
      ('DELETE'),
      ('TRUNCATE'),
      ('REFERENCES'),
      ('TRIGGER')
    ) as privileges(privilege)
    where has_table_privilege('authenticated', 'public.' || tables.table_name, privileges.privilege)
  ),
  'authenticated has no honeypot table privileges'
);

select ok(
  has_table_privilege('service_role', 'public.honeypot_admin_audit', 'SELECT')
  and has_table_privilege('service_role', 'public.honeypot_admin_audit', 'INSERT')
  and has_table_privilege('service_role', 'public.honeypot_admin_audit', 'DELETE')
  and not has_table_privilege('service_role', 'public.honeypot_admin_audit', 'UPDATE')
  and not has_table_privilege('service_role', 'public.honeypot_admin_audit', 'TRUNCATE'),
  'service role can read, append, and retention-delete audit rows but cannot edit or truncate them'
);

select ok(
  not exists (
    select 1
    from pg_proc functions
    where functions.pronamespace = 'public'::regnamespace
      and functions.proname in (
        'record_honeypot_detection',
        'purge_honeypot_data',
        'honeypot_hourly_volume',
        'honeypot_hosts_match_zone'
      )
      and has_function_privilege('anon', functions.oid, 'EXECUTE')
  ),
  'anon cannot execute honeypot RPCs'
);

select ok(
  not exists (
    select 1
    from pg_proc functions
    where functions.pronamespace = 'public'::regnamespace
      and functions.proname in (
        'record_honeypot_detection',
        'purge_honeypot_data',
        'honeypot_hourly_volume',
        'honeypot_hosts_match_zone'
      )
      and has_function_privilege('authenticated', functions.oid, 'EXECUTE')
  ),
  'authenticated cannot execute honeypot RPCs'
);

select ok(
  (
    select count(*) = 4
    from pg_proc functions
    where functions.pronamespace = 'public'::regnamespace
      and functions.proname in (
        'record_honeypot_detection',
        'purge_honeypot_data',
        'honeypot_hourly_volume',
        'honeypot_hosts_match_zone'
      )
      and has_function_privilege('service_role', functions.oid, 'EXECUTE')
  ),
  'service role can execute every honeypot RPC'
);

select ok(
  (
    select count(*) = 4
    from pg_proc functions
    where functions.pronamespace = 'public'::regnamespace
      and functions.proname in (
        'record_honeypot_detection',
        'purge_honeypot_data',
        'honeypot_hourly_volume',
        'honeypot_hosts_match_zone'
      )
      and not functions.prosecdef
  ),
  'all honeypot RPCs run as security invoker'
);

select ok(
  (
    select count(*) = 2
    from pg_constraint
    where contype = 'f'
      and conname in (
        'honeypot_activity_event_visitor_fkey',
        'honeypot_admin_notes_event_visitor_fkey'
      )
  ),
  'activity and notes enforce that referenced events belong to the same visitor'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.honeypot_admin_audit'::regclass
      and tgname = 'honeypot_audit_append_only'
      and tgenabled <> 'D'
  ),
  'append-only audit trigger is enabled'
);

create function pg_temp.honeypot_test_record(
  p_source_hash text default repeat('a', 64),
  p_ip_address inet default '203.0.113.10'::inet,
  p_country text default null,
  p_metadata_sources jsonb default '{}'::jsonb,
  p_hostname text default 'app.example.com'
)
returns table (visitor_id uuid, event_id uuid, request_count integer)
language sql
as $$
  select *
  from public.record_honeypot_detection(
    p_source_hash => p_source_hash,
    p_ip_address => p_ip_address,
    p_country => p_country,
    p_country_code => case when p_country is null then null else 'EX' end,
    p_city => null,
    p_region => null,
    p_operating_system => null,
    p_browser => null,
    p_browser_version => null,
    p_device_type => null,
    p_asn => null,
    p_as_organization => null,
    p_hosting_classification => null,
    p_user_agent => null,
    p_metadata_sources => p_metadata_sources,
    p_is_trusted => false,
    p_detection_reason => 'Decoy credentials resource requested',
    p_hostname => p_hostname,
    p_endpoint => '/passwords.json',
    p_request_method => 'GET',
    p_referrer => null
  );
$$;

create temporary table honeypot_test_fixture as
select *
from pg_temp.honeypot_test_record(
  p_country => 'Exampleland',
  p_metadata_sources => '{"country":"Cloudflare request metadata"}'::jsonb
);

select is(
  (select request_count from honeypot_test_fixture),
  1,
  'first recorded event reports one request'
);

do $$
declare
  v_iteration integer;
begin
  for v_iteration in 1..3 loop
    perform *
    from pg_temp.honeypot_test_record(
      p_country => null,
      p_metadata_sources => '{}'::jsonb
    );
  end loop;
end;
$$;

select is(
  (select request_count from public.honeypot_visitors where id = (select visitor_id from honeypot_test_fixture)),
  4,
  'request count includes every repeat event'
);

select is(
  (
    select count(*)::integer
    from public.honeypot_events
    where visitor_id = (select visitor_id from honeypot_test_fixture)
      and detection_reason like '%High-frequency repeat access'
  ),
  1,
  'four requests within ten minutes include the current hit in the frequency threshold'
);

select is(
  (select country from public.honeypot_visitors where id = (select visitor_id from honeypot_test_fixture)),
  null::text,
  'unavailable latest country does not retain stale metadata'
);

select is(
  (select metadata_sources from public.honeypot_visitors where id = (select visitor_id from honeypot_test_fixture)),
  '{}'::jsonb,
  'metadata source map represents the latest snapshot only'
);

select ok(
  public.honeypot_hosts_match_zone((select visitor_id from honeypot_test_fixture), 'example.com'),
  'valid zone hostname matches its recorded subdomain'
);

select is(
  public.honeypot_hosts_match_zone((select visitor_id from honeypot_test_fixture), 'bad..example.com'),
  false,
  'malformed configured zone hostname never matches'
);

select throws_ok(
  $$select * from pg_temp.honeypot_test_record(p_ip_address => '203.0.113.11'::inet)$$,
  'P0001',
  'Honeypot source hash does not match the recorded IP address',
  'a source hash cannot be reused for a different IP'
);

select throws_ok(
  $$select * from pg_temp.honeypot_test_record(p_metadata_sources => '[]'::jsonb)$$,
  'P0001',
  'Invalid honeypot metadata source map',
  'metadata RPC input must be a JSON object'
);

select throws_ok(
  $$select * from pg_temp.honeypot_test_record(p_hostname => 'bad..example.com')$$,
  'P0001',
  'Invalid honeypot event',
  'malformed request hostnames are rejected'
);

select throws_ok(
  $$
    insert into public.honeypot_admin_audit (visitor_id, event_id, action)
    select gen_random_uuid(), event_id, 'event_status_changed'
    from honeypot_test_fixture
  $$,
  'P0001',
  'Audit event does not belong to the specified visitor',
  'audit event references must match their visitor'
);

create temporary table honeypot_test_audit_fixture (id uuid);

with new_audit as (
  insert into public.honeypot_admin_audit (visitor_id, action)
  select visitor_id, 'event_status_changed'
  from honeypot_test_fixture
  returning id
)
insert into honeypot_test_audit_fixture (id)
select id from new_audit;

select throws_ok(
  $$
    update public.honeypot_admin_audit
    set outcome = 'failed'
    where id = (select id from honeypot_test_audit_fixture)
  $$,
  'P0001',
  'Honeypot audit records are append-only',
  'audit rows cannot be updated'
);

insert into public.honeypot_admin_notes (
  visitor_id, event_id, administrator_id, note, created_at
)
select visitor_id, event_id, gen_random_uuid(), 'Expired test note', now() - interval '91 days'
from honeypot_test_fixture;

insert into public.honeypot_admin_audit (
  visitor_id, event_id, action, created_at
)
select visitor_id, event_id, 'retention_purge', now() - interval '366 days'
from honeypot_test_fixture;

insert into public.honeypot_visitors (source_hash, ip_address)
values (repeat('c', 64), '203.0.113.10'::inet);

insert into public.honeypot_ip_restrictions (
  visitor_id, ip_address, cloudflare_rule_id, status, duration, reason,
  administrator_id, created_at, updated_at
)
select visitor_id, '203.0.113.10'::inet, 'honeypot-test-active-rule', 'active',
  'permanent', 'Test retention', gen_random_uuid(), now() - interval '400 days',
  now() - interval '400 days'
from honeypot_test_fixture;

do $$
begin
  insert into public.honeypot_ip_restrictions (
    visitor_id, ip_address, cloudflare_rule_id, status, duration, reason, administrator_id
  )
  select id, '203.0.113.10'::inet, 'honeypot-test-duplicate-rule', 'active',
    'permanent', 'Duplicate test', gen_random_uuid()
  from public.honeypot_visitors
  where source_hash = repeat('c', 64);
exception
  when unique_violation then null;
end;
$$;

select ok(
  not exists (
    select 1
    from public.honeypot_ip_restrictions
    where cloudflare_rule_id = 'honeypot-test-duplicate-rule'
  ),
  'a different visitor record cannot create a duplicate live restriction for the same IP'
);

insert into public.honeypot_ip_restrictions (
  visitor_id, ip_address, cloudflare_rule_id, status, duration, reason,
  administrator_id, created_at, expires_at, released_at, updated_at
)
select visitor_id, '203.0.113.10'::inet, 'honeypot-test-expired-rule', 'expired',
  '1_hour', 'Test retention', gen_random_uuid(), now() - interval '400 days',
  now() - interval '400 days', now() - interval '400 days', now() - interval '400 days'
from honeypot_test_fixture;

update public.honeypot_visitors
set last_seen = now() - interval '91 days'
where id = (select visitor_id from honeypot_test_fixture);

update public.honeypot_events
set detected_at = now() - interval '91 days'
where visitor_id = (select visitor_id from honeypot_test_fixture);

do $$
begin
  perform public.purge_honeypot_data();
end;
$$;

select ok(
  (
    select ip_address is null and identity_purged_at is not null
    from public.honeypot_visitors
    where id = (select visitor_id from honeypot_test_fixture)
  ),
  'aged restricted visitors retain only a scrubbed source record'
);

select is(
  (
    select ip_address
    from public.honeypot_ip_restrictions
    where cloudflare_rule_id = 'honeypot-test-active-rule'
  ),
  '203.0.113.10'::inet,
  'IP is retained only on the active restriction needed for enforcement'
);

select is(
  (
    select count(*)::integer
    from public.honeypot_events
    where visitor_id = (select visitor_id from honeypot_test_fixture)
  ),
  0,
  'events older than 90 days are removed'
);

select is(
  (
    select count(*)::integer
    from public.honeypot_admin_notes
    where visitor_id = (select visitor_id from honeypot_test_fixture)
  ),
  0,
  'notes older than 90 days are removed'
);

select is(
  (
    select count(*)::integer
    from public.honeypot_ip_restrictions
    where cloudflare_rule_id = 'honeypot-test-expired-rule'
  ),
  0,
  'inactive restriction records older than 365 days are removed'
);

select is(
  (
    select count(*)::integer
    from public.honeypot_admin_audit
    where action = 'retention_purge'
      and created_at < now() - interval '365 days'
  ),
  0,
  'audit rows older than 365 days are removed'
);

select ok(
  (
    select relrowsecurity and relforcerowsecurity
    from pg_class
    where oid = 'public.site_security_admin_audit'::regclass
  ),
  'site security audit history forces row-level security'
);

select ok(
  not exists (
    select 1
    from (values ('anon'), ('authenticated')) as roles(role_name)
    cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as privileges(privilege)
    where has_table_privilege(
      roles.role_name,
      'public.site_security_admin_audit',
      privileges.privilege
    )
  ),
  'public and authenticated clients cannot access site security audit history'
);

select ok(
  has_table_privilege('service_role', 'public.site_security_admin_audit', 'SELECT')
  and has_table_privilege('service_role', 'public.site_security_admin_audit', 'INSERT')
  and has_table_privilege('service_role', 'public.site_security_admin_audit', 'DELETE')
  and not has_table_privilege('service_role', 'public.site_security_admin_audit', 'UPDATE')
  and not has_table_privilege('service_role', 'public.site_security_admin_audit', 'TRUNCATE'),
  'service role can append and read audit history without update or truncate access'
);

select is(
  (
    select column_default
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_security_events'
      and column_name = 'review_status'
  ),
  '''new''::text',
  'new security events begin in the new review state'
);

select ok(
  (
    select count(*) = 4 and bool_and(not prosecdef)
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in (
        'review_site_security_events',
        'review_site_security_visitor',
        'site_security_dashboard',
        'purge_site_security_admin_audit'
      )
  ),
  'security review, dashboard, and audit retention RPCs run as invokers'
);

select ok(
  (
    select count(*) = 4
    from pg_proc functions
    where functions.pronamespace = 'public'::regnamespace
      and functions.proname in (
        'review_site_security_events',
        'review_site_security_visitor',
        'site_security_dashboard',
        'purge_site_security_admin_audit'
      )
      and has_function_privilege('service_role', functions.oid, 'EXECUTE')
      and not has_function_privilege('anon', functions.oid, 'EXECUTE')
      and not has_function_privilege('authenticated', functions.oid, 'EXECUTE')
  ),
  'only service role can execute the security operations RPCs'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.site_security_admin_audit'::regclass
      and tgname = 'site_security_admin_audit_append_only'
      and tgenabled <> 'D'
  ),
  'site security audit append-only trigger is enabled'
);

select throws_ok(
  $$select public.site_security_dashboard(null, now())$$,
  'P0001',
  'Security dashboard range must be between 1 minute and 30 days',
  'dashboard rejects a null time-range boundary'
);

select throws_ok(
  $$
    select public.review_site_security_events(
      array[gen_random_uuid()],
      'invalid',
      gen_random_uuid()
    )
  $$,
  'P0001',
  'Invalid security event review status',
  'event review RPC rejects unsupported review states'
);

select is(
  (
    select column_default
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'honeypot_visitors'
      and column_name = 'review_status'
  ),
  '''new''::text',
  'visitors begin in the new review state'
);

select throws_ok(
  $$
    select public.review_site_security_visitor(
      gen_random_uuid(),
      'malicious',
      gen_random_uuid()
    )
  $$,
  'P0001',
  'Invalid visitor review status',
  'visitor review RPC rejects unsupported review states'
);

select has_column(
  'public',
  'honeypot_ip_restrictions',
  'enforcement_mode',
  'IP restriction records identify the enforcement method'
);

select is(
  (
    select column_default
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'honeypot_ip_restrictions'
      and column_name = 'enforcement_mode'
  ),
  '''cloudflare_zone''::text',
  'existing and new restrictions default to Cloudflare zone enforcement'
);

select lives_ok(
  $$
    with visitor as (
      insert into public.honeypot_visitors (source_hash, ip_address)
      values (repeat('d', 64), '203.0.113.12'::inet)
      returning id
    )
    insert into public.honeypot_ip_restrictions (
      visitor_id,
      ip_address,
      status,
      duration,
      reason,
      administrator_id,
      enforcement_mode
    )
    select
      visitor.id,
      '203.0.113.12'::inet,
      'active',
      'permanent',
      'Worker-only test restriction',
      gen_random_uuid(),
      'worker_only'
    from visitor
  $$,
  'an active worker-only restriction can be stored without a Cloudflare rule'
);

select ok(
  exists (
    select 1
    from public.honeypot_ip_restrictions
    where ip_address = '203.0.113.12'::inet
      and status = 'active'
      and enforcement_mode = 'worker_only'
      and cloudflare_rule_id is null
  ),
  'worker-only restriction is represented without a fabricated Cloudflare rule'
);

select lives_ok(
  $$
    insert into public.site_security_events (
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
      first_seen,
      last_seen,
      created_at
    )
    values (
      repeat('a', 64),
      'traffic',
      'recent_activity_test',
      'low',
      4,
      'GET',
      '/',
      404,
      '["client_error_burst"]'::jsonb,
      gen_random_uuid(),
      repeat('9', 64),
      now() - interval '30 seconds',
      now() - interval '30 seconds',
      now() - interval '30 seconds',
      now() - interval '3 days'
    )
  $$,
  'security dashboard test event can be inserted'
);

select is(
  (
    public.site_security_dashboard(
      now() - interval '31 seconds',
      now() - interval '29 seconds'
    )->>'totalEvents'
  )::integer,
  1,
  'security dashboard includes an older episode with activity in the selected range'
);

select is(
  (
    select sum((bucket.value->>'event_count')::integer)::integer
    from jsonb_array_elements(
      public.site_security_dashboard(
        now() - interval '31 seconds',
        now() - interval '29 seconds'
      )->'eventsOverTime'
    ) as bucket(value)
  ),
  1,
  'security dashboard time series uses the latest activity timestamp'
);

insert into public.site_security_admin_audit (
  id, action, previous_status, new_status
)
values (
  '00000000-0000-4000-8000-000000000051',
  'event_review_status_changed',
  'new',
  'reviewed'
);

select throws_ok(
  $$
    update public.site_security_admin_audit
    set new_status = 'resolved'
    where id = '00000000-0000-4000-8000-000000000051'
  $$,
  'P0001',
  'Security operations audit records are append-only',
  'site security audit rows cannot be updated'
);

select throws_ok(
  $$
    delete from public.site_security_admin_audit
    where id = '00000000-0000-4000-8000-000000000051'
  $$,
  'P0001',
  'Security operations audit records may only be deleted by retention cleanup',
  'site security audit rows cannot be deleted outside retention cleanup'
);

select * from finish();
rollback;
