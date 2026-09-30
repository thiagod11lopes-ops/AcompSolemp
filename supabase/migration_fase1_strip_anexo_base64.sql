-- Fase 1 — Remove conteudoBase64 do payload quando já existe storagePath.
-- Execute no SQL Editor do Supabase (idempotente).
-- NÃO apaga anexos sem storagePath (legado); o app deixa de gravar base64 novo na nuvem.

do $$
begin
  if to_regclass('public.app_state_backup') is not null then
    insert into public.app_state_backup (tenant_id, version, payload, source_updated_at, note)
    select
      s.tenant_id,
      s.version,
      s.payload,
      s.updated_at,
      'fase1-pre-strip-base64'
    from public.app_state s;
  end if;
end $$;

create or replace function public._strip_anexo_base64_array(arr jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    (
      select jsonb_agg(
        case
          when elem ? 'storagePath'
            and nullif(elem->>'storagePath', '') is not null
            and elem ? 'conteudoBase64'
          then elem - 'conteudoBase64'
          else elem
        end
      )
      from jsonb_array_elements(coalesce(arr, '[]'::jsonb)) as elem
    ),
    '[]'::jsonb
  );
$$;

update public.app_state s
set
  payload = (
    jsonb_set(
      jsonb_set(
        jsonb_set(
          s.payload,
          '{arquivos}',
          public._strip_anexo_base64_array(coalesce(s.payload->'arquivos', '[]'::jsonb))
        ),
        '{planilhaAnexosPorPedido}',
        coalesce(
          (
            select jsonb_object_agg(key, public._strip_anexo_base64_array(value))
            from jsonb_each(coalesce(s.payload->'planilhaAnexosPorPedido', '{}'::jsonb))
          ),
          '{}'::jsonb
        )
      ),
      '{pedidoPlanilhaEnvio}',
      coalesce(
        (
          select jsonb_object_agg(
            key,
            case
              when jsonb_typeof(value) = 'object' and value ? 'anexos' then jsonb_set(
                value,
                '{anexos}',
                public._strip_anexo_base64_array(coalesce(value->'anexos', '[]'::jsonb))
              )
              else value
            end
          )
          from jsonb_each(coalesce(s.payload->'pedidoPlanilhaEnvio', '{}'::jsonb))
        ),
        '{}'::jsonb
      )
    )
  ),
  updated_at = now();

drop function if exists public._strip_anexo_base64_array(jsonb);
