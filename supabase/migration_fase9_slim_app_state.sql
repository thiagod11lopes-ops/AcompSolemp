-- Fase 9 — Enxuga app_state.payload removendo domínios já normalizados.
-- Mantém: credenciais, consumoPlanilha, planilhasLivres, medicamentosPrecos,
-- pedidosExcluidosIds, tenantMeta e chaves vazias de compatibilidade.
-- Execute no SQL Editor (idempotente). Faça backup (Fase 0) antes.

do $$
begin
  if to_regclass('public.app_state_backup') is not null then
    insert into public.app_state_backup (tenant_id, version, payload, source_updated_at, note)
    select tenant_id, version, payload, updated_at, 'fase9-pre-slim'
    from public.app_state;
  end if;
end $$;

update public.app_state
set
  payload = (
    jsonb_build_object(
      'usuarios', '[]'::jsonb,
      'clinicas', '[]'::jsonb,
      'empresas', '[]'::jsonb,
      'materiais', '[]'::jsonb,
      'workflowEtapas', '[]'::jsonb,
      'pedidos', '[]'::jsonb,
      'solemp', '[]'::jsonb,
      'notasFiscais', '[]'::jsonb,
      'historico', '[]'::jsonb,
      'arquivos', '[]'::jsonb,
      'notificacoes', '[]'::jsonb,
      'reversoes', '[]'::jsonb,
      'credenciais', coalesce(payload->'credenciais', '{}'::jsonb),
      'consumoPlanilha', coalesce(payload->'consumoPlanilha', '{}'::jsonb),
      'planilhasLivres', coalesce(payload->'planilhasLivres', '{}'::jsonb),
      'medicamentosPrecos', coalesce(payload->'medicamentosPrecos', '[]'::jsonb),
      'pedidoPlanilhaEnvio', '{}'::jsonb,
      'planilhaAnexosPorPedido', '{}'::jsonb,
      'processosArquivados', '[]'::jsonb,
      'pedidosExcluidosIds', coalesce(payload->'pedidosExcluidosIds', '[]'::jsonb),
      'chatMensagens', '[]'::jsonb,
      'tenantMeta', coalesce(payload->'tenantMeta', 'null'::jsonb)
    )
  ),
  updated_at = now();
