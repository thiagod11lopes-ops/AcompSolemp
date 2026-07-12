-- Cole TUDO isto no SQL Editor e clique em Run (uma vez)
-- Corrige "permission denied for table profiles/tenants/..."

grant usage on schema public to anon, authenticated, service_role;

grant all on table public.tenants to service_role;
grant all on table public.app_state to service_role;
grant all on table public.profiles to service_role;
grant all on table public.email_access to service_role;

grant select, insert, update, delete on table public.tenants to authenticated;
grant select, insert, update, delete on table public.app_state to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.email_access to authenticated;

grant select on table public.tenants to anon;
grant select on table public.email_access to anon;

grant execute on function public.current_tenant_id() to anon, authenticated, service_role;
grant execute on function public.lookup_email_access(text) to anon, authenticated, service_role;
