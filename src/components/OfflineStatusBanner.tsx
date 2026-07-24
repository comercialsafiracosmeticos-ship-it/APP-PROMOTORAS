import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, ShieldAlert, CloudUpload } from 'lucide-react';
import { getPendingVisitas, syncPendingVisitasToFirestore, SyncResult } from '../lib/offlineManager';

interface OfflineStatusBannerProps {
  onSyncComplete?: () => void;
}

export default function OfflineStatusBanner({ onSyncComplete }: OfflineStatusBannerProps) {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const refreshPendingCount = () => {
    setPendingCount(getPendingVisitas().length);
  };

  useEffect(() => {
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      refreshPendingCount();
      handleManualSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      refreshPendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(refreshPendingCount, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    const pending = getPendingVisitas();
    if (pending.length === 0) {
      setSyncStatusMsg('Todos os check-ins já estão sincronizados na nuvem.');
      setTimeout(() => setSyncStatusMsg(null), 3000);
      return;
    }

    setIsSyncing(true);
    setSyncStatusMsg(`Sincronizando ${pending.length} check-in(s) offline com o Firestore...`);

    try {
      const result: SyncResult = await syncPendingVisitasToFirestore();
      refreshPendingCount();
      if (result.synced > 0) {
        setSyncStatusMsg(`✅ ${result.synced} check-in(s) sincronizado(s) com sucesso com o Firestore!`);
        if (onSyncComplete) onSyncComplete();
      } else if (result.failed > 0) {
        setSyncStatusMsg(`⚠️ Falha ao sincronizar ${result.failed} item(ns). Tente novamente.`);
      }
    } catch (e) {
      setSyncStatusMsg('Erro ao tentar sincronizar dados offline.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  if (isOnline && pendingCount === 0 && !syncStatusMsg) {
    return null;
  }

  return (
    <div className="w-full bg-[#18181B] border-b border-white/10 px-4 py-2.5 transition-all shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2.5">
          {!isOnline ? (
            <div className="flex items-center gap-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30 font-bold">
              <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Modo Offline Ativo</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30 font-bold">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>Conectado à Internet</span>
            </div>
          )}

          <div className="text-gray-300 font-medium">
            {!isOnline ? (
              <span>Você pode continuar acessando suas rotas e fazendo check-ins normalmente. Os dados serão salvos no celular.</span>
            ) : (
              <span>Sua conexão foi restabelecida.</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-gray-950 font-black px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1 shadow-sm">
              <CloudUpload className="w-3 h-3" />
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </span>
          )}

          {syncStatusMsg ? (
            <span className="text-amber-300 font-semibold text-[11px]">{syncStatusMsg}</span>
          ) : (
            isOnline && pendingCount > 0 && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-extrabold px-3 py-1 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
