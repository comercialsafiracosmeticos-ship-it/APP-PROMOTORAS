import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PromotoraConsole from './components/PromotoraConsole';
import BlingPanel from './components/BlingPanel';
import ClientFinancePanel from './components/ClientFinancePanel';
import DashboardBI from './components/DashboardBI';
import SalesOrdersPanel from './components/SalesOrdersPanel';
import { 
  Promotora, Cliente, Pedido, Produto, Visita, Escala, Atestado, BlingConfig 
} from './types';
import { Sparkles, Compass, AlertCircle, ShoppingBag, Loader2, ArrowRight } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PROMOTORA');
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);

  // States
  const [promotoras, setPromotoras] = useState<Promotora[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [atestados, setAtestados] = useState<Atestado[]>([]);
  const [blingConfig, setBlingConfig] = useState<BlingConfig>({
    apiKey: '',
    clientId: '',
    clientSecret: '',
    statusConexao: 'Desconectado',
    ultimoSincronismo: undefined,
    webhookAtivo: false,
    aliasServidor: 'Safira Comercial Principal'
  });

  const [activePromotora, setActivePromotora] = useState<Promotora | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load from backend
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/store');
        if (res.ok) {
          const store = await res.json();
          setPromotoras(store.promotoras || []);
          setClientes(store.clientes || []);
          setProdutos(store.produtos || []);
          setPedidos(store.pedidos || []);
          setVisitas(store.visitas || []);
          setEscalas(store.escalas || []);
          setAtestados(store.atestados || []);
          setBlingConfig(store.blingConfig || {});

          if (store.promotoras && store.promotoras.length > 0) {
            setActivePromotora(store.promotoras[0]);
          }
        }
      } catch (e) {
        console.error("Error loading initial store data", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Update backend helper
  const saveToBackend = async (updatedStore: any) => {
    try {
      await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStore)
      });
    } catch (e) {
      console.error("Failed to sync store to backend file storage", e);
    }
  };

  // State mutation actions synced with backend
  const handleAddPromotora = async (p: Omit<Promotora, 'id'>) => {
    const newProm: Promotora = {
      id: 'prom-' + Math.random().toString(36).substr(2, 9),
      ...p
    };
    const updatedProms = [...promotoras, newProm];
    setPromotoras(updatedProms);
    
    await saveToBackend({
      promotoras: updatedProms,
      clientes,
      produtos,
      pedidos,
      visitas,
      escalas,
      atestados,
      blingConfig
    });
  };

  const handleDeletePromotora = async (id: string) => {
    const updatedProms = promotoras.filter(p => p.id !== id);
    setPromotoras(updatedProms);
    if (activePromotora?.id === id && updatedProms.length > 0) {
      setActivePromotora(updatedProms[0]);
    }
    
    await saveToBackend({
      promotoras: updatedProms,
      clientes,
      produtos,
      pedidos,
      visitas,
      escalas,
      atestados,
      blingConfig
    });
  };

  const handleUpdatePromotora = async (id: string, updated: Partial<Promotora>) => {
    const updatedProms = promotoras.map(p => p.id === id ? { ...p, ...updated } : p);
    setPromotoras(updatedProms);
    const activeMatch = updatedProms.find(p => p.id === activePromotora?.id);
    if (activeMatch) setActivePromotora(activeMatch);

    await saveToBackend({
      promotoras: updatedProms,
      clientes,
      produtos,
      pedidos,
      visitas,
      escalas,
      atestados,
      blingConfig
    });
  };

  const handleAddVisita = async (v: Omit<Visita, 'id'>) => {
    const newVisit: Visita = {
      id: 'vis-' + Math.random().toString(36).substr(2, 9),
      ...v
    };
    const updatedVisits = [...visitas, newVisit];
    setVisitas(updatedVisits);

    await saveToBackend({
      promotoras,
      clientes,
      produtos,
      pedidos,
      visitas: updatedVisits,
      escalas,
      atestados,
      blingConfig
    });
  };

  const handleUpdateVisita = async (id: string, updated: Partial<Visita>) => {
    const updatedVisits = visitas.map(v => v.id === id ? { ...v, ...updated } as Visita : v);
    setVisitas(updatedVisits);

    await saveToBackend({
      promotoras,
      clientes,
      produtos,
      pedidos,
      visitas: updatedVisits,
      escalas,
      atestados,
      blingConfig
    });
  };

  const handleAddEscala = async (e: Omit<Escala, 'id'>) => {
    const newEscala: Escala = {
      id: 'esc-' + Math.random().toString(36).substr(2, 9),
      ...e
    };
    const updatedEscalas = [...escalas, newEscala];
    setEscalas(updatedEscalas);

    await saveToBackend({
      promotoras,
      clientes,
      produtos,
      pedidos,
      visitas,
      escalas: updatedEscalas,
      atestados,
      blingConfig
    });
  };

  const handleDeleteEscala = async (id: string) => {
    const updatedEscalas = escalas.filter(e => e.id !== id);
    setEscalas(updatedEscalas);

    await saveToBackend({
      promotoras,
      clientes,
      produtos,
      pedidos,
      visitas,
      escalas: updatedEscalas,
      atestados,
      blingConfig
    });
  };

  const handleAddAtestado = async (a: Omit<Atestado, 'id' | 'dataEnvio'>) => {
    const newAtestado: Atestado = {
      id: 'atest-' + Math.random().toString(36).substr(2, 9),
      dataEnvio: new Date().toISOString(),
      ...a
    };
    const updatedAtestados = [...atestados, newAtestado];
    setAtestados(updatedAtestados);

    await saveToBackend({
      promotoras,
      clientes,
      produtos,
      pedidos,
      visitas,
      escalas,
      atestados: updatedAtestados,
      blingConfig
    });
  };

  const handleDeleteAtestado = async (id: string) => {
    const updatedAtestados = atestados.filter(a => a.id !== id);
    setAtestados(updatedAtestados);

    await saveToBackend({
      promotoras,
      clientes,
      produtos,
      pedidos,
      visitas,
      escalas,
      atestados: updatedAtestados,
      blingConfig
    });
  };

  const handleSaveBlingConfig = async (updated: Partial<BlingConfig>) => {
    const updatedConfig = { ...blingConfig, ...updated };
    setBlingConfig(updatedConfig);

    await saveToBackend({
      promotoras,
      clientes,
      produtos,
      pedidos,
      visitas,
      escalas,
      atestados,
      blingConfig: updatedConfig
    });
  };

  // Client CRUD Handlers
  const handleAddCliente = async (newCliData: Omit<Cliente, 'id'>) => {
    const newCliente: Cliente = {
      id: 'cli-man-' + Math.random().toString(36).substr(2, 9),
      ...newCliData
    };
    const updatedClientes = [newCliente, ...clientes];
    setClientes(updatedClientes);

    await saveToBackend({
      promotoras,
      clientes: updatedClientes,
      produtos,
      pedidos,
      visitas,
      escalas,
      atestados,
      blingConfig
    });
  };

  const handleUpdateCliente = async (updatedCli: Cliente) => {
    const updatedClientes = clientes.map(c => c.id === updatedCli.id ? updatedCli : c);
    setClientes(updatedClientes);

    await saveToBackend({
      promotoras,
      clientes: updatedClientes,
      produtos,
      pedidos,
      visitas,
      escalas,
      atestados,
      blingConfig
    });
  };

  const handleDeleteCliente = async (id: string) => {
    const updatedClientes = clientes.filter(c => c.id !== id);
    setClientes(updatedClientes);

    await saveToBackend({
      promotoras,
      clientes: updatedClientes,
      produtos,
      pedidos,
      visitas,
      escalas,
      atestados,
      blingConfig
    });
  };

  const handleAddPedido = async (newPedData: Omit<Pedido, 'id'>) => {
    const newPed: Pedido = {
      id: 'ped-' + Math.random().toString(36).substr(2, 9),
      ...newPedData
    };
    const updatedPedidos = [newPed, ...pedidos];
    setPedidos(updatedPedidos);

    await saveToBackend({
      promotoras,
      clientes,
      produtos,
      pedidos: updatedPedidos,
      visitas,
      escalas,
      atestados,
      blingConfig
    });
  };

  const handleUpdatePedido = async (updatedPed: Pedido) => {
    const updatedPedidos = pedidos.map(p => p.id === updatedPed.id ? updatedPed : p);
    setPedidos(updatedPedidos);

    await saveToBackend({
      promotoras,
      clientes,
      produtos,
      pedidos: updatedPedidos,
      visitas,
      escalas,
      atestados,
      blingConfig
    });
  };

  const handleDeletePedido = async (id: string) => {
    const updatedPedidos = pedidos.filter(p => p.id !== id);
    setPedidos(updatedPedidos);

    await saveToBackend({
      promotoras,
      clientes,
      produtos,
      pedidos: updatedPedidos,
      visitas,
      escalas,
      atestados,
      blingConfig
    });
  };

  // Trigger real sync from Bling endpoint
  const handleTriggerBlingSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/bling/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const updatedConfig = data.blingConfig || {
          ...blingConfig,
          statusConexao: 'Conectado',
          ultimoSincronismo: data.ultimoSincronismo
        };
        setBlingConfig(updatedConfig);
        setClientes(data.clientes || clientes);
        setPedidos(data.pedidos || pedidos);
        setProdutos(data.produtos || produtos);

        // Save immediately to backend/Firestore
        await saveToBackend({
          promotoras,
          clientes: data.clientes || clientes,
          produtos: data.produtos || produtos,
          pedidos: data.pedidos || pedidos,
          visitas,
          escalas,
          atestados,
          blingConfig: updatedConfig
        });

        setSyncNotice({
          message: data.message || `Sincronização com o Bling ERP realizada com sucesso! ${data.clientes?.length || 0} clientes/PDVs atualizados e salvos no banco de dados.`,
          type: 'success'
        });
      } else {
        setSyncNotice({
          message: 'Erro ao conectar com o serviço do Bling ERP.',
          type: 'error'
        });
      }
    } catch (e) {
      console.error("Failed to sync with Bling ERP", e);
      setSyncNotice({
        message: 'Erro inesperado ao sincronizar com o Bling ERP.',
        type: 'error'
      });
    } finally {
      setSyncing(false);
      setTimeout(() => {
        setSyncNotice(null);
      }, 7000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        <p className="font-display font-medium text-sm text-gray-400">Iniciando Portal Comercial Safira Cosméticos...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0F0F10] min-h-screen text-[#E0E0E0] font-sans selection:bg-amber-500/20 selection:text-amber-200 pb-16">
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isStandaloneMode={isStandaloneMode} 
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* BANNER DE NOTIFICAÇÃO DE SINCRONISMO */}
        {syncNotice && (
          <div className={`mb-6 p-4 rounded-2xl border flex items-center justify-between gap-4 animate-fadeIn shadow-xl ${
            syncNotice.type === 'success' 
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200' 
              : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${syncNotice.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Status da Sincronização Bling ERP</p>
                <p className="text-xs opacity-90">{syncNotice.message}</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setSyncNotice(null)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {/* TAB CONTROLS SELECTOR */}
        {activeTab === 'PROMOTORA' && (
          <PromotoraConsole
            promotoras={promotoras}
            clientes={clientes}
            produtos={produtos}
            visitas={visitas}
            escalas={escalas}
            atestados={atestados}
            activePromotora={activePromotora || promotoras[0]}
            setActivePromotora={setActivePromotora}
            onAddPromotora={handleAddPromotora}
            onDeletePromotora={handleDeletePromotora}
            onUpdatePromotora={handleUpdatePromotora}
            onAddVisita={handleAddVisita}
            onUpdateVisita={handleUpdateVisita}
            onAddEscala={handleAddEscala}
            onDeleteEscala={handleDeleteEscala}
            onAddAtestado={handleAddAtestado}
            onDeleteAtestado={handleDeleteAtestado}
            isStandaloneMode={isStandaloneMode}
            setIsStandaloneMode={setIsStandaloneMode}
            onSyncBling={handleTriggerBlingSync}
            syncing={syncing}
          />
        )}

        {activeTab === 'CLIENTES' && !isStandaloneMode && (
          <ClientFinancePanel
            clientes={clientes}
            pedidos={pedidos}
            onSyncBling={handleTriggerBlingSync}
            syncing={syncing}
            onAddCliente={handleAddCliente}
            onUpdateCliente={handleUpdateCliente}
            onDeleteCliente={handleDeleteCliente}
          />
        )}

        {activeTab === 'DASHBOARD' && !isStandaloneMode && (
          <DashboardBI
            clientes={clientes}
            visitas={visitas}
            produtos={produtos}
            pedidos={pedidos}
          />
        )}

        {activeTab === 'PEDIDOS' && !isStandaloneMode && (
          <SalesOrdersPanel
            pedidos={pedidos}
            clientes={clientes}
            produtos={produtos}
            ultimoSincronismo={blingConfig.ultimoSincronismo}
            onSyncBling={handleTriggerBlingSync}
            syncing={syncing}
            onAddPedido={handleAddPedido}
            onUpdatePedido={handleUpdatePedido}
            onDeletePedido={handleDeletePedido}
          />
        )}

        {activeTab === 'BLING' && (
          <BlingPanel
            config={blingConfig}
            clientes={clientes}
            pedidos={pedidos}
            produtos={produtos}
            onSaveConfig={handleSaveBlingConfig}
            onTriggerSync={handleTriggerBlingSync}
            syncing={syncing}
          />
        )}
      </main>
    </div>
  );
}
