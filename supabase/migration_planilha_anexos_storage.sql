-- Bucket para arquivos anexados no envio de planilha (timeline).
-- Cole no SQL Editor do Supabase e execute uma vez.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'planilha-anexos',
  'planilha-anexos',
  false,
  20971520,
  null
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit;

drop policy if exists "planilha_anexos_select_authenticated" on storage.objects;
drop policy if exists "planilha_anexos_insert_authenticated" on storage.objects;
drop policy if exists "planilha_anexos_update_authenticated" on storage.objects;
drop policy if exists "planilha_anexos_delete_authenticated" on storage.objects;

create policy "planilha_anexos_select_authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'planilha-anexos');

create policy "planilha_anexos_insert_authenticated"
on storage.objects for insert
to authenticated
with check (bucket_id = 'planilha-anexos');

create policy "planilha_anexos_update_authenticated"
on storage.objects for update
to authenticated
using (bucket_id = 'planilha-anexos')
with check (bucket_id = 'planilha-anexos');

create policy "planilha_anexos_delete_authenticated"
on storage.objects for delete
to authenticated
using (bucket_id = 'planilha-anexos');

-- Garante privilégios no schema storage para o papel authenticated.
grant usage on schema storage to authenticated;
grant all on all tables in schema storage to authenticated;
