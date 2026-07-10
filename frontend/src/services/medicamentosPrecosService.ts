import { loadAppData, saveAppData } from '@/mocks/seed'
import seedData from '@/data/medicamentosPrecosSeed.json'
import type { MedicamentoPrecoRow } from '@/utils/medicamentosPrecos'

function cloneSeed(): MedicamentoPrecoRow[] {
  return (seedData as MedicamentoPrecoRow[]).map((row) => ({ ...row }))
}

export const medicamentosPrecosService = {
  getRows(): MedicamentoPrecoRow[] {
    const data = loadAppData()
    if (data.medicamentosPrecos?.length) {
      return data.medicamentosPrecos.map((row) => ({ ...row }))
    }
    return cloneSeed()
  },

  saveRows(rows: MedicamentoPrecoRow[]): MedicamentoPrecoRow[] {
    const data = loadAppData()
    const next = rows.map((row) => ({ ...row }))
    data.medicamentosPrecos = next
    saveAppData(data)
    return next.map((row) => ({ ...row }))
  },

  resetToSeed(): MedicamentoPrecoRow[] {
    return medicamentosPrecosService.saveRows(cloneSeed())
  },
}
