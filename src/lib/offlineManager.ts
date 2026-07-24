import { Visita } from '../types';
import { saveVisitaToFirestore } from './firebase';

const PENDING_VISITAS_KEY = 'safira_pending_visitas_sync';
const CACHE_PREFIX = 'safira_offline_cache_';

export interface SyncResult {
  synced: number;
  failed: number;
  details: string[];
}

/**
 * Gets all pending offline check-ins waiting to be synced to Firestore.
 */
export function getPendingVisitas(): Visita[] {
  try {
    const raw = localStorage.getItem(PENDING_VISITAS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Erro ao ler visitas pendentes offline:', e);
    return [];
  }
}

/**
 * Adds or updates a visita in the offline sync queue.
 */
export function queueOfflineVisita(visita: Visita): void {
  try {
    const pending = getPendingVisitas();
    const index = pending.findIndex((v) => v.id === visita.id);
    if (index >= 0) {
      pending[index] = visita;
    } else {
      pending.push(visita);
    }
    localStorage.setItem(PENDING_VISITAS_KEY, JSON.stringify(pending));
    console.log(`Visita ${visita.id} salva na fila offline (${pending.length} pendentes).`);
    
    // Register background sync if available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then((reg: any) => {
        reg.sync.register('sync-visitas-offline').catch((err: any) => console.log('Sync indisponível:', err));
      });
    }
  } catch (e) {
    console.error('Erro ao salvar visita na fila offline:', e);
  }
}

/**
 * Removes a visita from the pending sync queue after successful upload.
 */
export function removePendingVisita(visitaId: string): void {
  try {
    const pending = getPendingVisitas();
    const filtered = pending.filter((v) => v.id !== visitaId);
    localStorage.setItem(PENDING_VISITAS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Erro ao remover visita da fila offline:', e);
  }
}

/**
 * Syncs all pending offline visitas to Firestore.
 */
export async function syncPendingVisitasToFirestore(): Promise<SyncResult> {
  const pending = getPendingVisitas();
  if (pending.length === 0) {
    return { synced: 0, failed: 0, details: [] };
  }

  let synced = 0;
  let failed = 0;
  const details: string[] = [];

  for (const visita of pending) {
    try {
      await saveVisitaToFirestore(visita);
      removePendingVisita(visita.id);
      synced++;
      details.push(`Visita em ${visita.clienteNome || 'Cliente'} sincronizada com sucesso.`);
    } catch (error) {
      failed++;
      console.error(`Falha ao sincronizar visita ${visita.id}:`, error);
      details.push(`Falha na sincronização da visita ${visita.id}`);
    }
  }

  return { synced, failed, details };
}

/**
 * Saves arbitrary data to local offline cache (e.g., routes, client list, promotoras).
 */
export function setLocalCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
      data,
      timestamp: new Date().toISOString()
    }));
  } catch (e) {
    console.warn(`Erro ao salvar cache offline para ${key}:`, e);
  }
}

/**
 * Retrieves cached data for offline fallback.
 */
export function getLocalCache<T>(key: string, fallbackValue: T): T {
  try {
    const item = localStorage.getItem(CACHE_PREFIX + key);
    if (!item) return fallbackValue;
    const parsed = JSON.parse(item);
    return parsed.data ?? fallbackValue;
  } catch (e) {
    return fallbackValue;
  }
}

/**
 * Register Service Worker helper
 */
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[ServiceWorker] Registrado com sucesso no escopo:', reg.scope);
        })
        .catch((err) => {
          console.warn('[ServiceWorker] Falha ao registrar:', err);
        });
    });
  }
}
