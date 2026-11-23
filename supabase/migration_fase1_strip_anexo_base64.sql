-- Fase 1 — Remove conteudoBase64 do payload quando já existe storagePath.
-- Execute no SQL Editor do Supabase (idempotente).
-- NÃO apaga anexos sem storagePath (legado); o app deixa de gravar base64 novo na nuvem.
-- app_state_backup não tem unicidade em (tenant_id, note); o snapshot da fase 1
-- só é inserido quando o tenant ainda não possui note = fase1-pre-strip-base64.
-- app_state só é atualizado quando o payload transformado difere do atual.

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
    from public.app_state s
    where not exists (
      select 1
      from public.app_state_backup b
      where b.tenant_id = s.tenant_id
        and b.note = 'fase1-pre-strip-base64'
    );
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
  payload = transformed.payload,
  updated_at = now()
from (
  select
    src.tenant_id,
    jsonb_set(
      jsonb_set(
        jsonb_set(
          src.payload,
          '{arquivos}',
          public._strip_anexo_base64_array(coalesce(src.payload->'arquivos', '[]'::jsonb))
        ),
        '{planilhaAnexosPorPedido}',
        coalesce(
          (
            select jsonb_object_agg(key, public._strip_anexo_base64_array(value))
            from jsonb_each(coalesce(src.payload->'planilhaAnexosPorPedido', '{}'::jsonb))
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
          from jsonb_each(coalesce(src.payload->'pedidoPlanilhaEnvio', '{}'::jsonb))
        ),
        '{}'::jsonb
      )
    ) as payload
  from public.app_state src
) transformed
where s.tenant_id = transformed.tenant_id
  and s.payload is distinct from transformed.payload;

drop function if exists public._strip_anexo_base64_array(jsonb);
