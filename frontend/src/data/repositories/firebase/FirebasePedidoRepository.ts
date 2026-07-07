import type { Pedido } from '@/types'
import { FIRESTORE_COLLECTIONS } from '@/firebase/collections'
import type { PedidoRepository } from '@/data/repositories/types'

function notImplemented(method: string): never {
  throw new Error(
    `[Firebase] ${method} ainda não implementado. Migre para coleção "${FIRESTORE_COLLECTIONS.pedidos}".`,
  )
}

/** Esqueleto — implementar com Firestore na fase 2 */
export class FirebasePedidoRepository implements PedidoRepository {
  async listAll(): Promise<Pedido[]> {
    notImplemented('PedidoRepository.listAll')
  }

  async getById(_id: string): Promise<Pedido | null> {
    notImplemented('PedidoRepository.getById')
  }

  async save(_pedido: Pedido): Promise<void> {
    notImplemented('PedidoRepository.save')
  }
}
