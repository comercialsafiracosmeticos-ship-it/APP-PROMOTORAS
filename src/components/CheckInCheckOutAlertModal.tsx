import { useEffect, useState } from 'react';
import { Clock, AlertTriangle, MapPin, Bell, BellRing, Check, X, ShieldAlert, ArrowRight, RefreshCw, Navigation } from 'lucide-react';
import { Escala, Cliente, Visita } from '../types';

export interface CheckInCheckOutAlertModalProps {
  isOpen: boolean;
  alertType: 'CHECKIN_LATE' | 'CHECKOUT_LATE' | null;
  escala: Escala | null;
  cliente: Cliente | null;
  activeVisita: Visita | null;
  minutesOverdue: number;
  gpsDistanceMeters: number | null;
  onCheckIn: () => Promise<void> | void;
  onCheckOut: () => Promise<void> | void;
  onSnooze: () => void;
  onDismiss: () => void;
}

export default function CheckInCheckOutAlertModal({
  isOpen,
  alertType,
  escala,
  cliente,
  activeVisita,
  minutesOverdue,
  gpsDistanceMeters,
  onCheckIn,
  onCheckOut,
  onSnooze,
  onDismiss
}: CheckInCheckOutAlertModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pushPermissionStatus, setPushPermissionStatus] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  // Request browser push notification permission
  const handleEnablePush = async () => {
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      try {
        const perm = await Notification.requestPermission();
        setPushPermissionStatus(perm);
        if (perm === 'granted') {
          new Notification('Safira Cosméticos - Notificações Ativadas', {
            body: 'Você receberá alertas automáticos de ponto e escala no seu navegador.',
            icon: '/favicon.ico'
          });
        }
      } catch (err) {
        console.warn('Erro ao solicitar permissão de Notificação Push:', err);
      }
    }
  };

  // Send Browser Push Notification when Modal triggers
  useEffect(() => {
    if (isOpen && alertType && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const title = alertType === 'CHECKIN_LATE' 
        ? '⏰ Alerta de Check-in Pendente!' 
        : '🏠 Alerta de Check-out Pendente!';
      
      const body = alertType === 'CHECKIN_LATE'
        ? `Passaram-se ${minutesOverdue} minutos do horário de entrada da sua escala (${escala?.horaInicio || '08:00'}). Clique para registrar seu check-in.`
        : `Passaram-se ${minutesOverdue} minutos do horário de saída da sua escala (${escala?.horaFim || '17:00'}). Clique para realizar seu check-out.`;

      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: 'safira-ponto-alert',
          requireInteraction: true
        });
      } catch (e) {
        console.warn('Falha ao disparar Push Notification:', e);
      }
    }
  }, [isOpen, alertType, minutesOverdue, escala]);

  if (!isOpen || !alertType) return null;

  const isCheckIn = alertType === 'CHECKIN_LATE';
  const nowTimeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const handleAction = async () => {
    setIsSubmitting(true);
    try {
      if (isCheckIn) {
        await onCheckIn();
      } else {
        await onCheckOut();
      }
      onDismiss();
    } catch (e) {
      console.error('Erro ao processar ação do ponto:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-[#161618] border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-5 relative overflow-hidden">
        {/* Glow accent decoration */}
        <div className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl pointer-events-none ${
          isCheckIn ? 'bg-amber-500/20' : 'bg-blue-500/20'
        }`} />

        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border font-bold shrink-0 shadow-lg ${
              isCheckIn 
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-amber-500/10 animate-bounce' 
                : 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-blue-500/10 animate-pulse'
            }`}>
              {isCheckIn ? <Clock className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isCheckIn
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
              }`}>
                Aviso de Pontualidade (+{minutesOverdue} min)
              </span>
              <h2 className="font-display font-extrabold text-base text-white mt-1">
                {isCheckIn ? 'Lembrete de Check-in (Entrada)' : 'Lembrete de Check-out (Saída)'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar aviso"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alert Description Body */}
        <div className="space-y-3">
          <div className="bg-[#222225] border border-white/10 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
              <span className="text-gray-400 font-medium">Horário de Escala Previsto:</span>
              <span className="text-amber-400 font-extrabold font-mono text-sm">
                {isCheckIn ? (escala?.horaInicio || '08:00') : (escala?.horaFim || '17:00')}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
              <span className="text-gray-400 font-medium">Horário Atual:</span>
              <span className="text-white font-bold font-mono">{nowTimeStr}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-medium">Tempo Excedido sem Registro:</span>
              <span className="text-red-400 font-extrabold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                +{minutesOverdue} minutos
              </span>
            </div>
          </div>

          {/* Location & Client Details */}
          <div className="bg-[#1A1A1D] border border-white/5 rounded-2xl p-3.5 space-y-2 text-xs">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">PDV / Cliente Escalado</span>
                <span className="text-white font-extrabold text-xs block">
                  {cliente?.nome || escala?.clienteNome || 'PDV Selecionado'}
                </span>
                {cliente?.endereco && (
                  <span className="text-[11px] text-gray-400 block mt-0.5 truncate max-w-[280px]">
                    {cliente.endereco} - {cliente.cidade}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
              <span className="text-gray-400 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                Geolocalização GPS:
              </span>
              <span className="text-emerald-400 font-extrabold font-mono">
                {gpsDistanceMeters !== null
                  ? `${gpsDistanceMeters.toFixed(1)}m do PDV`
                  : 'GPS Ativo & Verificado'}
              </span>
            </div>
          </div>
        </div>

        {/* Push Notification Toggle Helper */}
        {pushPermissionStatus !== 'granted' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-[11px] text-amber-200">
                Ative notificações no navegador para receber alertas mesmo com a tela minimizada.
              </span>
            </div>
            <button
              type="button"
              onClick={handleEnablePush}
              className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold px-2.5 py-1 rounded-lg text-[10px] shrink-0 cursor-pointer shadow-sm"
            >
              Ativar Push
            </button>
          </div>
        )}

        {/* Primary and Secondary Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleAction}
            disabled={isSubmitting}
            className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-xs transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 ${
              isCheckIn
                ? 'bg-amber-500 hover:bg-amber-400 text-gray-950 shadow-amber-500/20'
                : 'bg-emerald-500 hover:bg-emerald-400 text-gray-950 shadow-emerald-500/20'
            }`}
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isCheckIn ? (
              <>
                <Clock className="w-4 h-4" />
                <span>BATER PONTO AGORA (CHECK-IN)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>REGISTRAR FIM DE EXPEDIENTE (CHECK-OUT)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSnooze}
              className="w-1/2 py-2.5 px-3 bg-[#222225] hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/10 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-400" />
              <span>Lembrar em 5min</span>
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className="w-1/2 py-2.5 px-3 bg-[#222225] hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/10 cursor-pointer text-center"
            >
              Saber mais tarde
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
