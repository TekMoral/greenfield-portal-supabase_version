-- Migration: Create SECURITY DEFINER RPC to fetch current user's profile bypassing RLS safely
-- Run with Supabase CLI or deploy migrations to your project

-- Ensure schema search_path
set search_path = public;

-- Function returns the caller's profile row
create or replace function public.rpc_get_current_profile()
returns public.user_profiles
language sql
security definer
set search_path = public
as $$
  select up.*
  from public.user_profiles up
  where up.id = auth.uid();
$$;

-- Grant execute to authenticated users only
revoke all on function public.rpc_get_current_profile() from public;
grant execute on function public.rpc_get_current_profile() to authenticated;

-- Optional: allow anon to call (will return null since auth.uid() is null)
-- grant execute on function public.rpc_get_current_profile() to anon;
