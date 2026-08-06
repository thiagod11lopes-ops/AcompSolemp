import {
  BadgeCheck,
  Boxes,
  ClipboardList,
  FileText,
  FolderOpen,
  Package,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ETAPA_ICON_MAP: Record<string, LucideIcon> = {
  SOLICITACAO: ClipboardList,
  DIV_MAT_AUDITORIA: ShieldCheck,
  DIV_MAT_CONTABILIDADE_IMH: FileText,
  DIV_MAT_CONFECCAO_SOLEMP: Package,
  DIV_MAT_FINANCAS: BadgeCheck,
  DIV_MAT_EMPENHADO: FolderOpen,
}

export function getEtapaIcon(chave: string): LucideIcon {
  return ETAPA_ICON_MAP[chave] ?? Boxes
}

export { ClipboardList, FileText, FolderOpen, Package, ShieldCheck, Truck }
