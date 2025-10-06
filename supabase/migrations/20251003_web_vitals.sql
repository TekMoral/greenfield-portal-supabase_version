-- Web Vitals storage schema for production ingestion
create table if not exists public.web_vitals (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  ts           timestamptz not null, -- when the metric was recorded on client
  env          text not null default 'development',
  path         text not null default '',
  metric_name  text not null, -- CLS, INP, LCP
  metric_id    text not null, -- web-vitals unique id
  value        double precision not null,
  delta        double precision,
  rating       text,
  ua           text,
  ip           text,
  raw          jsonb
);

-- Helpful indexes
create index if not exists web_vitals_ts_idx on public.web_vitals(ts);
create index if not exists web_vitals_metric_name_idx on public.web_vitals(metric_name);
create index if not exists web_vitals_path_idx on public.web_vitals(path);
create index if not exists web_vitals_env_idx on public.web_vitals(env);

-- Row Level Security policy (opt-in read via service role only by default)
alter table public.web_vitals enable row level security;

-- Deny all to anon/authenticated by default; allow with explicit policies or via Edge Function using service role
revoke all on public.web_vitals from anon, authenticated;

-- Optional housekeeping function to delete old data (e.g., keep 30 days)
create or replace function public.rpc_web_vitals_cleanup(p_older_than interval)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.web_vitals where ts < now() - coalesce(p_older_than, interval '30 days');
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

grant execute on function public.rpc_web_vitals_cleanup(interval) to service_role;
