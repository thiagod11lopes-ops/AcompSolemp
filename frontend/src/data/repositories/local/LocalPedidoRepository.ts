import type { Pedido } from '@/types'
import { loadAppData, saveAppData } from '@/mocks/seed'
import type { PedidoRepository } from '@/data/repositories/types'

export class LocalPedidoRepository implements PedidoRepository {
  async listAll(): Promise<Pedido[]> {
    return loadAppData().pedidos
  }

  async getById(id: string): Promise<Pedido | null> {
    return loadAppData().pedidos.find((pedido) => pedido.id === id) ?? null
  }

  async save(pedido: Pedido): Promise<void> {
    const data = loadAppData()
    const index = data.pedidos.findIndex((item) => item.id === pedido.id)
    if (index >= 0) data.pedidos[index] = pedido
    else data.pedidos.push(pedido)
    saveAppData(data)
  }
}
