-- Postgres-backed rate limiting infrastructure
-- Creates a counters table and an atomic SECURITY DEFINER RPC used by Edge Functions

-- 1) Counters table (windowed by interval)
create table if not exists public.rate_limit_counters (
  bucket      text    not null,
  identity    text    not null,
  window_id   bigint  not null,
  count       integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (bucket, identity, window_id)
);

-- Helpful index for cleanup/inspection (optional)
create index if not exists rate_limit_counters_updated_at_idx
  on public.rate_limit_counters(updated_at);

-- 2) Atomic RPC to increment and check rate limit
-- Returns a single row with { allowed, remaining, limit, reset_ms }
create or replace function public.rpc_rate_limit_check(
  p_bucket       text,
  p_identity     text,
  p_max          integer,
  p_interval_ms  integer
)
returns table (
  allowed    boolean,
  remaining  integer,
  max_limit      integer,
  reset_ms   integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now_ms        bigint := floor(extract(epoch from now()) * 1000);
  v_window_id     bigint := floor(v_now_ms / p_interval_ms);
  v_next_window   bigint := (v_window_id + 1) * p_interval_ms;
  v_reset_ms      integer := greatest(0, v_next_window - v_now_ms);
  v_count         integer;
begin
  -- Guardrails
  if p_max is null or p_max <= 0 then
    -- If max is invalid, allow once (treat as 1 per window)
    p_max := 1;
  end if;
  if p_interval_ms is null or p_interval_ms <= 0 then
    p_interval_ms := 60000; -- default 60s
  end if;

  insert into public.rate_limit_counters as rlc(bucket, identity, window_id, count, updated_at)
  values (p_bucket, p_identity, v_window_id, 1, now())
  on conflict (bucket, identity, window_id)
  do update set count = rlc.count + 1, updated_at = now()
  returning rlc.count into v_count;

  allowed   := v_count <= p_max;
  remaining := greatest(0, p_max - v_count);
  max_limit     := p_max;
  reset_ms  := v_reset_ms;

  return next;
end;
$$;

-- 3) Permissions: allow invocation from anon/authenticated (logic enforced inside function)
grant execute on function public.rpc_rate_limit_check(text, text, integer, integer) to anon, authenticated;

-- Note: Consider a periodic cleanup job for old windows, e.g. keep last N days.
-- Example (manual): delete from public.rate_limit_counters where updated_at < now() - interval '7 days';
