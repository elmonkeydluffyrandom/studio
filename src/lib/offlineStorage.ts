// lib/offlineStorage.ts
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'

export interface PendingOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  data: any
  timestamp: number
  userId: string
  retries: number
}

const QUEUE_KEY = 'bibliadiario_offline_queue'
const MAX_RETRIES = 3

/**
 * Agregar operación a la cola offline
 */
export function queueOperation(operation: Omit<PendingOperation, 'retries'>): void {
  try {
    const queue = getQueue()
    
    // Evitar duplicados - si ya existe una operación para este ID, reemplazarla
    const existingIndex = queue.findIndex(
      op => op.id === operation.id && op.userId === operation.userId
    )
    
    if (existingIndex !== -1) {
      queue[existingIndex] = { ...operation, retries: 0 }
      console.log('🔄 Operación actualizada en cola:', operation.id)
    } else {
      queue.push({ ...operation, retries: 0 })
      console.log('➕ Nueva operación agregada a cola:', operation.id)
    }
    
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
    console.log(`✅ Cola guardada. Total: ${queue.length} operaciones`)
  } catch (error) {
    console.error('❌ Error guardando en cola offline:', error)
  }
}

/**
 * Obtener todas las operaciones pendientes
 */
export function getQueue(): PendingOperation[] {
  try {
    const data = localStorage.getItem(QUEUE_KEY)
    if (!data) return []
    
    const queue = JSON.parse(data) as PendingOperation[]
    console.log(`📋 Cola cargada: ${queue.length} operaciones`)
    return queue
  } catch (error) {
    console.error('❌ Error leyendo cola offline:', error)
    return []
  }
}

/**
 * Obtener operaciones de un usuario específico
 */
export function getUserQueue(userId: string): PendingOperation[] {
  const queue = getQueue()
  return queue.filter(op => op.userId === userId)
}

/**
 * Limpiar toda la cola
 */
export function clearQueue(): void {
  try {
    localStorage.removeItem(QUEUE_KEY)
    console.log('🗑️ Cola limpiada completamente')
  } catch (error) {
    console.error('❌ Error limpiando cola:', error)
  }
}

/**
 * Remover una operación específica de la cola
 */
export function removeFromQueue(operationId: string, userId: string): void {
  try {
    const queue = getQueue()
    const newQueue = queue.filter(
      op => !(op.id === operationId && op.userId === userId)
    )
    localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue))
    console.log(`✅ Operación ${operationId} removida de la cola`)
  } catch (error) {
    console.error('❌ Error removiendo de cola:', error)
  }
}

/**
 * Sincronizar cola cuando vuelva la conexión
 */
export async function syncQueue(userId: string): Promise<{
  success: number
  failed: number
  errors: string[]
}> {
  const queue = getQueue()
  const userQueue = queue.filter(op => op.userId === userId)
  
  if (userQueue.length === 0) {
    console.log('ℹ️ No hay operaciones pendientes para sincronizar')
    return { success: 0, failed: 0, errors: [] }
  }

  console.log(`🔄 Iniciando sincronización de ${userQueue.length} operaciones...`)

  let success = 0
  let failed = 0
  const errors: string[] = []
  const remainingQueue: PendingOperation[] = []

  for (const operation of userQueue) {
    try {
      console.log(`⏳ Sincronizando: ${operation.type} - ${operation.id}`)
      
      const entryRef = doc(db, 'users', userId, 'journalEntries', operation.id)

      switch (operation.type) {
        case 'create':
        case 'update':
          await setDoc(
            entryRef,
            {
              ...operation.data,
              updatedAt: serverTimestamp(),
              syncedAt: serverTimestamp(),
            },
            { merge: true }
          )
          success++
          console.log(`✅ Sincronizado exitosamente: ${operation.id}`)
          
          // Remover de la cola
          removeFromQueue(operation.id, userId)
          break

        case 'delete':
          // Implementar si es necesario
          console.log('⚠️ Delete aún no implementado')
          break
      }
    } catch (error: any) {
      console.error(`❌ Error sincronizando ${operation.id}:`, error)
      
      // Si no ha alcanzado el máximo de reintentos, mantener en cola
      if (operation.retries < MAX_RETRIES) {
        remainingQueue.push({
          ...operation,
          retries: operation.retries + 1
        })
        console.log(`🔄 Reintento ${operation.retries + 1}/${MAX_RETRIES} para ${operation.id}`)
      } else {
        failed++
        errors.push(`${operation.id}: ${error.message}`)
        console.log(`❌ Max reintentos alcanzado para ${operation.id}`)
      }
    }
  }

  // Actualizar cola con operaciones que fallaron
  const otherUsersQueue = queue.filter(op => op.userId !== userId)
  const newQueue = [...otherUsersQueue, ...remainingQueue]
  localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue))

  console.log(`📊 Sincronización completada: ${success} exitosas, ${failed} fallidas, ${remainingQueue.length} pendientes`)

  return { success, failed, errors }
}

/**
 * Verificar si hay operaciones pendientes
 */
export function hasPendingOperations(userId: string): boolean {
  const queue = getUserQueue(userId)
  return queue.length > 0
}

/**
 * Obtener número de operaciones pendientes
 */
export function getPendingCount(userId: string): number {
  const queue = getUserQueue(userId)
  return queue.length
}

/**
 * Hook React para sincronización automática
 */
import { useEffect } from 'react'
import { toast } from 'sonner'

export function useOfflineSync(userId: string | null) {
  useEffect(() => {
    if (!userId) return

    const handleOnline = async () => {
      console.log('🌐 Conexión restaurada, verificando cola...')
      
      const pendingCount = getPendingCount(userId)
      if (pendingCount === 0) {
        console.log('✅ No hay operaciones pendientes')
        return
      }

      toast.loading(`Sincronizando ${pendingCount} cambio(s)...`, { 
        id: 'sync-queue' 
      })
      
      const result = await syncQueue(userId)
      
      if (result.success > 0) {
        toast.success(
          `✅ ${result.success} entrada(s) sincronizada(s)`,
          { id: 'sync-queue', duration: 4000 }
        )
      }
      
      if (result.failed > 0) {
        toast.error(
          `❌ ${result.failed} entrada(s) no se pudieron sincronizar`,
          { 
            id: 'sync-queue',
            duration: 5000,
            description: 'Intenta sincronizar manualmente desde el dashboard'
          }
        )
      }
    }

    const handleOffline = () => {
      console.log('📡 Conexión perdida, modo offline activado')
      toast.info('Sin conexión. Los cambios se guardarán localmente.', {
        duration: 3000
      })
    }

    // Listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Intentar sincronizar al cargar si hay conexión
    if (navigator.onLine) {
      const pendingCount = getPendingCount(userId)
      if (pendingCount > 0) {
        console.log(`🔄 ${pendingCount} operaciones pendientes detectadas al cargar`)
        handleOnline()
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [userId])
}

/**
 * Componente para mostrar estado de sincronización
 */
export function SyncStatus({ userId }: { userId: string | null }) {
  const [pendingCount, setPendingCount] = useState(0)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    if (!userId) return

    // Actualizar contador cada segundo
    const interval = setInterval(() => {
      const count = getPendingCount(userId)
      setPendingCount(count)
    }, 1000)

    return () => clearInterval(interval)
  }, [userId])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (pendingCount === 0 && isOnline) return null

  return (
    <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-full shadow-lg border flex items-center gap-2 ${
      isOnline ? 'bg-white' : 'bg-yellow-50 border-yellow-200'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        isOnline 
          ? pendingCount > 0 
            ? 'bg-yellow-500 animate-pulse' 
            : 'bg-green-500'
          : 'bg-gray-400'
      }`} />
      <span className="text-sm font-medium">
        {isOnline 
          ? pendingCount > 0 
            ? `Sincronizando ${pendingCount}...`
            : 'Sincronizado'
          : 'Sin conexión'}
      </span>
    </div>
  )
}