import type { ListaMedicamentosFormData, ListaMedicamentosLinha } from '@/types'
import { formatImhUppercase } from '@/utils/imhAbaForm'
import { formatPrecoReferenciaMedicamento } from '@/utils/medicamentosPrecos'
import type { MedicamentoPrecoRow } from '@/utils/medicamentosPrecos'

export function createEmptyListaMedicamentosLinha(): ListaMedicamentosLinha {
  return {
    id: `lista-med-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    neb: '',
    medicamento: '',
    uf: '',
    precoReferencia: '',
  }
}

export const EMPTY_LISTA_MEDICAMENTOS_FORM: ListaMedicamentosFormData = {
  linhas: [],
}

export const LISTA_MEDICAMENTOS_COLUNAS = [
  { key: 'neb', label: 'NEB', width: 120 },
  { key: 'medicamento', label: 'Medicamento', width: 420 },
  { key: 'uf', label: 'UF', width: 64 },
  { key: 'precoReferencia', label: 'Preço referência 2026', width: 150 },
] as const

export type ListaMedicamentosColunaKey = (typeof LISTA_MEDICAMENTOS_COLUNAS)[number]['key']

export function linhaListaMedicamentosHasContent(linha: ListaMedicamentosLinha): boolean {
  return Boolean(
    linha.neb.trim() ||
      linha.medicamento.trim() ||
      linha.uf.trim() ||
      linha.precoReferencia.trim(),
  )
}

export function withNormalizedListaMedicamentosLinha(
  linha: ListaMedicamentosLinha,
): ListaMedicamentosLinha {
  return {
    ...linha,
    neb: linha.neb.trim(),
    medicamento: linha.medicamento.trim(),
    uf: formatImhUppercase(linha.uf).trim(),
    precoReferencia:
      formatPrecoReferenciaMedicamento(linha.precoReferencia) || linha.precoReferencia.trim(),
  }
}

export function normalizeListaMedicamentosForm(
  value: ListaMedicamentosFormData | undefined,
): ListaMedicamentosFormData {
  const linhasRaw = Array.isArray(value?.linhas) ? value.linhas : []
  return {
    linhas: linhasRaw
      .filter((item) => item && typeof item === 'object')
      .map((item) =>
        withNormalizedListaMedicamentosLinha({
          id: item.id || createEmptyListaMedicamentosLinha().id,
          neb: item.neb ?? '',
          medicamento: item.medicamento ?? '',
          uf: item.uf ?? '',
          precoReferencia: item.precoReferencia ?? '',
        }),
      )
      .filter((linha) => linhaListaMedicamentosHasContent(linha)),
  }
}

export function listaMedicamentosHasPreviewContent(value: ListaMedicamentosFormData): boolean {
  return value.linhas.length > 0
}

export function listaMedicamentosToPrecosRows(
  value: ListaMedicamentosFormData,
): MedicamentoPrecoRow[] {
  return normalizeListaMedicamentosForm(value).linhas.map((linha) => ({
    id: linha.id,
    neb: linha.neb,
    medicamento: linha.medicamento,
    uf: linha.uf,
    precoReferencia: linha.precoReferencia,
  }))
}

export function listaMedicamentosFromPrecosRows(
  rows: MedicamentoPrecoRow[] | undefined,
): ListaMedicamentosFormData {
  return normalizeListaMedicamentosForm({
    linhas: (rows ?? []).map((row) => ({
      id: row.id || createEmptyListaMedicamentosLinha().id,
      neb: row.neb ?? '',
      medicamento: row.medicamento ?? '',
      uf: row.uf ?? '',
      precoReferencia: row.precoReferencia ?? '',
    })),
  })
}

export function formatListaMedNeb(raw: string): string {
  return raw.trim().toUpperCase()
}

export function formatListaMedUf(raw: string): string {
  return formatImhUppercase(raw).slice(0, 8)
}

export function formatListaMedNome(raw: string): string {
  return formatImhUppercase(raw)
}

export function formatListaMedPreco(raw: string): string {
  return formatPrecoReferenciaMedicamento(raw) || raw
}
