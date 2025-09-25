-- Migration: Create SECURITY DEFINER RPC to clear require_password_change for current user
set search_path = public;

create or replace function public.rpc_clear_require_password_change()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_profiles
     set require_password_change = false,
         updated_at = now()
   where id = auth.uid();

  return true;
end;
$$;

revoke all on function public.rpc_clear_require_password_change() from public;
grant execute on function public.rpc_clear_require_password_change() to authenticated;
