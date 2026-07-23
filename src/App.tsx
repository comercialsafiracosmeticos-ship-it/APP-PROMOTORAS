import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PromotoraConsole from './components/PromotoraConsole';
import BlingPanel from './components/BlingPanel';
import ClientFinancePanel from './components/ClientFinancePanel';
import DashboardBI from './components/DashboardBI';
import SalesOrdersPanel from './components/SalesOrdersPanel';
import AuthModal from './components/AuthModal';
import { 
  Promotora, Cliente, Pedido, Produto, Visita, Escala, Atestado, BlingConfig, MetaVendaPromotora 
} from './types';
import { Sparkles, Compass, AlertCircle, ShoppingBag, Loader2, ArrowRight } from 'lucide-react';
import { auth, onAuthStateChanged, testFirestoreConnection, FirebaseUser } from './lib/firebase';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PROMOTORA');
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);

  // Firebase Auth & Modal state
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // States
  const [promotoras, setPromotoras] = useState<Promotora[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [atestados, setAtestados] = useState<Atestado[]>([]);
  const [metasVendas, setMetasVendas] = useState<MetaVendaPromotora[]>([]);
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

  // Initialize Firebase Auth listener
  useEffect(() => {
    testFirestoreConnection();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (user && user.email) {
        // Sync user profile if email matches
        setPromotoras(prevProms => {
          if (prevProms.length > 0) {
            const matched = prevProms.find(p => p.email?.toLowerCase() === user.email?.toLowerCase());
            if (matched) {
              setActivePromotora(matched);
              localStorage.setItem('safira_active_user_id', matched.id);
            }
          }
          return prevProms;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Safeguard: Restrict tabs 'CLIENTES' (Clientes & Financeiro), 'PEDIDOS' (Pedidos), and 'BLING' (Bling) to Admin only
  useEffect(() => {
    if (activePromotora?.role !== 'Admin' && ['CLIENTES', 'PEDIDOS', 'BLING'].includes(activeTab)) {
      setActiveTab('PROMOTORA');
      setSyncNotice({
        message: 'Acesso Restrito: As abas Clientes, Financeiro, Pedidos e Bling são exclusivas para Administradores.',
        type: 'error'
      });
      setTimeout(() => setSyncNotice(null), 6000);
    }
  }, [activePromotora?.role, activeTab]);

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
          setMetasVendas(store.metasVendas || []);
          setBlingConfig(store.blingConfig || {});

          if (store.promotoras && store.promotoras.length > 0) {
            const savedId = localStorage.getItem('safira_active_user_id');
            const savedUser = store.promotoras.find((p: any) => p.id === savedId);
            if (savedUser) {
              setActivePromotora(savedUser);
            } else {
              const adminUser = store.promotoras.find((p: any) => p.role === 'Admin');
              setActivePromotora(adminUser || store.promotoras[0]);
            }
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

  const handleSelectUser = (user: Promotora) => {
    setActivePromotora(user);
    localStorage.setItem('safira_active_user_id', user.id);

    // If switched to a Promotora and current tab is admin-only, redirect to PROMOTORA tab
    if (user.role === 'Promotora' && ['CLIENTES', 'PEDIDOS', 'BLING'].includes(activeTab)) {
      setActiveTab('PROMOTORA');
    }
  };

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

  const handleSaveMetas = async (updatedMetas: MetaVendaPromotora[]) => {
    setMetasVendas(updatedMetas);
    await saveToBackend({
      promotoras,
      clientes,
      produtos,
      pedidos,
      visitas,
      escalas,
      atestados,
      metasVendas: updatedMetas,
      blingConfig
    });
  };

  const handleSaveBlingConfig = async (updated: Partial<BlingConfig>) => {
    const updatedConfig = { ...blingConfig, ...updated };
    setBlingConfig(updatedConfig);

    try {
      await fetch('/api/bling/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
    } catch (e) {
      console.error("Error posting /api/bling/config", e);
    }

    await saveToBackend({
      promotoras,
      clientes,
      produtos,
      pedidos,
      visitas,
      escalas,
      atestados,
      metasVendas,
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

  const handleDeleteClientesBulk = async (ids: string[]) => {
    const updatedClientes = clientes.filter(c => !ids.includes(c.id));
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
      const data = await res.json();
      
      if (data.blingConfig) setBlingConfig(data.blingConfig);
      if (data.clientes) setClientes(data.clientes);
      if (data.pedidos) setPedidos(data.pedidos);
      if (data.produtos) setProdutos(data.produtos);

      // Save immediately to backend/Firestore
      await saveToBackend({
        promotoras,
        clientes: data.clientes || clientes,
        produtos: data.produtos || produtos,
        pedidos: data.pedidos || pedidos,
        visitas,
        escalas,
        atestados,
        blingConfig: data.blingConfig || blingConfig
      });

      if (res.ok && data.success) {
        setSyncNotice({
          message: data.message || `Sincronização com o Bling ERP realizada com sucesso!`,
          type: 'success'
        });
      } else {
        setSyncNotice({
          message: data.message || 'Não foi possível importar do Bling. Verifique se seu Access Token / API Key do Bling está preenchido e válido.',
          type: 'error'
        });
      }
    } catch (e) {
      console.error("Failed to sync with Bling ERP", e);
      setSyncNotice({
        message: 'Erro de conexão ao sincronizar com o Bling ERP.',
        type: 'error'
      });
    } finally {
      setSyncing(false);
      setTimeout(() => {
        setSyncNotice(null);
      }, 7000);
    }
  };

  const handleClearTestData = async () => {
    try {
      const res = await fetch('/api/bling/clear-test-data', { method: 'POST' });
      const data = await res.json();
      if (data.pedidos) setPedidos(data.pedidos);
      if (data.clientes) setClientes(data.clientes);
      
      await saveToBackend({
        promotoras,
        clientes: data.clientes || clientes,
        produtos,
        pedidos: data.pedidos || pedidos,
        visitas,
        escalas,
        atestados,
        blingConfig
      });

      setSyncNotice({
        message: data.message || 'Pedidos de teste removidos com sucesso!',
        type: 'success'
      });
    } catch (e) {
      console.error("Failed to clear test data", e);
    } finally {
      setTimeout(() => setSyncNotice(null), 5000);
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
        activeUser={activePromotora}
        promotoras={promotoras}
        onSelectUser={handleSelectUser}
        onOpenAuthModal={() => setShowAuthModal(true)}
        authUser={authUser}
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
            onDeleteClientesBulk={handleDeleteClientesBulk}
          />
        )}

        {activeTab === 'DASHBOARD' && !isStandaloneMode && (
          <DashboardBI
            promotoras={promotoras}
            clientes={clientes}
            visitas={visitas}
            produtos={produtos}
            pedidos={pedidos}
            metasVendas={metasVendas}
            onSaveMetas={handleSaveMetas}
            currentUser={activePromotora}
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
            onClearTestData={handleClearTestData}
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
            onClearTestData={handleClearTestData}
            onUpdateCliente={handleUpdateCliente}
            onDeleteCliente={handleDeleteCliente}
            onDeleteClientesBulk={handleDeleteClientesBulk}
          />
        )}
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        authUser={authUser}
        activePromotora={activePromotora}
        promotoras={promotoras}
        onSelectUser={handleSelectUser}
      />
    </div>
  );
}
