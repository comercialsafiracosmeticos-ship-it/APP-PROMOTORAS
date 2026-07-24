import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PromotoraConsole from './components/PromotoraConsole';
import BlingPanel from './components/BlingPanel';
import ClientFinancePanel from './components/ClientFinancePanel';
import DashboardBI from './components/DashboardBI';
import SalesOrdersPanel from './components/SalesOrdersPanel';
import AuthModal from './components/AuthModal';
import OfflineStatusBanner from './components/OfflineStatusBanner';
import { setLocalCache, getLocalCache, getPendingVisitas, syncPendingVisitasToFirestore } from './lib/offlineManager';
import { 
  Promotora, Cliente, Pedido, Produto, Visita, Escala, Atestado, BlingConfig, MetaVendaPromotora, NotificacaoMeta 
} from './types';
import { Sparkles, Compass, AlertCircle, ShoppingBag, Loader2, ArrowRight, LogIn } from 'lucide-react';
import { 
  auth, 
  onAuthStateChanged, 
  firebaseSignOut,
  testFirestoreConnection, 
  FirebaseUser, 
  saveVisitaToFirestore, 
  updateVisitaInFirestore, 
  saveBlingConfigToFirestore, 
  getBlingConfigFromFirestore,
  savePromotoraToFirestore,
  updatePromotoraInFirestore,
  deletePromotoraFromFirestore,
  getPromotorasFromFirestore
} from './lib/firebase';

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
  const [notificacoes, setNotificacoes] = useState<NotificacaoMeta[]>(() => {
    try {
      const saved = localStorage.getItem('safira_notificacoes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('safira_notificacoes', JSON.stringify(notificacoes));
    } catch (e) {}
  }, [notificacoes]);

  const handleMarkNotificacaoRead = (id: string) => {
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  };

  const handleClearAllNotificacoes = (promotoraId?: string) => {
    if (promotoraId) {
      setNotificacoes(prev => prev.map(n => n.promotoraId === promotoraId ? { ...n, lida: true } : n));
    } else {
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    }
  };
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
          let activeProms = store.promotoras || [];

          // Query Firestore directly for promotoras if available
          try {
            const fsProms = await getPromotorasFromFirestore();
            if (fsProms && fsProms.length > 0) {
              activeProms = fsProms;
            }
          } catch (err) {
            console.warn("Could not fetch promotoras directly from Firestore:", err);
          }

          // Ensure Anny is registered in the active team
          const hasAnny = activeProms.some((p: Promotora) => p.nome?.toLowerCase().includes('anny'));
          if (!hasAnny) {
            const annyProm: Promotora = {
              id: 'prom-05',
              nome: 'Anny',
              codigoBling: 'PROM07',
              telefone: '(27) 99999-8888',
              email: 'anny.promotora@safira.com.br',
              usuario: 'anny',
              senha: 'safira123',
              status: 'Ativa',
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              role: 'Promotora'
            };
            activeProms.push(annyProm);
            savePromotoraToFirestore(annyProm).catch(() => {});
          }

          setPromotoras(activeProms);
          setLocalCache('promotoras', activeProms);

          const loadedClientes = store.clientes || [];
          const loadedVisitas = store.visitas || [];
          const loadedEscalas = store.escalas || [];

          setClientes(loadedClientes);
          setLocalCache('clientes', loadedClientes);

          setProdutos(store.produtos || []);
          setPedidos(store.pedidos || []);

          setVisitas(loadedVisitas);
          setLocalCache('visitas', loadedVisitas);

          setEscalas(loadedEscalas);
          setLocalCache('escalas', loadedEscalas);

          setAtestados(store.atestados || []);
          setMetasVendas(store.metasVendas || []);
          
          let serverBling = store.blingConfig || {};
          
          // Check localStorage fallback for persisted credentials
          let localBling: any = null;
          try {
            const raw = localStorage.getItem('safira_bling_config');
            if (raw) localBling = JSON.parse(raw);
          } catch (e) {
            console.error("Error reading safira_bling_config from localStorage", e);
          }

          // Merge: local storage / Firestore > server defaults
          let finalBlingConfig = { ...serverBling };
          if (localBling) {
            if (localBling.apiKey) finalBlingConfig.apiKey = localBling.apiKey;
            if (localBling.clientId) finalBlingConfig.clientId = localBling.clientId;
            if (localBling.clientSecret) finalBlingConfig.clientSecret = localBling.clientSecret;
            if (localBling.aliasServidor) finalBlingConfig.aliasServidor = localBling.aliasServidor;
            if (localBling.webhookAtivo !== undefined) finalBlingConfig.webhookAtivo = localBling.webhookAtivo;
          }

          // Fetch directly from Firestore doc settings/bling if local & server lack credentials
          if (!finalBlingConfig.apiKey && !finalBlingConfig.clientId) {
            try {
              const fsBling = await getBlingConfigFromFirestore();
              if (fsBling) {
                finalBlingConfig = { ...finalBlingConfig, ...fsBling };
              }
            } catch (err) {
              console.error("Error loading Bling config from Firestore", err);
            }
          }

          setBlingConfig(finalBlingConfig);
          if (finalBlingConfig.apiKey || finalBlingConfig.clientId) {
            localStorage.setItem('safira_bling_config', JSON.stringify(finalBlingConfig));
            // Sync to backend to keep server memory updated
            fetch('/api/bling/config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(finalBlingConfig)
            }).catch(() => {});
          }

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
        console.warn("Dispositivo offline ou erro de servidor. Carregando rotas e check-ins do cache local...", e);
        const cachedVisitas = getLocalCache<Visita[]>('visitas', []);
        const cachedClientes = getLocalCache<Cliente[]>('clientes', []);
        const cachedEscalas = getLocalCache<Escala[]>('escalas', []);
        const cachedPromotoras = getLocalCache<Promotora[]>('promotoras', []);
        
        if (cachedVisitas.length > 0) setVisitas(cachedVisitas);
        if (cachedClientes.length > 0) setClientes(cachedClientes);
        if (cachedEscalas.length > 0) setEscalas(cachedEscalas);
        if (cachedPromotoras.length > 0) {
          setPromotoras(cachedPromotoras);
          const savedId = localStorage.getItem('safira_active_user_id');
          const savedUser = cachedPromotoras.find((p) => p.id === savedId);
          setActivePromotora(savedUser || cachedPromotoras[0]);
        }
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

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn("Erro ao deslogar do Firebase:", e);
    }
    localStorage.removeItem('safira_active_user_id');
    setActivePromotora(null);
    setShowAuthModal(true);
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

  // State mutation actions synced with backend & Cloud Firestore
  const handleAddPromotora = async (p: Omit<Promotora, 'id'>) => {
    const newProm: Promotora = {
      id: 'prom-' + Math.random().toString(36).substr(2, 9),
      ...p
    };
    const updatedProms = [...promotoras, newProm];
    setPromotoras(updatedProms);
    
    try {
      localStorage.setItem('safira_promotoras_cache', JSON.stringify(updatedProms));
    } catch (e) {}
    savePromotoraToFirestore(newProm).catch(err => console.warn("Erro ao salvar promotora no Firestore:", err));

    await saveToBackend({
      promotoras: updatedProms,
      clientes,
      produtos,
      pedidos,
      visitas,
      escalas,
      atestados,
      metasVendas,
      blingConfig
    });
  };

  const handleDeletePromotora = async (id: string) => {
    const updatedProms = promotoras.filter(p => p.id !== id);
    setPromotoras(updatedProms);
    if (activePromotora?.id === id && updatedProms.length > 0) {
      setActivePromotora(updatedProms[0]);
    }

    try {
      localStorage.setItem('safira_promotoras_cache', JSON.stringify(updatedProms));
    } catch (e) {}
    deletePromotoraFromFirestore(id).catch(err => console.warn("Erro ao excluir promotora do Firestore:", err));

    await saveToBackend({
      promotoras: updatedProms,
      clientes,
      produtos,
      pedidos,
      visitas,
      escalas,
      atestados,
      metasVendas,
      blingConfig
    });
  };

  const handleUpdatePromotora = async (id: string, updated: Partial<Promotora>) => {
    const updatedProms = promotoras.map(p => p.id === id ? { ...p, ...updated } : p);
    setPromotoras(updatedProms);
    const activeMatch = updatedProms.find(p => p.id === activePromotora?.id);
    if (activeMatch) setActivePromotora(activeMatch);

    try {
      localStorage.setItem('safira_promotoras_cache', JSON.stringify(updatedProms));
    } catch (e) {}
    updatePromotoraInFirestore(id, updated).catch(err => console.warn("Erro ao atualizar promotora no Firestore:", err));

    await saveToBackend({
      promotoras: updatedProms,
      clientes,
      produtos,
      pedidos,
      visitas,
      escalas,
      atestados,
      metasVendas,
      blingConfig
    });
  };

  const handleAddVisita = async (v: Omit<Visita, 'id'>) => {
    let gps = v.gpsEntrada;

    // Captura de coordenadas GPS utilizando a API de geolocalização do navegador
    if ((!gps || !gps.lat) && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 6000,
            maximumAge: 0
          });
        });
        gps = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy)
        };
      } catch (err) {
        console.warn("Navegador não capturou GPS via Geolocation API, utilizando fallback:", err);
      }
    }

    const newVisit: Visita = {
      id: 'vis-' + Math.random().toString(36).substr(2, 9),
      ...v,
      gpsEntrada: gps || v.gpsEntrada || { lat: -20.3155, lng: -40.3121, accuracy: 10 }
    };
    const updatedVisits = [...visitas, newVisit];
    setVisitas(updatedVisits);
    setLocalCache('visitas', updatedVisits);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncNotice({
        message: `📱 Check-in em "${newVisit.clienteNome}" realizado com sucesso e salvo no celular (Modo Offline). Será enviado ao Firestore assim que houver conexão.`,
        type: 'success'
      });
      setTimeout(() => setSyncNotice(null), 6000);
    }

    // Persist to Firestore
    saveVisitaToFirestore(newVisit).catch(err => console.warn("Erro ao salvar no Firestore:", err));

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
    setLocalCache('visitas', updatedVisits);

    const target = updatedVisits.find(v => v.id === id);
    if (typeof navigator !== 'undefined' && !navigator.onLine && target) {
      setSyncNotice({
        message: `📱 Check-in/Checkout em "${target.clienteNome}" atualizado e salvo localmente (Modo Offline).`,
        type: 'success'
      });
      setTimeout(() => setSyncNotice(null), 6000);
    }

    // Persist to Firestore
    updateVisitaInFirestore(id, updated).catch(err => console.warn("Erro ao atualizar no Firestore:", err));

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
    // Generate notification alerts for updated or added sales goals
    const newNotifs: NotificacaoMeta[] = [];
    updatedMetas.forEach(m => {
      const prev = metasVendas.find(o => o.promotoraId === m.promotoraId && o.mesAno === m.mesAno);
      if (!prev || prev.metaValor !== m.metaValor) {
        newNotifs.push({
          id: 'notif-' + Math.random().toString(36).substring(2, 9),
          promotoraId: m.promotoraId,
          promotoraNome: m.promotoraNome,
          titulo: '🎯 Nova Meta de Vendas Atribuída',
          mensagem: `O administrador definiu uma nova meta de vendas no valor de R$ ${m.metaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para o mês ${m.mesAno}.`,
          data: new Date().toISOString(),
          lida: false,
          tipo: 'meta',
          metaValor: m.metaValor,
          mesAno: m.mesAno
        });
      }
    });

    if (newNotifs.length > 0) {
      setNotificacoes(prev => [...newNotifs, ...prev]);
    }

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
    
    // Save to localStorage as immediate persistent backup
    localStorage.setItem('safira_bling_config', JSON.stringify(updatedConfig));

    // Save directly to Firestore doc
    saveBlingConfigToFirestore(updatedConfig);

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
      setSyncing(true);
      const res = await fetch('/api/admin/reset-production', { method: 'POST' });
      const data = await res.json();
      
      setVisitas([]);
      setEscalas([]);
      setAtestados([]);
      setMetasVendas([]);
      setPedidos([]);
      setClientes([]);
      if (data.store?.promotoras) {
        setPromotoras(data.store.promotoras);
        try {
          localStorage.setItem('safira_promotoras_cache', JSON.stringify(data.store.promotoras));
        } catch (e) {}
      }
      if (data.store?.blingConfig) {
        setBlingConfig(data.store.blingConfig);
      }

      setSyncNotice({
        message: '🚀 Modo Produção Ativado! Histórico de visitas, relatórios de produtividade, números do BI e pedidos de teste foram zerados de forma definitiva. A equipe de promotoras (incluindo Anny) e a conexão do Bling foram salvas no Cloud Firestore com sucesso.',
        type: 'success'
      });
    } catch (e) {
      console.error("Failed to reset production data", e);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncNotice(null), 8000);
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

  if (!activePromotora) {
    return (
      <div className="bg-[#0F0F10] min-h-screen text-[#E0E0E0] font-sans flex flex-col justify-between">
        <Navbar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isStandaloneMode={isStandaloneMode} 
          activeUser={null}
          promotoras={promotoras}
          onSelectUser={handleSelectUser}
          onOpenAuthModal={() => setShowAuthModal(true)}
          onLogout={handleLogout}
          authUser={authUser}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#161618] border border-white/10 rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center font-bold text-gray-950 font-display text-2xl mx-auto shadow-lg shadow-amber-500/20">
              S
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-white">Sessão Encerrada</h2>
              <p className="text-xs text-gray-400 mt-1">Você saiu do Portal Comercial Safira Cosméticos. Faça login para acessar suas rotas e check-ins.</p>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-gray-950 font-extrabold px-6 py-3 rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>Fazer Login / Entrar no Sistema</span>
            </button>
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            if (!activePromotora && promotoras.length > 0) {
              setActivePromotora(promotoras[0]);
            }
            setShowAuthModal(false);
          }}
          authUser={authUser}
          activePromotora={activePromotora}
          promotoras={promotoras}
          onSelectUser={handleSelectUser}
        />
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
        onLogout={handleLogout}
        authUser={authUser}
        notificacoes={notificacoes}
        onMarkNotificacaoRead={handleMarkNotificacaoRead}
        onClearAllNotificacoes={handleClearAllNotificacoes}
      />

      {/* Offline Support Status Banner */}
      <OfflineStatusBanner />

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
            activePromotora={activePromotora}
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
            onLogout={handleLogout}
            notificacoes={notificacoes}
            onMarkNotificacaoRead={handleMarkNotificacaoRead}
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
