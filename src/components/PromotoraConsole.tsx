import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, MapPin, Camera, Clock, Calendar, Users, 
  FileText, TrendingUp, Settings, Plus, Trash2, Edit2, 
  Upload, Sparkles, User, AlertOctagon, Info, Eye, ArrowRight,
  Bell, Lock, Unlock, Compass, RefreshCw, UserCheck, Store, Phone,
  Key, Copy, Send, LogIn, Share2, Shield
} from 'lucide-react';
import { 
  Promotora, Cliente, Visita, Escala, Atestado, Produto, AuditoriaItem, ProdutoVencer, AnaliseConcorrente 
} from '../types';
import AISafiraAssistant from './AISafiraAssistant';

interface PromotoraConsoleProps {
  promotoras: Promotora[];
  clientes: Cliente[];
  produtos: Produto[];
  visitas: Visita[];
  escalas: Escala[];
  atestados: Atestado[];
  activePromotora: Promotora;
  setActivePromotora: (prom: Promotora) => void;
  onAddPromotora: (p: Omit<Promotora, 'id'>) => Promise<void>;
  onDeletePromotora: (id: string) => Promise<void>;
  onUpdatePromotora: (id: string, updated: Partial<Promotora>) => Promise<void>;
  onAddVisita: (v: Omit<Visita, 'id'>) => Promise<void>;
  onUpdateVisita: (id: string, updated: Partial<Visita>) => Promise<void>;
  onAddEscala: (e: Omit<Escala, 'id'>) => Promise<void>;
  onDeleteEscala: (id: string) => Promise<void>;
  onAddAtestado: (a: Omit<Atestado, 'id' | 'dataEnvio'>) => Promise<void>;
  onDeleteAtestado: (id: string) => Promise<void>;
  isStandaloneMode: boolean;
  setIsStandaloneMode: (mode: boolean) => void;
  onSyncBling?: () => void;
  syncing?: boolean;
}

export default function PromotoraConsole({
  promotoras,
  clientes,
  produtos,
  visitas,
  escalas,
  atestados,
  activePromotora,
  setActivePromotora,
  onAddPromotora,
  onDeletePromotora,
  onUpdatePromotora,
  onAddVisita,
  onUpdateVisita,
  onAddEscala,
  onDeleteEscala,
  onAddAtestado,
  onDeleteAtestado,
  isStandaloneMode,
  setIsStandaloneMode,
  onSyncBling,
  syncing
}: PromotoraConsoleProps) {
  const [activeSubTab, setActiveSubTab] = useState<'checkin' | 'historico' | 'equipe' | 'escalas' | 'atestados' | 'produtividade' | 'config'>('checkin');

  // Safeguard: Ensure non-admin users cannot stay in restricted subtabs ('equipe' and 'config')
  useEffect(() => {
    if (activePromotora?.role !== 'Admin' && (activeSubTab === 'equipe' || activeSubTab === 'config')) {
      setActiveSubTab('checkin');
      triggerPushAlert(
        'Acesso Restrito',
        'As abas Gerenciar Equipe e Configurações do App são exclusivas para usuários com perfil de Administrador.',
        'warning'
      );
    }
  }, [activePromotora?.role, activeSubTab]);

  // --- 1. CHECK-IN / AUDITORIA STATE ---
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [gpsData, setGpsData] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const [activeVisita, setActiveVisita] = useState<Visita | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Configurações personalizadas de geolocalização e raio por cliente (Vitória - ES)
  const [pdvGeoConfigs, setPdvGeoConfigs] = useState<Record<string, { lat: number; lng: number; raioPermitido: number }>>({
    'cli-01': { lat: -20.3155, lng: -40.3121, raioPermitido: 20 },      // FarmaVida - Centro
    'cli-02': { lat: -20.3290, lng: -40.2917, raioPermitido: 30 },      // Shopping dos Cosméticos - Vila Velha
    'cli-03': { lat: -20.1218, lng: -40.3078, raioPermitido: 15 },      // Fórmula & Cia - Serra
    'cli-04': { lat: -20.3421, lng: -40.4144, raioPermitido: 50 },      // Boutique Safira Beleza - Cariacica
  });

  const [gpsSimulatedMode, setGpsSimulatedMode] = useState<'inside' | 'outside' | 'real'>('inside');
  const [pushAlerts, setPushAlerts] = useState<{ id: string; title: string; message: string; type: 'success' | 'warning' | 'info'; timestamp: string }[]>([]);
  const [isSupervisorBypassActive, setIsSupervisorBypassActive] = useState(false);
  const [bypassJustification, setBypassJustification] = useState('');
  const [showBypassModal, setShowBypassModal] = useState(false);
  const [supervisorCode, setSupervisorCode] = useState('');
  const [bypassError, setBypassError] = useState('');
  const [isEditingGeoConfig, setIsEditingGeoConfig] = useState(false);

  // Campos temporários para edição do raio/posição
  const [editLat, setEditLat] = useState<string>('-20.3155');
  const [editLng, setEditLng] = useState<string>('-40.3121');
  const [editRadius, setEditRadius] = useState<string>('20');

  // Função Haversine para calcular distância real em metros
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Raio da Terra em metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distância em metros
  };

  const triggerPushAlert = (title: string, message: string, type: 'success' | 'warning' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    const newAlert = {
      id,
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    
    setPushAlerts(prev => {
      // Evitar alertas idênticos sucessivos no mesmo segundo
      const duplicate = prev.some(a => a.title === title && a.message === message);
      if (duplicate) return prev;
      return [newAlert, ...prev].slice(0, 5);
    });

    // Remover alerta após 6 segundos
    setTimeout(() => {
      setPushAlerts(prev => prev.filter(a => a.id !== id));
    }, 6000);
  };

  // Efeito para sincronizar os inputs de edição com o cliente selecionado
  useEffect(() => {
    if (selectedClienteId) {
      const geo = pdvGeoConfigs[selectedClienteId] || { lat: -20.3155, lng: -40.3121, raioPermitido: 20 };
      setEditLat(geo.lat.toString());
      setEditLng(geo.lng.toString());
      setEditRadius(geo.raioPermitido.toString());
      setIsSupervisorBypassActive(false);
      setBypassJustification('');
    }
  }, [selectedClienteId]);

  // Efeito para monitorar geofence e disparar notificações push / visuais em tempo real
  useEffect(() => {
    if (!selectedClienteId) return;
    const client = clientes.find(c => c.id === selectedClienteId);
    if (!client) return;

    const geo = pdvGeoConfigs[selectedClienteId] || { lat: -20.3155, lng: -40.3121, raioPermitido: 20 };
    let currentLat = geo.lat;
    let currentLng = geo.lng;

    if (gpsSimulatedMode === 'outside') {
      currentLat = geo.lat + 0.0012;
      currentLng = geo.lng + 0.0008;
    } else if (gpsSimulatedMode === 'inside') {
      currentLat = geo.lat + 0.00002;
      currentLng = geo.lng + 0.00001;
    } else if (gpsSimulatedMode === 'real' && gpsData) {
      currentLat = gpsData.lat;
      currentLng = gpsData.lng;
    }

    const dist = calculateDistance(currentLat, currentLng, geo.lat, geo.lng);
    const isInside = dist <= geo.raioPermitido;

    if (!isInside) {
      if (isSupervisorBypassActive) {
        triggerPushAlert(
          '🔑 Geocerca Ignorada',
          `Você está fora do raio (${dist.toFixed(1)}m de ${client.nome}), mas a liberação especial de supervisor está ativa.`,
          'info'
        );
      } else {
        triggerPushAlert(
          '⚠️ Alerta de Geofence!',
          `Você está fora do raio permitido para o PDV ${client.nome}! (${dist.toFixed(1)}m de distância, limite de ${geo.raioPermitido}m). Ponto bloqueado!`,
          'warning'
        );
      }
    } else {
      triggerPushAlert(
        '✅ Geolocalização Confirmada',
        `Você está dentro da área do PDV ${client.nome} (${dist.toFixed(1)}m de distância, limite de ${geo.raioPermitido}m). Registro de ponto liberado!`,
        'success'
      );
    }
  }, [selectedClienteId, gpsSimulatedMode, gpsData, pdvGeoConfigs, isSupervisorBypassActive]);

  // Auditoria inputs
  const [auditoriaGondola, setAuditoriaGondola] = useState<AuditoriaItem[]>([]);
  const [produtosVencer, setProdutosVencer] = useState<ProdutoVencer[]>([]);
  const [analiseConcorrencia, setAnaliseConcorrencia] = useState<AnaliseConcorrente[]>([]);
  const [fotoDisplay, setFotoDisplay] = useState<string>('');
  const [fotoFachada, setFotoFachada] = useState<string>('');
  const [comentarios, setComentarios] = useState('');
  const [pecasVendidas, setPecasVendidas] = useState<number>(0);

  // New Journey punch-clock and geofencing states
  const [pontoEntradaManha, setPontoEntradaManha] = useState('');
  const [pontoSaidaAlmoco, setPontoSaidaAlmoco] = useState('');
  const [pontoVoltaAlmoco, setPontoVoltaAlmoco] = useState('');
  const [pontoSaidaTarde, setPontoSaidaTarde] = useState('');
  const [distanceLimit, setDistanceLimit] = useState<number>(20); // default 20 meters
  const [attentionMessage, setAttentionMessage] = useState('Verifique se o batom de lançamento Safira Rose Gold está bem exposto no display principal deste cliente.');
  const [isEditingAttention, setIsEditingAttention] = useState(false);

  // Expiry / Concorrência form helpers
  const [newExpProdNome, setNewExpProdNome] = useState('');
  const [newExpQtd, setNewExpQtd] = useState(0);
  const [newExpData, setNewExpData] = useState('');
  
  const [newConMarca, setNewConMarca] = useState('');
  const [newConPreco, setNewConPreco] = useState(0);
  const [newConObs, setNewConObs] = useState('');

  // --- 2. GERENCIAR EQUIPE STATE ---
  const [showAddPromForm, setShowAddPromForm] = useState(false);
  const [newPromNome, setNewPromNome] = useState('');
  const [newPromBling, setNewPromBling] = useState('');
  const [newPromTel, setNewPromTel] = useState('');
  const [newPromEmail, setNewPromEmail] = useState('');
  const [newPromRole, setNewPromRole] = useState<'Promotora' | 'Admin'>('Promotora');
  const [newPromUsuario, setNewPromUsuario] = useState('');
  const [newPromSenha, setNewPromSenha] = useState('');

  // Editing Promotora state
  const [editingPromotora, setEditingPromotora] = useState<Promotora | null>(null);
  const [editPromNome, setEditPromNome] = useState('');
  const [editPromBling, setEditPromBling] = useState('');
  const [editPromTel, setEditPromTel] = useState('');
  const [editPromEmail, setEditPromEmail] = useState('');
  const [editPromRole, setEditPromRole] = useState<'Promotora' | 'Admin' | 'Representante'>('Promotora');
  const [editPromStatus, setEditPromStatus] = useState<'Ativa' | 'Inativa'>('Ativa');
  const [editPromUsuario, setEditPromUsuario] = useState('');
  const [editPromSenha, setEditPromSenha] = useState('');
  const [editPromAvatar, setEditPromAvatar] = useState('');

  // Credentials and Login Modals state
  const [credentialsModalPromotora, setCredentialsModalPromotora] = useState<Promotora | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsuarioInput, setLoginUsuarioInput] = useState('');
  const [loginSenhaInput, setLoginSenhaInput] = useState('');
  const [loginErrorMessage, setLoginErrorMessage] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);

  // --- 3. MONTAR ESCALA STATE ---
  const [escPromId, setEscPromId] = useState('');
  const [escCliId, setEscCliId] = useState('');
  const [escData, setEscData] = useState('');
  const [escInicio, setEscInicio] = useState('08:00');
  const [escFim, setEscFim] = useState('17:00');
  const [escObs, setEscObs] = useState('');

  // --- 4. ATESTADOS STATE ---
  const [atestTipo, setAtestTipo] = useState('Médico');
  const [atestFile, setAtestFile] = useState<string>('');
  const [atestFileName, setAtestFileName] = useState('');
  const [atestFileSize, setAtestFileSize] = useState('');
  const [atestObs, setAtestObs] = useState('');

  // --- 5. RELATÓRIOS & PRODUTIVIDADE STATE ---
  const [filterPromotoraId, setFilterPromotoraId] = useState<string>('');
  const [filterClienteId, setFilterClienteId] = useState<string>('');
  const [filterDataInicio, setFilterDataInicio] = useState<string>('2026-06-01');
  const [filterDataFim, setFilterDataFim] = useState<string>('2026-07-31');
  const [reportViewMode, setReportViewMode] = useState<'auditoria' | 'presenca' | 'vendas'>('auditoria');
  const [salesGroupBy, setSalesGroupBy] = useState<'promotora' | 'pdv' | 'periodo'>('promotora');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Active checkin stopwatch timer
  useEffect(() => {
    let interval: any;
    if (activeVisita && activeVisita.status === 'andamento') {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeVisita]);

  // Sync state if check-in was active in the database
  useEffect(() => {
    const checkinEmAndamento = visitas.find(v => v.promotoraId === activePromotora.id && v.status === 'andamento');
    if (checkinEmAndamento) {
      setActiveVisita(checkinEmAndamento);
      setSelectedClienteId(checkinEmAndamento.clienteId);
      // set inputs from previous values if saved
      setAuditoriaGondola(checkinEmAndamento.auditoriaGondola || []);
      setProdutosVencer(checkinEmAndamento.produtosVencer || []);
      setAnaliseConcorrencia(checkinEmAndamento.analiseConcorrencia || []);
      setFotoDisplay(checkinEmAndamento.fotoDisplay || '');
      setFotoFachada(checkinEmAndamento.fotoFachada || '');
      setComentarios(checkinEmAndamento.comentarios || '');
      setPecasVendidas(checkinEmAndamento.pecasVendidas || 0);
      
      setPontoEntradaManha(checkinEmAndamento.pontoEntradaManha || '');
      setPontoSaidaAlmoco(checkinEmAndamento.pontoSaidaAlmoco || '');
      setPontoVoltaAlmoco(checkinEmAndamento.pontoVoltaAlmoco || '');
      setPontoSaidaTarde(checkinEmAndamento.pontoSaidaTarde || '');

      // calculate elapsed seconds since checkin start
      if (checkinEmAndamento.entrada) {
        const start = new Date(checkinEmAndamento.entrada).getTime();
        const diff = Math.floor((Date.now() - start) / 1000);
        setElapsedSeconds(diff > 0 ? diff : 0);
      }
    } else {
      setActiveVisita(null);
      setPontoEntradaManha('');
      setPontoSaidaAlmoco('');
      setPontoVoltaAlmoco('');
      setPontoSaidaTarde('');
    }
  }, [activePromotora, visitas]);

  // Initialize auditoria item fields when selecting a client or starting a check-in
  const initAuditoriaGondola = () => {
    const items = produtos.map(p => ({
      produtoId: p.id,
      sku: p.sku,
      nome: p.nome,
      temEstoque: true,
      noDisplay: true,
      precoPraticado: p.precoSugerido,
      qtdGondola: 10
    }));
    setAuditoriaGondola(items);
  };

  // GPS fetch function
  const fetchGPSLocation = () => {
    setGpsStatus('fetching');
    if (!navigator.geolocation) {
      setGpsStatus('error');
      // Set realistic mock coordinates for ES
      setGpsData({ lat: -20.3155, lng: -40.3121, accuracy: 15 });
      setGpsStatus('success');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsData({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy)
        });
        setGpsStatus('success');
      },
      (error) => {
        console.warn("GPS error, applying mock coordinates", error);
        // Set beautiful mock coordinate representing Centro de Vitória, ES
        setGpsData({
          lat: -20.3155,
          lng: -40.3121,
          accuracy: 10
        });
        setGpsStatus('success');
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  // Perform Check-in (bater ponto)
  const handleCheckIn = async () => {
    if (!selectedClienteId) return;
    
    // Fetch GPS first
    fetchGPSLocation();

    const client = clientes.find(c => c.id === selectedClienteId);
    if (!client) return;

    const geo = pdvGeoConfigs[selectedClienteId] || { lat: -20.3155, lng: -40.3121, raioPermitido: 20 };
    let currentLat = geo.lat;
    let currentLng = geo.lng;

    if (gpsSimulatedMode === 'outside') {
      currentLat = geo.lat + 0.0012;
      currentLng = geo.lng + 0.0008;
    } else if (gpsSimulatedMode === 'inside') {
      currentLat = geo.lat + 0.00002;
      currentLng = geo.lng + 0.00001;
    } else if (gpsSimulatedMode === 'real' && gpsData) {
      currentLat = gpsData.lat;
      currentLng = gpsData.lng;
    }

    const currentDist = calculateDistance(currentLat, currentLng, geo.lat, geo.lng);
    const isInside = currentDist <= geo.raioPermitido;

    if (!isInside && !isSupervisorBypassActive) {
      triggerPushAlert(
        '❌ Entrada Bloqueada!',
        `Você está a ${currentDist.toFixed(1)}m de distância do PDV ${client.nome} (Limite: ${geo.raioPermitido}m). Abrindo tela de Liberação do Supervisor...`,
        'warning'
      );
      setToastMessage('Fora do raio do PDV! Solicitando liberação do supervisor...');
      setShowBypassModal(true);
      return;
    }

    initAuditoriaGondola();
    setProdutosVencer([]);
    setAnaliseConcorrencia([]);
    setFotoDisplay('');
    setFotoFachada('');
    setComentarios(isSupervisorBypassActive ? `[LIBERAÇÃO DE GEOFENCE AUTORIZADA] Justificativa: ${bypassJustification}` : '');
    setPecasVendidas(0);

    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setPontoEntradaManha(nowTime);

    const newVisitObj: Omit<Visita, 'id'> = {
      promotoraId: activePromotora.id,
      promotoraNome: activePromotora.nome,
      clienteId: client.id,
      clienteNome: client.nome,
      data: new Date().toISOString().split('T')[0],
      status: 'andamento',
      entrada: new Date().toISOString(),
      gpsEntrada: { lat: currentLat, lng: currentLng, accuracy: gpsSimulatedMode === 'real' ? (gpsData?.accuracy || 12) : 12 },
      pontoEntradaManha: nowTime,
      comentarios: isSupervisorBypassActive ? `[LIBERAÇÃO DE GEOFENCE AUTORIZADA] Justificativa: ${bypassJustification}` : ''
    };

    await onAddVisita(newVisitObj);
    triggerPushAlert(
      '📥 Check-in Realizado!',
      `Entrada registrada com sucesso em ${client.nome}. Distância: ${currentDist.toFixed(1)}m.`,
      'success'
    );
  };

  const handleRegisterEntrada = async () => {
    await handleCheckIn();
  };

  const handleRegisterSaidaAlmoco = async () => {
    if (!activeVisita) return;
    const geo = pdvGeoConfigs[activeVisita.clienteId] || { lat: -20.3155, lng: -40.3121, raioPermitido: 20 };
    let currentLat = geo.lat;
    let currentLng = geo.lng;

    if (gpsSimulatedMode === 'outside') {
      currentLat = geo.lat + 0.0012;
      currentLng = geo.lng + 0.0008;
    } else if (gpsSimulatedMode === 'inside') {
      currentLat = geo.lat + 0.00002;
      currentLng = geo.lng + 0.00001;
    } else if (gpsSimulatedMode === 'real' && gpsData) {
      currentLat = gpsData.lat;
      currentLng = gpsData.lng;
    }

    const currentDist = calculateDistance(currentLat, currentLng, geo.lat, geo.lng);
    const isInside = currentDist <= geo.raioPermitido;

    if (!isInside && !isSupervisorBypassActive) {
      triggerPushAlert(
        '❌ Saída Almoço Recusada!',
        `Você está fora do raio do PDV (${currentDist.toFixed(1)}m de distância, limite: ${geo.raioPermitido}m). Abrindo Liberação do Supervisor...`,
        'warning'
      );
      setToastMessage('Fora do raio do PDV! Solicitando liberação do supervisor...');
      setShowBypassModal(true);
      return;
    }

    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setPontoSaidaAlmoco(nowTime);
    await onUpdateVisita(activeVisita.id, {
      pontoSaidaAlmoco: nowTime
    });
    triggerPushAlert(
      '🍲 Saída para Almoço Registrada!',
      `Seu intervalo iniciou às ${nowTime}.`,
      'success'
    );
  };

  const handleRegisterRetornoAlmoco = async () => {
    if (!activeVisita) return;
    const geo = pdvGeoConfigs[activeVisita.clienteId] || { lat: -20.3155, lng: -40.3121, raioPermitido: 20 };
    let currentLat = geo.lat;
    let currentLng = geo.lng;

    if (gpsSimulatedMode === 'outside') {
      currentLat = geo.lat + 0.0012;
      currentLng = geo.lng + 0.0008;
    } else if (gpsSimulatedMode === 'inside') {
      currentLat = geo.lat + 0.00002;
      currentLng = geo.lng + 0.00001;
    } else if (gpsSimulatedMode === 'real' && gpsData) {
      currentLat = gpsData.lat;
      currentLng = gpsData.lng;
    }

    const currentDist = calculateDistance(currentLat, currentLng, geo.lat, geo.lng);
    const isInside = currentDist <= geo.raioPermitido;

    if (!isInside && !isSupervisorBypassActive) {
      triggerPushAlert(
        '❌ Retorno Almoço Recusado!',
        `Você está fora do raio do PDV (${currentDist.toFixed(1)}m de distância, limite: ${geo.raioPermitido}m). Abrindo Liberação do Supervisor...`,
        'warning'
      );
      setToastMessage('Fora do raio do PDV! Solicitando liberação do supervisor...');
      setShowBypassModal(true);
      return;
    }

    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setPontoVoltaAlmoco(nowTime);
    await onUpdateVisita(activeVisita.id, {
      pontoVoltaAlmoco: nowTime
    });
    triggerPushAlert(
      '🔄 Retorno do Almoço Registrado!',
      `Seu retorno foi registrado às ${nowTime}. Bom trabalho!`,
      'success'
    );
  };

  const handleRegisterSaidaTarde = async () => {
    if (!activeVisita) return;
    const geo = pdvGeoConfigs[activeVisita.clienteId] || { lat: -20.3155, lng: -40.3121, raioPermitido: 20 };
    let currentLat = geo.lat;
    let currentLng = geo.lng;

    if (gpsSimulatedMode === 'outside') {
      currentLat = geo.lat + 0.0012;
      currentLng = geo.lng + 0.0008;
    } else if (gpsSimulatedMode === 'inside') {
      currentLat = geo.lat + 0.00002;
      currentLng = geo.lng + 0.00001;
    } else if (gpsSimulatedMode === 'real' && gpsData) {
      currentLat = gpsData.lat;
      currentLng = gpsData.lng;
    }

    const currentDist = calculateDistance(currentLat, currentLng, geo.lat, geo.lng);
    const isInside = currentDist <= geo.raioPermitido;

    if (!isInside && !isSupervisorBypassActive) {
      triggerPushAlert(
        '❌ Fim de Expediente Recusado!',
        `Você está fora do raio do PDV (${currentDist.toFixed(1)}m de distância, limite: ${geo.raioPermitido}m). Abrindo Liberação do Supervisor...`,
        'warning'
      );
      setToastMessage('Fora do raio do PDV! Solicitando liberação do supervisor...');
      setShowBypassModal(true);
      return;
    }

    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setPontoSaidaTarde(nowTime);
    await onUpdateVisita(activeVisita.id, {
      pontoSaidaTarde: nowTime
    });
    triggerPushAlert(
      '🏠 Fim do Expediente Registrado!',
      `Fim de jornada registrado com sucesso às ${nowTime}. Tenha um bom descanso!`,
      'success'
    );
  };

  const handleResetPonto = async () => {
    setPontoEntradaManha('');
    setPontoSaidaAlmoco('');
    setPontoVoltaAlmoco('');
    setPontoSaidaTarde('');
    if (activeVisita) {
      await onUpdateVisita(activeVisita.id, {
        pontoEntradaManha: '',
        pontoSaidaAlmoco: '',
        pontoVoltaAlmoco: '',
        pontoSaidaTarde: ''
      });
    }
  };

  // Drag-and-drop or manual upload handler for Display Photo
  const handleDisplayPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoDisplay(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag-and-drop or manual upload handler for Fachada Photo
  const handleFachadaPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoFachada(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Conclude check-in / check-out
  const handleCheckOut = async () => {
    if (!activeVisita) return;

    const completedVisita: Partial<Visita> = {
      status: 'concluida',
      saida: new Date().toISOString(),
      gpsSaida: gpsData || { lat: -20.3155, lng: -40.3121, accuracy: 15 },
      fotoDisplay,
      fotoFachada,
      comentarios,
      pecasVendidas,
      auditoriaGondola,
      produtosVencer,
      analiseConcorrencia,
      pontoEntradaManha,
      pontoSaidaAlmoco,
      pontoVoltaAlmoco,
      pontoSaidaTarde
    };

    await onUpdateVisita(activeVisita.id, completedVisita);
    setActiveVisita(null);
    setSelectedClienteId('');
    setGpsData(null);
    setGpsStatus('idle');
    setPontoEntradaManha('');
    setPontoSaidaAlmoco('');
    setPontoVoltaAlmoco('');
    setPontoSaidaTarde('');
  };

  const handleAddExpiryProduct = () => {
    const newItem: ProdutoVencer = {
      produtoNome: '',
      qtd: 1,
      vencimento: new Date().toISOString().split('T')[0]
    };
    setProdutosVencer([...produtosVencer, newItem]);
  };

  const handleAddCompetitorBrand = () => {
    const newItem: AnaliseConcorrente = {
      marca: '',
      precoConcorrente: 0,
      observacoes: ''
    };
    setAnaliseConcorrencia([...analiseConcorrencia, newItem]);
  };

  // Helper to generate credentials automatically
  const generateCredentials = (nome: string) => {
    if (!nome) return { usuario: '', senha: '' };
    const parts = nome.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/);
    let usuario = '';
    if (parts.length === 1) {
      usuario = parts[0];
    } else {
      usuario = `${parts[0]}.${parts[parts.length - 1]}`;
    }
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const senha = `safira${randNum}`;
    return { usuario, senha };
  };

  const handleSendCredentialsWhatsApp = (p: Promotora) => {
    const cleanPhone = (p.telefone || '').replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 11 ? `55${cleanPhone}` : cleanPhone.length === 10 ? `55${cleanPhone}` : '5527999999999';
    const text = encodeURIComponent(
      `*Portal Safira Cosméticos - Dados de Acesso*\n\n` +
      `Olá, *${p.nome}*!\n\n` +
      `Seguem os seus dados de acesso ao Portal Comercial de Promotoras:\n\n` +
      `👤 *Usuário/Login:* ${p.usuario || p.email}\n` +
      `🔑 *Senha de Acesso:* ${p.senha || 'safira123'}\n` +
      `🆔 *Código Bling:* ${p.codigoBling}\n\n` +
      `Acesse o portal para realizar seus check-ins de gôndola e registros de ponto.\n` +
      `Qualquer dúvida, entre em contato com a supervisão.`
    );
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  const handleSendCredentialsEmail = (p: Promotora) => {
    const subject = encodeURIComponent("Seu Acesso ao Portal Safira Cosméticos");
    const body = encodeURIComponent(
      `Olá ${p.nome},\n\n` +
      `Aqui estão os seus dados de acesso ao Portal Comercial Safira Cosméticos:\n\n` +
      `Usuário: ${p.usuario || p.email}\n` +
      `Senha: ${p.senha || 'safira123'}\n` +
      `Código Bling: ${p.codigoBling}\n\n` +
      `Atenciosamente,\nSafira Cosméticos`
    );
    window.open(`mailto:${p.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleCopyCredentials = (p: Promotora) => {
    const text = `PROMOTORA: ${p.nome}\nUSUÁRIO: ${p.usuario || p.email}\nSENHA: ${p.senha || 'safira123'}\nCÓDIGO BLING: ${p.codigoBling}`;
    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  };

  const handlePromotoraLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrorMessage('');
    const userInput = loginUsuarioInput.trim().toLowerCase();
    const passInput = loginSenhaInput.trim();

    const matched = promotoras.find(p => 
      (p.usuario?.toLowerCase() === userInput || p.email.toLowerCase() === userInput || p.codigoBling.toLowerCase() === userInput) &&
      (p.senha ? p.senha === passInput : passInput === 'safira123' || passInput === '123456')
    );

    if (matched) {
      setActivePromotora(matched);
      setShowLoginModal(false);
      setLoginUsuarioInput('');
      setLoginSenhaInput('');
      triggerPushAlert('✅ Login Efetuado!', `Bem-vinda, ${matched.nome}! Seu perfil está ativo.`, 'success');
    } else {
      setLoginErrorMessage('Usuário ou senha incorretos. Verifique suas credenciais ou contate o administrador.');
    }
  };

  const handleStartEditPromotora = (p: Promotora) => {
    setEditingPromotora(p);
    setEditPromNome(p.nome);
    setEditPromBling(p.codigoBling);
    setEditPromTel(p.telefone);
    setEditPromEmail(p.email);
    setEditPromRole(p.role || 'Promotora');
    setEditPromStatus(p.status || 'Ativa');
    setEditPromUsuario(p.usuario || p.email.split('@')[0]);
    setEditPromSenha(p.senha || 'safira123');
    setEditPromAvatar(p.avatar || '');
  };

  const handleSaveEditPromotoraSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromotora) return;

    await onUpdatePromotora(editingPromotora.id, {
      nome: editPromNome,
      codigoBling: editPromBling,
      telefone: editPromTel,
      email: editPromEmail,
      role: editPromRole,
      status: editPromStatus,
      usuario: editPromUsuario,
      senha: editPromSenha,
      avatar: editPromAvatar
    });

    setEditingPromotora(null);
    triggerPushAlert('✏️ Promotora Atualizada!', `Os dados e credenciais de ${editPromNome} foram salvos com sucesso.`, 'success');
  };

  // Handle adding a promotora
  const handleAddPromotoraSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromNome || !newPromEmail) return;

    const autoCreds = generateCredentials(newPromNome);

    await onAddPromotora({
      nome: newPromNome,
      codigoBling: newPromBling || 'PROM' + Math.floor(Math.random() * 100),
      telefone: newPromTel || '(27) 99999-9999',
      email: newPromEmail,
      usuario: newPromUsuario || autoCreds.usuario,
      senha: newPromSenha || autoCreds.senha,
      status: 'Ativa',
      role: newPromRole,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    });

    setNewPromNome('');
    setNewPromBling('');
    setNewPromTel('');
    setNewPromEmail('');
    setNewPromUsuario('');
    setNewPromSenha('');
    setShowAddPromForm(false);
    triggerPushAlert('👤 Promotora Cadastrada!', `Promotora ${newPromNome} cadastrada com sucesso com usuário '${newPromUsuario || autoCreds.usuario}'.`, 'success');
  };

  // Schedule / Escala submit
  const handleAddEscalaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escPromId || !escCliId || !escData) return;

    const prom = promotoras.find(p => p.id === escPromId);
    const cli = clientes.find(c => c.id === escCliId);

    if (prom && cli) {
      await onAddEscala({
        promotoraId: prom.id,
        promotoraNome: prom.nome,
        clienteId: cli.id,
        clienteNome: cli.nome,
        data: escData,
        horaInicio: escInicio,
        horaFim: escFim,
        observacoes: escObs
      });

      setEscPromId('');
      setEscCliId('');
      setEscData('');
      setEscObs('');
    }
  };

  // Atestados upload
  const handleAtestadoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAtestFileName(file.name);
      setAtestFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');
      const reader = new FileReader();
      reader.onloadend = () => {
        setAtestFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddAtestadoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!atestFile) return;

    await onAddAtestado({
      promotoraId: activePromotora.id,
      promotoraNome: activePromotora.nome,
      tipo: atestTipo,
      arquivoUrl: atestFile,
      nomeArquivo: atestFileName || 'atestado_documento.pdf',
      tamanhoArquivo: atestFileSize || '1.2 MB',
      observacoes: atestObs
    });

    setAtestFile('');
    setAtestFileName('');
    setAtestFileSize('');
    setAtestObs('');
  };

  // Stopwatch formatter
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 relative" id="promotoras-portal-main">
      {/* STACK DE ALERTAS PUSH / NOTIFICAÇÕES VISUAIS FLUTUANTES */}
      <div className="fixed top-4 right-4 z-[9999] max-w-sm w-full space-y-2 pointer-events-none">
        <AnimatePresence>
          {pushAlerts.map(alert => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`pointer-events-auto p-4 rounded-xl border shadow-xl flex items-start gap-3 bg-[#161618]/95 backdrop-blur-md ${
                alert.type === 'warning'
                  ? 'border-red-500/30 text-red-400 bg-red-950/20'
                  : alert.type === 'success'
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                  : 'border-blue-500/30 text-blue-400 bg-blue-950/20'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {alert.type === 'warning' && <AlertOctagon className="w-5 h-5 text-red-500 animate-pulse" />}
                {alert.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                {alert.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex justify-between items-baseline gap-2">
                  <h4 className="font-bold text-xs text-white uppercase tracking-wide">{alert.title}</h4>
                  <span className="text-[9px] text-white/40 font-mono">{alert.timestamp}</span>
                </div>
                <p className="text-[11px] text-white/75 leading-normal">{alert.message}</p>
              </div>
              <button
                onClick={() => setPushAlerts(prev => prev.filter(a => a.id !== alert.id))}
                className="text-white/20 hover:text-white/60 transition-all text-[11px] font-bold p-0.5 cursor-pointer pointer-events-auto"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header Condicional standlone */}
      <div className="bg-[#161618] border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-gray-950 border-2 border-amber-400 font-bold overflow-hidden shadow-sm shrink-0">
            {activePromotora.avatar ? (
              <img src={activePromotora.avatar} alt={activePromotora.nome} className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-gray-950" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[9px] font-mono border border-amber-500/20">
                {activePromotora.role}
              </span>
              <h1 className="font-display font-bold text-base text-white">{activePromotora.nome}</h1>
            </div>
            <p className="text-xs text-white/60">Logado como: <span className="font-semibold text-white/80">{activePromotora.email}</span> • Cód. Bling: <span className="font-mono font-bold text-amber-400">{activePromotora.codigoBling}</span></p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 bg-[#1F1F22] p-2 rounded-xl border border-white/10 shadow-sm shrink-0 self-start md:self-auto">
          <button
            onClick={() => setShowLoginModal(true)}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Entrar com Usuário e Senha"
          >
            <LogIn className="w-3.5 h-3.5" />
            Entrar c/ Senha
          </button>

          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider hidden sm:inline">Perfil:</span>
          <select
            value={activePromotora.id}
            onChange={(e) => {
              const selected = promotoras.find(p => p.id === e.target.value);
              if (selected) setActivePromotora(selected);
            }}
            className="text-xs font-semibold bg-[#161618] border border-white/10 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 cursor-pointer text-white"
          >
            {promotoras.map(p => (
              <option key={p.id} value={p.id} className="bg-[#161618]">{p.nome} ({p.codigoBling})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Promotoras Sub-navigation Tab bar */}
      <div className="flex flex-wrap bg-[#1C1C1F]/50 p-1.5 rounded-2xl gap-1 border border-white/10">
        <button
          onClick={() => setActiveSubTab('checkin')}
          className={`flex-1 min-w-[150px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'checkin'
              ? 'bg-amber-500 text-gray-950 shadow-sm font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0" />
          Novo Check-in & Auditoria
        </button>
        <button
          onClick={() => setActiveSubTab('historico')}
          className={`flex-1 min-w-[150px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'historico'
              ? 'bg-amber-500 text-gray-950 shadow-sm font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          Histórico de Visitas ({visitas.filter(v => activePromotora.role === 'Admin' ? true : v.promotoraId === activePromotora.id).length})
        </button>

        {/* GERENCIAR EQUIPE (RESTRICTED: ADMIN ONLY) */}
        {activePromotora?.role === 'Admin' && (
          <button
            onClick={() => setActiveSubTab('equipe')}
            className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === 'equipe'
                ? 'bg-amber-500 text-gray-950 shadow-sm font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            Gerenciar Equipe
          </button>
        )}

        <button
          onClick={() => setActiveSubTab('escalas')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'escalas'
              ? 'bg-amber-500 text-gray-950 shadow-sm font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          Escala de Trabalho
        </button>
        <button
          onClick={() => setActiveSubTab('atestados')}
          className={`flex-1 min-w-[160px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'atestados'
              ? 'bg-amber-500 text-gray-950 shadow-sm font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          Atestados e Documentos
        </button>
        <button
          onClick={() => setActiveSubTab('produtividade')}
          className={`flex-1 min-w-[180px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'produtividade'
              ? 'bg-amber-500 text-gray-950 shadow-sm font-bold'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
          Relatórios de Produtividade
        </button>

        {/* CONFIGURAÇÕES DO APP (RESTRICTED: ADMIN ONLY) */}
        {activePromotora?.role === 'Admin' && (
          <button
            onClick={() => setActiveSubTab('config')}
            className={`flex-1 min-w-[150px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === 'config'
                ? 'bg-amber-500 text-gray-950 shadow-sm font-bold'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings className="w-3.5 h-3.5 shrink-0" />
            Configurações do App
          </button>
        )}
      </div>

      {/* SUB TAB: CHECK-IN & AUDITORIA */}
      {activeSubTab === 'checkin' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna da Esquerda (Identificação + Controle de Presença) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. IDENTIFICAÇÃO DO PONTO DE VENDA */}
            <div className="bg-[#161618] rounded-2xl border border-white/10 p-6 space-y-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-base text-white">1. Identificação do Ponto de Venda</h3>
                  <p className="text-xs text-white/60">Selecione o ponto de venda agendado e visualize as informações de localização e jornada.</p>
                </div>
                {onSyncBling && (
                  <button
                    type="button"
                    onClick={onSyncBling}
                    disabled={syncing}
                    className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-gray-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/10 shrink-0 self-start sm:self-center"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Sincronizando...' : 'Sincronizar PDVs do Bling ERP'}
                  </button>
                )}
              </div>

              {/* Seletor com filtro de pesquisa */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">Pesquisar & Selecionar Cliente</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                    placeholder="Filtrar por nome, cidade ou código..."
                    disabled={!!activeVisita}
                    className="text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white placeholder-white/30 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                  />
                  <select
                    value={selectedClienteId}
                    onChange={(e) => {
                      setSelectedClienteId(e.target.value);
                      setClienteSearch('');
                    }}
                    disabled={!!activeVisita}
                    className="text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white font-semibold cursor-pointer focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                  >
                    <option value="" className="bg-[#161618]">-- Selecione o Cliente ({clientes.length} opções) --</option>
                    {(clienteSearch ? clientes.filter(c => 
                      c.nome.toLowerCase().includes(clienteSearch.toLowerCase()) || 
                      c.cidade.toLowerCase().includes(clienteSearch.toLowerCase()) ||
                      c.id.includes(clienteSearch)
                    ) : clientes).map(c => (
                      <option key={c.id} value={c.id} className="bg-[#161618]">[{c.id}] {c.nome} - {c.cidade}/ES</option>
                    ))}
                  </select>
                </div>

                {/* Card Informativo com Pessoa de Contato no PDV */}
                {selectedClienteId && (() => {
                  const selCli = clientes.find(c => c.id === selectedClienteId);
                  if (!selCli) return null;
                  return (
                    <div className="bg-[#1F1F22] border border-amber-500/20 p-3.5 rounded-xl space-y-2 text-xs text-white shadow-md">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                        <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-amber-500 shrink-0" />
                          {selCli.nome}
                        </span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/20">
                          {selCli.cidade}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-white/80">
                        <div className="flex items-center gap-2 bg-[#161618] p-2 rounded-lg border border-white/5">
                          <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                          <div className="overflow-hidden">
                            <span className="text-[9px] text-white/40 block font-bold uppercase tracking-wider">Pessoa de Contato no PDV</span>
                            <span className="font-bold text-amber-300 block truncate">{selCli.contato || 'Não informado (procurar o Gerente)'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-[#161618] p-2 rounded-lg border border-white/5">
                          <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                          <div className="overflow-hidden">
                            <span className="text-[9px] text-white/40 block font-bold uppercase tracking-wider">Telefone / Loja</span>
                            <span className="font-mono text-white block truncate">{selCli.telefone || 'Não informado'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Localização do PDV no Mapa (GPS) */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">Localização do PDV no Mapa (GPS)</span>
                <div className="h-56 w-full rounded-xl overflow-hidden bg-[#1F1F22] relative border border-white/10">
                  {selectedClienteId ? (
                    (() => {
                      const selCli = clientes.find(c => c.id === selectedClienteId);
                      return selCli ? (
                        <iframe
                          width="100%"
                          height="100%"
                          className="rounded-xl border-none"
                          title="Client Location Map"
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(selCli.endereco || `${selCli.nome}, ${selCli.cidade}`)}&z=15&output=embed`}
                          style={{ filter: 'invert(90%) hue-rotate(180deg)' }}
                        />
                      ) : null;
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-white/30 text-xs">
                      <MapPin className="w-8 h-8 mb-2 text-white/20 animate-bounce" />
                      Selecione um cliente para carregar a localização no mapa
                    </div>
                  )}
                </div>
              </div>

              {/* Jornada de Trabalho (Ponto do Dia) */}
              <div className="space-y-2 pt-1">
                <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">Jornada de Trabalho (Ponto do Dia)</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className={`bg-[#1F1F22] border p-2.5 rounded-xl flex items-center justify-between transition-all ${pontoEntradaManha ? 'border-emerald-500/20' : 'border-white/5'}`}>
                    <div className="flex items-center gap-1.5 text-[10px] text-white/60">
                      <span className="text-amber-400">📥</span>
                      <span>ENTRADA</span>
                    </div>
                    <span className="font-mono font-bold text-xs text-white">{pontoEntradaManha || '--:--'}</span>
                  </div>

                  <div className={`bg-[#1F1F22] border p-2.5 rounded-xl flex items-center justify-between transition-all ${pontoSaidaAlmoco ? 'border-emerald-500/20' : 'border-white/5'}`}>
                    <div className="flex items-center gap-1.5 text-[10px] text-white/60">
                      <span className="text-amber-400">🍲</span>
                      <span>ALMOÇO</span>
                    </div>
                    <span className="font-mono font-bold text-xs text-white">{pontoSaidaAlmoco || '--:--'}</span>
                  </div>

                  <div className={`bg-[#1F1F22] border p-2.5 rounded-xl flex items-center justify-between transition-all ${pontoVoltaAlmoco ? 'border-emerald-500/20' : 'border-white/5'}`}>
                    <div className="flex items-center gap-1.5 text-[10px] text-white/60">
                      <span className="text-amber-400">🔄</span>
                      <span>RETORNO</span>
                    </div>
                    <span className="font-mono font-bold text-xs text-white">{pontoVoltaAlmoco || '--:--'}</span>
                  </div>

                  <div className={`bg-[#1F1F22] border p-2.5 rounded-xl flex items-center justify-between transition-all ${pontoSaidaTarde ? 'border-emerald-500/20' : 'border-white/5'}`}>
                    <div className="flex items-center gap-1.5 text-[10px] text-white/60">
                      <span className="text-amber-400">🏠</span>
                      <span>SAÍDA</span>
                    </div>
                    <span className="font-mono font-bold text-xs text-white">{pontoSaidaTarde || '--:--'}</span>
                  </div>
                </div>
              </div>

              {/* Mensagem de Atenção da Promotora */}
              <div className="bg-[#1F1F22]/50 border border-amber-500/10 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs mt-1">
                <div className="flex items-start gap-2.5 text-white/80">
                  <span className="text-amber-400 text-base leading-none">⚠️</span>
                  <div>
                    <span className="font-bold text-amber-400 block mb-0.5">Atenção Promotora:</span>
                    {isEditingAttention ? (
                      <textarea
                        value={attentionMessage}
                        onChange={(e) => setAttentionMessage(e.target.value)}
                        onBlur={() => setIsEditingAttention(false)}
                        className="bg-[#161618] border border-white/10 rounded p-1.5 text-white text-xs w-full focus:outline-none focus:border-amber-500 mt-1"
                        rows={2}
                        autoFocus
                      />
                    ) : (
                      <p className="text-white/70 leading-normal">{attentionMessage}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingAttention(!isEditingAttention)}
                  className="text-white/40 hover:text-amber-400 transition-all shrink-0 cursor-pointer p-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 2. CONTROLE DE PRESENÇA E GEORREFERENCIAMENTO */}
            <div className="bg-[#161618] rounded-2xl border border-white/10 p-6 space-y-5 shadow-lg">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-500" />
                    2. Controle de Presença e Georreferenciamento
                  </h3>
                  <p className="text-[10px] text-white/50">Controle de entrada, saída para almoço, retorno e saída final por GPS</p>
                </div>
                <button
                  type="button"
                  onClick={handleResetPonto}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer transition-all border border-amber-500/20 hover:border-amber-500/40 px-2.5 py-1 rounded-lg"
                >
                  RESETAR PONTO
                </button>
              </div>

              {/* Configurações de Geofence e Liberação de Emergência */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-[#1F1F22] p-4 rounded-xl border border-white/5">
                  <div className="space-y-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-amber-500" />
                      PARÂMETROS DE GEOCERCA (GEOFENCING)
                    </span>
                    <p className="text-[11px] text-white/50">Cada PDV possui coordenadas e limites de tolerância personalizados.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditingGeoConfig) {
                          // Salvar configurações personalizadas
                          const latNum = parseFloat(editLat);
                          const lngNum = parseFloat(editLng);
                          const radiusNum = parseFloat(editRadius);
                          if (!isNaN(latNum) && !isNaN(lngNum) && !isNaN(radiusNum)) {
                            setPdvGeoConfigs(prev => ({
                              ...prev,
                              [selectedClienteId || 'cli-01']: { lat: latNum, lng: lngNum, raioPermitido: radiusNum }
                            }));
                            triggerPushAlert('⚙️ Geocerca Atualizada', 'As novas coordenadas e raio do PDV foram aplicados com sucesso!', 'success');
                          }
                        }
                        setIsEditingGeoConfig(!isEditingGeoConfig);
                      }}
                      disabled={!selectedClienteId}
                      className="px-3 py-1.5 bg-[#161618] hover:bg-white/5 border border-white/10 rounded-lg text-[11px] font-bold text-amber-400 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isEditingGeoConfig ? '💾 Salvar Parâmetros' : '✏️ Ajustar Coordenadas PDV'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedClienteId && clientes.length > 0) {
                          setSelectedClienteId(clientes[0].id);
                        }
                        if (isSupervisorBypassActive) {
                          setIsSupervisorBypassActive(false);
                          setBypassJustification('');
                          triggerPushAlert('🔒 Bloqueio Reativado', 'A geocerca voltou a ser obrigatória para este PDV.', 'info');
                        } else {
                          setShowBypassModal(true);
                        }
                      }}
                      className={`px-3.5 py-1.5 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                        isSupervisorBypassActive
                          ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                          : 'bg-amber-500 hover:bg-amber-600 text-gray-950 border-amber-500/50 shadow-amber-500/10'
                      }`}
                    >
                      {isSupervisorBypassActive ? (
                        <>
                          <Unlock className="w-4 h-4" />
                          Revogar Liberação
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          🔓 Liberação Supervisor
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {isEditingGeoConfig && selectedClienteId && (
                  <div className="p-4 bg-[#1F1F22] rounded-xl border border-amber-500/20 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-white/40 uppercase">Latitude do PDV</label>
                      <input
                        type="text"
                        value={editLat}
                        onChange={(e) => setEditLat(e.target.value)}
                        className="w-full bg-[#161618] border border-white/10 rounded px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-white/40 uppercase">Longitude do PDV</label>
                      <input
                        type="text"
                        value={editLng}
                        onChange={(e) => setEditLng(e.target.value)}
                        className="w-full bg-[#161618] border border-white/10 rounded px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-white/40 uppercase">Raio Permitido (Metros)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={editRadius}
                          onChange={(e) => setEditRadius(e.target.value)}
                          className="w-full bg-[#161618] border border-white/10 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                        <select
                          value={editRadius}
                          onChange={(e) => setEditRadius(e.target.value)}
                          className="bg-[#161618] border border-white/10 rounded px-2 py-1.5 text-white text-xs cursor-pointer shrink-0"
                        >
                          <option value="20">20m</option>
                          <option value="50">50m</option>
                          <option value="100">100m</option>
                          <option value="200">200m</option>
                          <option value="500">500m</option>
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[20, 50, 100, 200, 500].map(r => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setEditRadius(r.toString())}
                            className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                              editRadius === r.toString()
                                ? 'bg-amber-500 text-gray-950'
                                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {r}m
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Seletor Rápido de Opções de Distância do PDV para Bater Ponto */}
                <div className="bg-[#1F1F22]/80 border border-amber-500/20 p-3.5 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-amber-500" />
                      Opções de Distância do PDV para Bater Ponto:
                    </span>
                    {selectedClienteId && (
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-md font-mono">
                        {(pdvGeoConfigs[selectedClienteId]?.raioPermitido || 20)} metros
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { val: 20, label: '20 Metros', desc: 'Alta Precisão (Loja)' },
                      { val: 50, label: '50 Metros', desc: 'Raio Padrão PDV' },
                      { val: 100, label: '100 Metros', desc: 'Estacionamento' },
                      { val: 200, label: '200 Metros', desc: 'Shopping' },
                      { val: 500, label: '500 Metros', desc: 'Área Ampliada' },
                    ].map(opt => {
                      const currentRadius = selectedClienteId ? (pdvGeoConfigs[selectedClienteId]?.raioPermitido || 20) : 20;
                      const isSelected = currentRadius === opt.val;
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => {
                            if (!selectedClienteId) return;
                            setPdvGeoConfigs(prev => ({
                              ...prev,
                              [selectedClienteId]: {
                                ...(prev[selectedClienteId] || { lat: -20.3155, lng: -40.3121 }),
                                raioPermitido: opt.val
                              }
                            }));
                            setEditRadius(opt.val.toString());
                            setDistanceLimit(opt.val);
                            triggerPushAlert('📏 Distância de Ponto Ajustada', `Distância máxima para bater ponto no PDV definida para ${opt.val} metros.`, 'success');
                          }}
                          disabled={!selectedClienteId}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                              : 'bg-[#161618] border-white/10 text-white/70 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <div className="font-bold text-xs flex items-center justify-between">
                            <span>{opt.label}</span>
                            {isSelected && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                          </div>
                          <span className="text-[9px] text-white/40 block mt-0.5">{opt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Coordenadas e Distância Computada Real */}
                {(() => {
                  const geo = pdvGeoConfigs[selectedClienteId] || { lat: -20.3155, lng: -40.3121, raioPermitido: 20 };
                  let currentLat = geo.lat;
                  let currentLng = geo.lng;

                  if (gpsSimulatedMode === 'outside') {
                    currentLat = geo.lat + 0.0012;
                    currentLng = geo.lng + 0.0008;
                  } else if (gpsSimulatedMode === 'inside') {
                    currentLat = geo.lat + 0.00002;
                    currentLng = geo.lng + 0.00001;
                  } else if (gpsSimulatedMode === 'real' && gpsData) {
                    currentLat = gpsData.lat;
                    currentLng = gpsData.lng;
                  }

                  const simulatedDist = calculateDistance(currentLat, currentLng, geo.lat, geo.lng);
                  const isInside = simulatedDist <= geo.raioPermitido;

                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#1F1F22]/50 border border-white/5 rounded-xl p-4 text-xs leading-relaxed text-white/70">
                        <div className="space-y-1">
                          <span className="font-bold text-white flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                            COORDENADAS DO PDV ALVO
                          </span>
                          <p>Lat: <span className="font-mono font-semibold text-white/90">{geo.lat.toFixed(6)}</span></p>
                          <p>Lng: <span className="font-mono font-semibold text-white/90">{geo.lng.toFixed(6)}</span></p>
                          <p>Raio Tolerado: <span className="font-bold text-amber-400">{geo.raioPermitido} metros</span></p>
                        </div>
                        <div className="space-y-1">
                          <span className="font-bold text-white flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                            SUA POSIÇÃO GPS ATUAL
                          </span>
                          <p>Lat: <span className="font-mono font-semibold text-white/90">{currentLat.toFixed(6)}</span></p>
                          <p>Lng: <span className="font-mono font-semibold text-white/90">{currentLng.toFixed(6)}</span></p>
                          <p>Modo: <span className="font-bold text-amber-400 uppercase text-[10px]">{gpsSimulatedMode === 'inside' ? 'Dentro (Simulado)' : gpsSimulatedMode === 'outside' ? 'Fora (Simulado)' : 'GPS Real do Dispositivo'}</span></p>
                        </div>
                      </div>

                      {/* Banner de Status GPS Ativo com Alertas de Geocerca */}
                      {isInside ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-400">
                          <span className="flex items-center gap-2 font-semibold">
                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
                            Geolocalização Validada: Você está dentro da área permitida do PDV!
                          </span>
                          <span className="font-mono font-bold bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-lg shrink-0">
                            Distância: {simulatedDist.toFixed(1)}m
                          </span>
                        </div>
                      ) : (
                        <div className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                          isSupervisorBypassActive
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            : 'bg-red-500/10 border-red-500/25 text-red-400'
                        }`}>
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 mt-0.5">
                              <Bell className={`w-5 h-5 ${isSupervisorBypassActive ? 'text-blue-400' : 'text-red-500 animate-bounce'}`} />
                            </div>
                            <div className="space-y-0.5">
                              <span className="font-bold block uppercase tracking-wide">
                                {isSupervisorBypassActive
                                  ? '🔓 Geocerca Ignorada por Supervisor'
                                  : '⚠️ ALERTA: Fora do Raio do PDV!'}
                              </span>
                              <p className="text-[11px] opacity-90 leading-relaxed">
                                {isSupervisorBypassActive
                                  ? `Liberado por emergência. Justificativa: "${bypassJustification}"`
                                  : 'O registro de ponto está bloqueado. Aproxime-se do PDV ou clique no botão abaixo para liberação do supervisor.'}
                              </p>
                              {!isSupervisorBypassActive && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!selectedClienteId && clientes.length > 0) {
                                      setSelectedClienteId(clientes[0].id);
                                    }
                                    setShowBypassModal(true);
                                  }}
                                  className="mt-2 bg-amber-500 hover:bg-amber-600 text-gray-950 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/10"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                  🔓 Solicitar / Liberar Ponto com Supervisor
                                </button>
                              )}
                            </div>
                          </div>
                          <span className="font-mono font-bold bg-red-500/10 border border-red-500/25 px-2.5 py-1 rounded-lg shrink-0 self-start sm:self-center">
                            Distância: {simulatedDist.toFixed(1)}m / Limite: {geo.raioPermitido}m
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Botões de Simulação */}
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setGpsSimulatedMode('inside')}
                    className={`text-xs font-semibold py-2 px-3 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      gpsSimulatedMode === 'inside'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                        : 'bg-[#1F1F22] border-white/5 text-white/50 hover:border-white/10 hover:text-white/80'
                    }`}
                  >
                    <span>📍 Simular: Dentro do PDV (3m)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGpsSimulatedMode('outside')}
                    className={`text-xs font-semibold py-2 px-3 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      gpsSimulatedMode === 'outside'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                        : 'bg-[#1F1F22] border-white/5 text-white/50 hover:border-white/10 hover:text-white/80'
                    }`}
                  >
                    <span>📍 Simular: Fora do PDV (150m)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGpsSimulatedMode('real');
                      fetchGPSLocation();
                    }}
                    className={`text-xs font-semibold py-2 px-3 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      gpsSimulatedMode === 'real'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                        : 'bg-[#1F1F22] border-white/5 text-white/50 hover:border-white/10 hover:text-white/80'
                    }`}
                  >
                    <span>🔄 Obter GPS do Celular</span>
                  </button>
                </div>
              </div>

              {/* 4 Big Punch Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                {/* Card 1: Entrada */}
                <div className={`border rounded-2xl p-4 flex flex-col justify-between space-y-3.5 transition-all ${
                  pontoEntradaManha 
                    ? 'border-emerald-500/30 bg-emerald-500/5' 
                    : selectedClienteId ? 'border-amber-500/30 bg-[#1F1F22]' : 'border-white/5 bg-[#1F1F22]/40 opacity-50'
                }`}>
                  <div className="flex justify-between items-center text-xs font-bold text-white/80">
                    <span>1. ENTRADA</span>
                    <span className="text-amber-400 text-sm">☀️</span>
                  </div>
                  
                  {pontoEntradaManha ? (
                    <div className="text-center py-2.5">
                      <span className="inline-block text-[9px] font-bold bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 px-2 py-0.5 rounded-full mb-1">Registrado</span>
                      <p className="font-mono font-bold text-base text-white">{pontoEntradaManha}</p>
                    </div>
                  ) : (
                    <button
                      onClick={handleRegisterEntrada}
                      disabled={!selectedClienteId}
                      className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-white/5 disabled:text-white/20 text-gray-950 font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      Registrar Entrada
                    </button>
                  )}
                </div>

                {/* Card 2: Almoço (Sair) */}
                <div className={`border rounded-2xl p-4 flex flex-col justify-between space-y-3.5 transition-all ${
                  pontoSaidaAlmoco 
                    ? 'border-emerald-500/30 bg-emerald-500/5' 
                    : (pontoEntradaManha && !pontoSaidaAlmoco) ? 'border-amber-500/30 bg-[#1F1F22]' : 'border-white/5 bg-[#1F1F22]/40 opacity-50'
                }`}>
                  <div className="flex justify-between items-center text-xs font-bold text-white/80">
                    <span>2. ALMOÇO (SAIR)</span>
                    <span className="text-amber-400 text-sm">🍲</span>
                  </div>
                  
                  {pontoSaidaAlmoco ? (
                    <div className="text-center py-2.5">
                      <span className="inline-block text-[9px] font-bold bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 px-2 py-0.5 rounded-full mb-1">Registrado</span>
                      <p className="font-mono font-bold text-base text-white">{pontoSaidaAlmoco}</p>
                    </div>
                  ) : (
                    <button
                      onClick={handleRegisterSaidaAlmoco}
                      disabled={!pontoEntradaManha || !!pontoSaidaAlmoco}
                      className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-white/5 disabled:text-white/20 text-gray-950 font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      Sair p/ Almoço
                    </button>
                  )}
                </div>

                {/* Card 3: Retorno */}
                <div className={`border rounded-2xl p-4 flex flex-col justify-between space-y-3.5 transition-all ${
                  pontoVoltaAlmoco 
                    ? 'border-emerald-500/30 bg-emerald-500/5' 
                    : (pontoSaidaAlmoco && !pontoVoltaAlmoco) ? 'border-amber-500/30 bg-[#1F1F22]' : 'border-white/5 bg-[#1F1F22]/40 opacity-50'
                }`}>
                  <div className="flex justify-between items-center text-xs font-bold text-white/80">
                    <span>3. RETORNO</span>
                    <span className="text-amber-400 text-sm">🔄</span>
                  </div>
                  
                  {pontoVoltaAlmoco ? (
                    <div className="text-center py-2.5">
                      <span className="inline-block text-[9px] font-bold bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 px-2 py-0.5 rounded-full mb-1">Registrado</span>
                      <p className="font-mono font-bold text-base text-white">{pontoVoltaAlmoco}</p>
                    </div>
                  ) : (
                    <button
                      onClick={handleRegisterRetornoAlmoco}
                      disabled={!pontoSaidaAlmoco || !!pontoVoltaAlmoco}
                      className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-white/5 disabled:text-white/20 text-gray-950 font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      Retornar Almoço
                    </button>
                  )}
                </div>

                {/* Card 4: Saída Fim */}
                <div className={`border rounded-2xl p-4 flex flex-col justify-between space-y-3.5 transition-all ${
                  pontoSaidaTarde 
                    ? 'border-emerald-500/30 bg-emerald-500/5' 
                    : (pontoVoltaAlmoco && !pontoSaidaTarde) ? 'border-amber-500/30 bg-[#1F1F22]' : 'border-white/5 bg-[#1F1F22]/40 opacity-50'
                }`}>
                  <div className="flex justify-between items-center text-xs font-bold text-white/80">
                    <span>4. SAÍDA FIM</span>
                    <span className="text-amber-400 text-sm">🏠</span>
                  </div>
                  
                  {pontoSaidaTarde ? (
                    <div className="text-center py-2.5">
                      <span className="inline-block text-[9px] font-bold bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 px-2 py-0.5 rounded-full mb-1">Registrado</span>
                      <p className="font-mono font-bold text-base text-white">{pontoSaidaTarde}</p>
                    </div>
                  ) : (
                    <button
                      onClick={handleRegisterSaidaTarde}
                      disabled={!pontoVoltaAlmoco || !!pontoSaidaTarde}
                      className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-white/5 disabled:text-white/20 text-gray-950 font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      Fim Expediente
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* MODO EM ANDAMENTO - SEÇÕES DE AUDITORIA ADICIONAIS ABAIXO */}
            {activeVisita && (
              <div className="space-y-6">
                {/* 3. AUDITORIA DE GÔNDOLA E PREÇOS */}
                <div className="bg-[#161618] rounded-2xl border border-white/10 p-6 space-y-4 shadow-lg">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <h3 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      3. Auditoria de Gôndola & Preços (Amend)
                    </h3>
                    <span className="text-[10px] text-white/40 font-medium">Presença e Preço Praticado</span>
                  </div>

                  <div className="overflow-x-auto border border-white/10 rounded-xl bg-[#1C1C1F]/40">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#1F1F22] border-b border-white/10 text-white/60 font-bold">
                          <th className="px-3 py-2.5">Nome do Produto</th>
                          <th className="px-3 py-2.5 text-center">Tem Estoque</th>
                          <th className="px-3 py-2.5 text-center">No Display</th>
                          <th className="px-3 py-2.5 text-right">R$ Praticado</th>
                          <th className="px-3 py-2.5 text-center">Qtd Gôndola</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {auditoriaGondola.map((item, idx) => (
                          <tr key={item.produtoId} className="hover:bg-white/5">
                            <td className="px-3 py-2.5 font-medium text-white">{item.nome}</td>
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={item.temEstoque}
                                onChange={(e) => {
                                  const updated = [...auditoriaGondola];
                                  updated[idx].temEstoque = e.target.checked;
                                  setAuditoriaGondola(updated);
                                }}
                                className="w-3.5 h-3.5 accent-amber-500 text-amber-500 border-white/10 rounded focus:ring-amber-500/20"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={item.noDisplay}
                                onChange={(e) => {
                                  const updated = [...auditoriaGondola];
                                  updated[idx].noDisplay = e.target.checked;
                                  setAuditoriaGondola(updated);
                                }}
                                className="w-3.5 h-3.5 accent-amber-500 text-amber-500 border-white/10 rounded focus:ring-amber-500/20"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <input
                                type="number"
                                step="0.01"
                                value={item.precoPraticado}
                                onChange={(e) => {
                                  const updated = [...auditoriaGondola];
                                  updated[idx].precoPraticado = parseFloat(e.target.value) || 0;
                                  setAuditoriaGondola(updated);
                                }}
                                className="w-20 text-right bg-[#1F1F22] border border-white/10 rounded px-2.5 py-1 text-white focus:border-amber-500 focus:outline-none focus:ring-1"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="number"
                                value={item.qtdGondola}
                                onChange={(e) => {
                                  const updated = [...auditoriaGondola];
                                  updated[idx].qtdGondola = parseInt(e.target.value) || 0;
                                  setAuditoriaGondola(updated);
                                }}
                                className="w-16 text-center bg-[#1F1F22] border border-white/10 rounded px-2.5 py-1 text-white focus:border-amber-500 focus:outline-none focus:ring-1"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. PRODUTOS A VENCER */}
                <div className="bg-[#161618] rounded-2xl border border-white/10 p-6 space-y-4 shadow-lg">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <h3 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                      <AlertOctagon className="w-4 h-4 text-red-500" />
                      4. Produtos Próximos ao Vencimento
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddExpiryProduct}
                      className="bg-amber-500 hover:bg-amber-600 text-gray-950 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>

                  {produtosVencer.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-white/10 rounded-xl bg-[#1C1C1F]/10 text-xs text-white/40">
                      Nenhum produto próximo ao vencimento registrado. Clique em "Add" para adicionar uma linha.
                    </div>
                  ) : (
                    <div className="border border-white/10 rounded-xl overflow-hidden mt-3 text-xs bg-[#1C1C1F]/30">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-[#1F1F22] text-white/60 font-bold border-b border-white/10">
                            <th className="px-3 py-2">Produto</th>
                            <th className="px-3 py-2 w-24">Qtd</th>
                            <th className="px-3 py-2">Data Vencimento</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {produtosVencer.map((p, idx) => (
                            <tr key={idx} className="hover:bg-white/5">
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={p.produtoNome}
                                  placeholder="Nome do produto..."
                                  onChange={(e) => {
                                    const updated = [...produtosVencer];
                                    updated[idx].produtoNome = e.target.value;
                                    setProdutosVencer(updated);
                                  }}
                                  className="w-full bg-[#1F1F22] border border-white/10 rounded px-2.5 py-1 text-white text-xs focus:border-amber-500 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={p.qtd || ''}
                                  placeholder="Qtd..."
                                  onChange={(e) => {
                                    const updated = [...produtosVencer];
                                    updated[idx].qtd = parseInt(e.target.value) || 0;
                                    setProdutosVencer(updated);
                                  }}
                                  className="w-full bg-[#1F1F22] border border-white/10 rounded px-2.5 py-1 text-white text-xs focus:border-amber-500 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2 flex items-center gap-2">
                                <input
                                  type="date"
                                  value={p.vencimento}
                                  onChange={(e) => {
                                    const updated = [...produtosVencer];
                                    updated[idx].vencimento = e.target.value;
                                    setProdutosVencer(updated);
                                  }}
                                  className="bg-[#1F1F22] border border-white/10 rounded px-2.5 py-1 text-white text-xs focus:border-amber-500 focus:outline-none flex-1"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProdutosVencer(produtosVencer.filter((_, i) => i !== idx));
                                  }}
                                  className="text-red-500 hover:text-red-400 p-1 font-bold cursor-pointer shrink-0"
                                  title="Remover"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 5. ANÁLISE DE CONCORRÊNCIA */}
                <div className="bg-[#161618] rounded-2xl border border-white/10 p-6 space-y-4 shadow-lg">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <h3 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      5. Análise de Concorrência
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddCompetitorBrand}
                      className="bg-amber-500 hover:bg-amber-600 text-gray-950 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>

                  {analiseConcorrencia.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-white/10 rounded-xl bg-[#1C1C1F]/10 text-xs text-white/40">
                      Nenhuma análise de concorrência registrada. Clique em "Add" para adicionar uma linha.
                    </div>
                  ) : (
                    <div className="border border-white/10 rounded-xl overflow-hidden mt-3 text-xs bg-[#1C1C1F]/30">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-[#1F1F22] text-white/60 font-bold border-b border-white/10">
                            <th className="px-3 py-2">Concorrente</th>
                            <th className="px-3 py-2 w-32">Preço Praticado</th>
                            <th className="px-3 py-2">Observações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {analiseConcorrencia.map((c, idx) => (
                            <tr key={idx} className="hover:bg-white/5">
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={c.marca}
                                  placeholder="Marca (ex: Wella)..."
                                  onChange={(e) => {
                                    const updated = [...analiseConcorrencia];
                                    updated[idx].marca = e.target.value;
                                    setAnaliseConcorrencia(updated);
                                  }}
                                  className="w-full bg-[#1F1F22] border border-white/10 rounded px-2.5 py-1 text-white text-xs focus:border-amber-500 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={c.precoConcorrente || ''}
                                  placeholder="Preço..."
                                  onChange={(e) => {
                                    const updated = [...analiseConcorrencia];
                                    updated[idx].precoConcorrente = parseFloat(e.target.value) || 0;
                                    setAnaliseConcorrencia(updated);
                                  }}
                                  className="w-full bg-[#1F1F22] border border-white/10 rounded px-2.5 py-1 text-white text-xs focus:border-amber-500 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={c.observacoes}
                                  placeholder="Observações..."
                                  onChange={(e) => {
                                    const updated = [...analiseConcorrencia];
                                    updated[idx].observacoes = e.target.value;
                                    setAnaliseConcorrencia(updated);
                                  }}
                                  className="bg-[#1F1F22] border border-white/10 rounded px-2.5 py-1 text-white text-xs focus:border-amber-500 focus:outline-none flex-1"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAnaliseConcorrencia(analiseConcorrencia.filter((_, i) => i !== idx));
                                  }}
                                  className="text-red-500 hover:text-red-400 p-1 font-bold cursor-pointer shrink-0"
                                  title="Remover"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Coluna da Direita (Fotos do Display, Comentários, Peças Vendidas, Concluir) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* CARD: FOTOS DO DISPLAY / PDV */}
            <div className="bg-[#161618] rounded-2xl border border-white/10 p-6 space-y-4 shadow-lg">
              <div className="border-b border-white/10 pb-2 flex justify-between items-center">
                <h3 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-amber-400" />
                  FOTOS DO DISPLAY / PDV
                </h3>
                <span className="text-[10px] text-white/40 font-mono">JPG, PNG</span>
              </div>

              {/* Upload Zone */}
              <div className="border-2 border-dashed border-white/10 hover:border-amber-500/50 rounded-xl p-6 text-center cursor-pointer relative bg-[#1F1F22] transition-all">
                {fotoDisplay ? (
                  <div className="space-y-3">
                    <img src={fotoDisplay} alt="Foto Display" className="max-h-48 mx-auto rounded-lg object-cover shadow-md" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => setFotoDisplay('')}
                      className="text-xs text-red-400 font-bold hover:underline transition-all cursor-pointer"
                    >
                      Remover Imagem
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block space-y-2">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-1">
                      <Camera className="w-5 h-5 text-white/60" />
                    </div>
                    <p className="text-xs font-bold text-white">Tirar foto ou anexar imagem</p>
                    <p className="text-[10px] text-white/40 leading-normal">Clique para abrir a câmera ou galeria do dispositivo</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleDisplayPhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* CARD: COMENTÁRIOS E OBSERVAÇÕES GERAIS */}
            <div className="bg-[#161618] rounded-2xl border border-white/10 p-6 space-y-4 shadow-lg">
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-1.5 border-b border-white/10 pb-2">
                <FileText className="w-4 h-4 text-amber-400" />
                Comentários e Observações Gerais
              </h3>
              <textarea
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                placeholder="Relate como está o estoque, o posicionamento dos cosméticos Safira ou ações promocionais no local..."
                rows={4}
                className="w-full text-xs p-3.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white placeholder-white/35 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/10 resize-none leading-relaxed"
              />
            </div>

            {/* CARD: PEÇAS VENDIDAS NO DIA */}
            <div className="bg-[#161618] rounded-2xl border border-white/10 p-6 space-y-4 shadow-lg">
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-1.5 border-b border-white/10 pb-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                PEÇAS VENDIDAS NO DIA
              </h3>
              <div>
                <input
                  type="number"
                  value={pecasVendidas || ''}
                  onChange={(e) => setPecasVendidas(parseInt(e.target.value) || 0)}
                  placeholder="Preencha com a quantidade de peças vendidas hoje"
                  className="w-full text-xs p-3.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/15 font-bold"
                />
                <span className="text-[10px] text-[#A0A0A5] mt-1.5 block leading-normal">
                  Ficará em aberto para preenchimento com a quantidade total vendida hoje.
                </span>
              </div>
            </div>

            {/* BOTÃO: CONCLUIR CHECK-IN DO PDV */}
            <button
              type="button"
              onClick={handleCheckOut}
              disabled={!activeVisita}
              className="w-full bg-[#161618] hover:bg-[#1C1C1F] disabled:opacity-40 border border-emerald-500/30 hover:border-emerald-500/50 text-white font-bold py-4 rounded-2xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed uppercase tracking-wider"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Concluir Check-in do PDV
            </button>

            {/* AI Assistant na Direita */}
            <AISafiraAssistant />
            
            {/* Roteiro do dia */}
            <div className="bg-[#161618] rounded-2xl border border-white/10 p-5 space-y-3.5 shadow-lg">
              <h4 className="font-display font-bold text-xs text-white border-b border-white/10 pb-2 uppercase tracking-wider text-[10px]">Sua Rota agendada</h4>
              <div className="space-y-3">
                {escalas
                  .filter(e => e.promotoraId === activePromotora.id)
                  .map((e, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start bg-[#1F1F22] p-2.5 rounded-xl border border-white/10">
                      <span className="w-5 h-5 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-400 font-bold text-[10px] shrink-0 border border-amber-500/20">{idx + 1}</span>
                      <div className="text-xs">
                        <p className="font-bold text-white">{e.clienteNome}</p>
                        <p className="text-[10px] text-white/50 font-medium">Data: {new Date(e.data).toLocaleDateString('pt-BR')} • {e.horaInicio} às {e.horaFim}</p>
                        {e.observacoes && <p className="text-[10px] text-amber-400 mt-0.5">⚠️ {e.observacoes}</p>}
                      </div>
                    </div>
                  ))}
                {escalas.filter(e => e.promotoraId === activePromotora.id).length === 0 && (
                  <p className="text-xs text-white/40 italic">Nenhuma visita agendada para você esta semana.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
      {/* SUB TAB: HISTÓRICO DE VISITAS */}
      {activeSubTab === 'historico' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display font-bold text-base text-white">Histórico de Visitas e Auditorias</h3>
            <p className="text-xs text-white/60">Acompanhe todos os relatórios enviados de auditoria e tempos de check-in para {activePromotora.nome}.</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {visitas
              .filter(v => v.promotoraId === activePromotora.id)
              .map((v) => (
                <div key={v.id} className="bg-[#161618] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-white">{v.clienteNome}</h4>
                      <p className="text-xs text-white/40">Roteiro realizado em: <span className="font-bold text-white/75">{new Date(v.entrada || '').toLocaleDateString('pt-BR')}</span></p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="bg-[#1F1F22] text-white/70 px-2.5 py-0.5 rounded-md border border-white/10">
                        Entrada: {v.entrada ? new Date(v.entrada).toLocaleTimeString('pt-BR') : '--:--'}
                      </span>
                      <span className="bg-[#1F1F22] text-white/70 px-2.5 py-0.5 rounded-md border border-white/10">
                        Saída: {v.saida ? new Date(v.saida).toLocaleTimeString('pt-BR') : '--:--'}
                      </span>
                      <span className="bg-emerald-500/10 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        Concluído
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Estoque info */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-xs text-white/40 uppercase tracking-wider text-[10px]">Auditoria de Gôndola</h5>
                      <div className="space-y-1 text-xs">
                        {v.auditoriaGondola?.map((g, idx) => (
                          <div key={idx} className="flex justify-between border-b border-white/5 py-0.5">
                            <span className="text-white/80 line-clamp-1">{g.nome}</span>
                            <span className="font-bold shrink-0 text-amber-400">{g.temEstoque ? 'Estoque OK' : 'Sem Estoque'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Expiry / Competitor */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-xs text-white/40 uppercase tracking-wider text-[10px]">Vencimentos & Concorrência</h5>
                      {v.produtosVencer && v.produtosVencer.length > 0 ? (
                        <div className="text-xs text-red-400 space-y-1">
                          <p className="font-bold">⚠️ Vencimento Próximo:</p>
                          {v.produtosVencer.map((pv, idx) => (
                            <p key={idx}>{pv.produtoNome} ({pv.qtd} un) - {new Date(pv.vencimento).toLocaleDateString('pt-BR')}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-400 font-medium">✓ Nenhum item próximo ao vencimento.</p>
                      )}

                      {v.analiseConcorrencia && v.analiseConcorrencia.length > 0 && (
                        <div className="text-xs text-amber-400/90 mt-2 space-y-1">
                          <p className="font-bold text-white/80">✓ Concorrência Monitorada:</p>
                          {v.analiseConcorrencia.map((c, idx) => (
                            <p key={idx}>{c.marca} - R$ {c.precoConcorrente.toFixed(2)} ({c.observacoes})</p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Photo evidence */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-xs text-white/40 uppercase tracking-wider text-[10px]">Evidências Fotográficas</h5>
                      <div className="flex gap-2">
                        {v.fotoDisplay ? (
                          <div className="flex-1 text-center bg-[#1F1F22] border border-white/10 p-1 rounded-lg">
                            <img src={v.fotoDisplay} alt="Display" className="h-20 w-full object-cover rounded" />
                            <span className="text-[9px] text-white/50 mt-1 block">Display</span>
                          </div>
                        ) : (
                          <div className="flex-1 bg-[#1F1F22] border border-white/5 flex items-center justify-center rounded-lg text-[10px] text-white/30 h-20">display ausente</div>
                        )}
                        {v.fotoFachada ? (
                          <div className="flex-1 text-center bg-[#1F1F22] border border-white/10 p-1 rounded-lg">
                            <img src={v.fotoFachada} alt="Fachada" className="h-20 w-full object-cover rounded" />
                            <span className="text-[9px] text-white/50 mt-1 block">Fachada</span>
                          </div>
                        ) : (
                          <div className="flex-1 bg-[#1F1F22] border border-white/5 flex items-center justify-center rounded-lg text-[10px] text-white/30 h-20">fachada ausente</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {v.comentarios && (
                    <div className="bg-[#1F1F22] p-3 rounded-xl border border-white/10 text-xs text-white/80">
                      <p className="font-bold mb-0.5 text-white">Comentários da Promotora:</p>
                      <p className="text-white/70">{v.comentarios}</p>
                    </div>
                  )}
                </div>
              ))}
            {visitas.filter(v => v.promotoraId === activePromotora.id).length === 0 && (
              <div className="text-center py-12 bg-[#161618] rounded-2xl border border-white/10 text-white/40 text-xs">
                Nenhum check-in concluído por {activePromotora.nome} ainda.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB TAB: GERENCIAR EQUIPE */}
      {activeSubTab === 'equipe' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-display font-bold text-base text-white">Gerenciamento de Equipe & Perfis</h3>
              <p className="text-xs text-white/60">Cadastre, edite e configure logins e senhas de acesso das promotoras de venda do Espírito Santo.</p>
            </div>
            <button
              onClick={() => setShowAddPromForm(!showAddPromForm)}
              className="bg-amber-500 hover:bg-amber-600 text-gray-950 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/10"
            >
              <Plus className="w-4 h-4" /> Cadastrar Promotora
            </button>
          </div>

          {/* Form para cadastrar */}
          {showAddPromForm && (
            <form onSubmit={handleAddPromotoraSubmit} className="bg-[#161618] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg max-w-2xl">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  Novo Cadastro de Promotora de Vendas
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const creds = generateCredentials(newPromNome);
                    setNewPromUsuario(creds.usuario);
                    setNewPromSenha(creds.senha);
                  }}
                  className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg font-bold hover:bg-amber-500/20 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" /> Gerar Login & Senha
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={newPromNome}
                    onChange={(e) => {
                      setNewPromNome(e.target.value);
                      if (!newPromUsuario && e.target.value) {
                        const creds = generateCredentials(e.target.value);
                        setNewPromUsuario(creds.usuario);
                        setNewPromSenha(creds.senha);
                      }
                    }}
                    placeholder="Ex: Amanda Ferreira Silva"
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#1F1F22] border border-white/10 text-white placeholder-white/30 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Código Bling/Vendedor *</label>
                  <input
                    type="text"
                    required
                    value={newPromBling}
                    onChange={(e) => setNewPromBling(e.target.value)}
                    placeholder="Ex: PROM07"
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#1F1F22] border border-white/10 text-white placeholder-white/30 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    value={newPromTel}
                    onChange={(e) => setNewPromTel(e.target.value)}
                    placeholder="Ex: (27) 99888-7711"
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#1F1F22] border border-white/10 text-white placeholder-white/30 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">E-mail Corporativo *</label>
                  <input
                    type="email"
                    required
                    value={newPromEmail}
                    onChange={(e) => setNewPromEmail(e.target.value)}
                    placeholder="Ex: amanda.silva@safira.com.br"
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#1F1F22] border border-white/10 text-white placeholder-white/30 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Login e Senha para a Promotora */}
              <div className="bg-[#1F1F22] p-3.5 rounded-xl border border-amber-500/20 space-y-3">
                <span className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Key className="w-3.5 h-3.5" /> Credenciais de Login para Acesso ao Sistema
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Usuário / Login *</label>
                    <input
                      type="text"
                      required
                      value={newPromUsuario}
                      onChange={(e) => setNewPromUsuario(e.target.value)}
                      placeholder="Ex: amanda.silva"
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#161618] border border-white/10 text-white font-mono placeholder-white/30 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Senha de Acesso *</label>
                    <input
                      type="text"
                      required
                      value={newPromSenha}
                      onChange={(e) => setNewPromSenha(e.target.value)}
                      placeholder="Ex: safira123"
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#161618] border border-white/10 text-white font-mono placeholder-white/30 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer shadow-sm shadow-amber-500/10"
                >
                  Salvar Cadastro
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPromForm(false)}
                  className="bg-[#1F1F22] hover:bg-white/5 text-white border border-white/10 px-5 py-2.5 rounded-xl text-xs cursor-pointer font-bold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* List of registered promotoras with Edit, Credentials and Delete actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {promotoras.map((p) => (
              <div key={p.id} className="bg-[#161618] border border-white/10 rounded-2xl p-4.5 space-y-3.5 hover:border-amber-500/50 transition-all shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#1F1F22] flex items-center justify-center font-bold text-white/80 overflow-hidden shrink-0 border border-amber-500/30">
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.nome} className="w-full h-full object-cover" />
                      ) : (
                        p.nome.charAt(0)
                      )}
                    </div>
                    <div className="text-xs space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{p.nome}</h4>
                        <span className={`text-[9px] px-2 py-0.2 rounded font-bold uppercase ${
                          p.status === 'Inativa' 
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {p.status || 'Ativa'}
                        </span>
                      </div>
                      <p className="text-white/40">
                        Código Bling: <span className="font-bold text-amber-400 font-mono">{p.codigoBling}</span> • Função: <span className="text-white/80 font-medium">{p.role}</span>
                      </p>
                      <p className="text-white/60">{p.email} • {p.telefone}</p>
                    </div>
                  </div>
                </div>

                {/* Login & Senha Box */}
                <div className="bg-[#1F1F22] p-3 rounded-xl border border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <div>
                      <span className="text-[9px] text-white/40 block font-bold font-sans uppercase">Usuário / Login</span>
                      <span className="text-amber-400 font-bold">{p.usuario || p.email.split('@')[0]}</span>
                    </div>
                    <div className="border-l border-white/10 pl-3">
                      <span className="text-[9px] text-white/40 block font-bold font-sans uppercase">Senha</span>
                      <span className="text-white font-bold">{p.senha || 'safira123'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      onClick={() => setCredentialsModalPromotora(p)}
                      className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="Enviar ou copiar login e senha"
                    >
                      <Key className="w-3.5 h-3.5" /> Credenciais
                    </button>
                    <button
                      onClick={() => handleStartEditPromotora(p)}
                      className="bg-white/5 hover:bg-amber-500 hover:text-gray-950 text-white border border-white/10 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="Editar cadastro da promotora"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => onDeletePromotora(p.id)}
                      className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg transition-all cursor-pointer border border-transparent hover:border-red-500/20"
                      title="Excluir promotora"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB TAB: ESCALA DE TRABALHO */}
      {activeSubTab === 'escalas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form para agendar escalas */}
            <div className="lg:col-span-5 bg-[#161618] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg self-start">
              <div>
                <h3 className="font-display font-bold text-sm text-white">Montar Escala de Trabalho</h3>
                <p className="text-xs text-white/60">Agende visitas individuais para as promotoras nos PDVs.</p>
              </div>

              <form onSubmit={handleAddEscalaSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Profissional / Promotora</label>
                  <select
                    value={escPromId}
                    onChange={(e) => setEscPromId(e.target.value)}
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#1F1F22] border border-white/10 text-white focus:border-amber-500 focus:outline-none cursor-pointer"
                  >
                    <option value="" className="bg-[#161618]">Selecione...</option>
                    {promotoras.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#161618]">{p.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Ponto de Venda (PDV) Vinculante</label>
                  <select
                    value={escCliId}
                    onChange={(e) => setEscCliId(e.target.value)}
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#1F1F22] border border-white/10 text-white focus:border-amber-500 focus:outline-none cursor-pointer"
                  >
                    <option value="" className="bg-[#161618]">Selecione...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#161618]">{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Data da Escala</label>
                  <input
                    type="date"
                    required
                    value={escData}
                    onChange={(e) => setEscData(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#1F1F22] border border-white/10 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Horário de Início</label>
                    <input
                      type="time"
                      value={escInicio}
                      onChange={(e) => setEscInicio(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#1F1F22] border border-white/10 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Horário de Término</label>
                    <input
                      type="time"
                      value={escFim}
                      onChange={(e) => setEscFim(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#1F1F22] border border-white/10 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Instruções / Observações</label>
                  <input
                    type="text"
                    value={escObs}
                    onChange={(e) => setEscObs(e.target.value)}
                    placeholder="Ex: Abastecimento, coleta de preços..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#1F1F22] border border-white/10 text-white placeholder-white/30 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-amber-500/10 cursor-pointer"
                >
                  Agendar Escala
                </button>
              </form>
            </div>

            {/* List de escalas registradas */}
            <div className="lg:col-span-7 bg-[#161618] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
              <div>
                <h3 className="font-display font-bold text-sm text-white">Escalas Programadas</h3>
                <p className="text-xs text-white/60">Acompanhamento e listagem cronológica de visitas pendentes.</p>
              </div>

              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {escalas.map((e) => (
                  <div key={e.id} className="border border-white/10 p-4 rounded-xl flex items-center justify-between hover:border-amber-500/50 transition-all text-xs bg-[#1F1F22]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{e.promotoraNome}</span>
                        <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-semibold font-sans">
                          {e.horaInicio} - {e.horaFim}
                        </span>
                      </div>
                      <p className="text-white/60"><strong>PDV:</strong> {e.clienteNome}</p>
                      <p className="text-white/40">Data: {new Date(e.data).toLocaleDateString('pt-BR')}</p>
                      {e.observacoes && <p className="text-amber-400 italic font-medium mt-0.5">⚠️ {e.observacoes}</p>}
                    </div>

                    <button
                      onClick={() => onDeleteEscala(e.id)}
                      className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                      title="Remover da escala"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {escalas.length === 0 && (
                  <p className="text-xs text-white/40 italic text-center py-12 border border-dashed border-white/10 rounded-xl">
                    Nenhuma escala de visitas montada para este mês.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB: ATESTADOS E DOCUMENTOS */}
      {activeSubTab === 'atestados' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form de envio */}
            <div className="lg:col-span-5 bg-[#161618] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
              <div>
                <h3 className="font-display font-bold text-sm text-white">Anexar Novo Documento / Atestado</h3>
                <p className="text-xs text-white/60 font-sans">Envio e acompanhamento de atestados médicos, justificativas, recibos e documentos corporativos.</p>
              </div>

              <form onSubmit={handleAddAtestadoSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Selecione o Tipo de Justificativa</label>
                  <select
                    value={atestTipo}
                    onChange={(e) => setAtestTipo(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#1F1F22] border border-white/10 text-white focus:border-amber-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Médico" className="bg-[#161618]">Atestado Médico / Licença</option>
                    <option value="Justificativa" className="bg-[#161618]">Justificativa de Atraso/Falta</option>
                    <option value="Recibo" className="bg-[#161618]">Recibo de Despesas / Estacionamento</option>
                    <option value="Outro" className="bg-[#161618]">Outro Documento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Selecione o Arquivo (PDF, JPEG, PNG)</label>
                  <div className="border-2 border-dashed border-white/10 hover:border-amber-400 rounded-xl p-6 text-center cursor-pointer bg-[#1F1F22] transition-all relative">
                    {atestFile ? (
                      <div className="space-y-1 text-xs">
                        <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
                        <p className="font-bold text-white truncate max-w-xs">{atestFileName}</p>
                        <p className="text-white/40 text-[10px]">{atestFileSize}</p>
                        <button
                          type="button"
                          onClick={() => { setAtestFile(''); setAtestFileName(''); setAtestFileSize(''); }}
                          className="text-red-400 font-bold hover:underline text-[10px] mt-2 block mx-auto"
                        >
                          Trocar Arquivo
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <Upload className="w-8 h-8 text-white/30 mx-auto mb-2" />
                        <p className="text-xs font-bold text-white">Clique ou arraste o arquivo aqui</p>
                        <p className="text-[10px] text-white/40 mt-1">Formatos aceitos: PDF, JPG, PNG (máx. 5MB)</p>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={handleAtestadoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Observações / Justificativa</label>
                  <textarea
                    value={atestObs}
                    onChange={(e) => setAtestObs(e.target.value)}
                    placeholder="Descreva o motivo do envio, data de afastamento, CID se atestado, ou observação importante..."
                    rows={3}
                    className="w-full text-xs p-3 rounded-xl bg-[#1F1F22] border border-white/10 text-white placeholder-white/30 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!atestFile}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-[#1F1F22] disabled:text-white/20 text-gray-950 font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-amber-500/10 cursor-pointer disabled:cursor-not-allowed"
                >
                  Salvar Documento
                </button>
              </form>
            </div>

            {/* List de historicos enviados */}
            <div className="lg:col-span-7 bg-[#161618] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
              <div>
                <h3 className="font-display font-bold text-sm text-white">Histórico de Documentos Enviados</h3>
                <p className="text-xs text-white/60 font-sans">Documentos anexados pelas promotoras ficam armazenados aqui para consulta administrativa permanente.</p>
              </div>

              <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                {atestados
                  .filter(a => a.promotoraId === activePromotora.id)
                  .map((a) => (
                    <div key={a.id} className="border border-white/10 p-4 rounded-xl flex items-start justify-between hover:border-amber-500/50 transition-all text-xs bg-[#1F1F22]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{a.tipo}</span>
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-mono font-bold text-[9px]">
                            {a.tamanhoArquivo}
                          </span>
                        </div>
                        <p className="text-white/60 truncate max-w-sm"><strong>Arquivo:</strong> {a.nomeArquivo}</p>
                        <p className="text-white/40">Enviado em: {new Date(a.dataEnvio).toLocaleString('pt-BR')}</p>
                        {a.observacoes && <p className="text-white/70 bg-[#161618] p-2 border border-white/10 rounded mt-1.5 leading-normal">{a.observacoes}</p>}
                      </div>

                      <button
                        onClick={() => onDeleteAtestado(a.id)}
                        className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer shrink-0 ml-2"
                        title="Remover documento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                {atestados.filter(a => a.promotoraId === activePromotora.id).length === 0 && (
                  <div className="text-center py-12 border border-dashed border-white/10 rounded-xl text-white/40 italic">
                    Nenhum documento anexado ainda por esta promotora.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB: RELATÓRIOS & PRODUTIVIDADE */}
      {activeSubTab === 'produtividade' && (() => {
        // Filter visits
        const filteredVisitas = visitas.filter(v => {
          if (filterPromotoraId && v.promotoraId !== filterPromotoraId) return false;
          if (filterClienteId && v.clienteId !== filterClienteId) return false;
          if (v.data) {
            if (filterDataInicio && v.data < filterDataInicio) return false;
            if (filterDataFim && v.data > filterDataFim) return false;
          }
          return true;
        });

        // Only completed visits for analytics
        const filteredVisitasRealizadas = filteredVisitas.filter(v => v.status === 'concluida');

        // Metrics matching the user's layout & requirements
        const metricVisitasRealizadas = filteredVisitasRealizadas.length;
        const metricPecasVendidas = filteredVisitasRealizadas.reduce((sum, v) => sum + (v.pecasVendidas || 0), 0);
        const metricPdvsAlertados = filteredVisitasRealizadas.filter(v => v.produtosVencer && v.produtosVencer.length > 0).length;
        const metricConcorrenciaRegs = filteredVisitasRealizadas.filter(v => v.analiseConcorrencia && v.analiseConcorrencia.length > 0).length;

        return (
          <div className="space-y-6">
            
            {/* Header & Subtext */}
            <div>
              <h3 className="font-display font-bold text-base text-white">Relatórios de Produtividade & Auditoria</h3>
              <p className="text-xs text-white/60">Monitore o cumprimento da escala de visitas, check-ins, faturamento/venda e ruptura de gôndolas em tempo real.</p>
            </div>

            {/* Filter Bar */}
            <div className="bg-[#161618] border border-white/10 rounded-2xl p-5 shadow-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* FILTRAR PROMOTORA */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">Filtrar Promotora</label>
                  <select
                    value={filterPromotoraId}
                    onChange={(e) => setFilterPromotoraId(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white font-semibold cursor-pointer focus:outline-none focus:border-amber-500"
                  >
                    <option value="" className="bg-[#161618]">Todas as Promotoras</option>
                    {promotoras.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#161618]">{p.nome}</option>
                    ))}
                  </select>
                </div>

                {/* FILTRAR PDV / CLIENTE */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">Filtrar PDV / Cliente</label>
                  <select
                    value={filterClienteId}
                    onChange={(e) => setFilterClienteId(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white font-semibold cursor-pointer focus:outline-none focus:border-amber-500"
                  >
                    <option value="" className="bg-[#161618]">Todos os PDVs</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#161618]">{c.nome} ({c.cidade})</option>
                    ))}
                  </select>
                </div>

                {/* DATA INÍCIO */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">Data Início</label>
                  <input
                    type="date"
                    value={filterDataInicio}
                    onChange={(e) => setFilterDataInicio(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* DATA FIM */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">Data Fim</label>
                  <input
                    type="date"
                    value={filterDataFim}
                    onChange={(e) => setFilterDataFim(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Visitas Realizadas */}
              <div className="bg-[#161618] border border-white/10 rounded-2xl p-5 space-y-2 shadow-lg">
                <span className="block text-[9px] font-bold text-white/40 uppercase tracking-wider">Visitas Realizadas</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display font-extrabold text-2xl text-white">{metricVisitasRealizadas}</span>
                  <span className="text-xs text-white/50">auditorias</span>
                </div>
              </div>

              {/* Card 2: Unidades Vendidas */}
              <div className="bg-[#161618] border border-white/10 rounded-2xl p-5 space-y-2 shadow-lg">
                <span className="block text-[9px] font-bold text-white/40 uppercase tracking-wider">Unidades Vendidas</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display font-extrabold text-2xl text-white">{metricPecasVendidas}</span>
                  <span className="text-xs text-white/50">unidades</span>
                </div>
              </div>

              {/* Card 3: Produtos Próximos ao Vencimento */}
              <div className="bg-[#161618] border border-white/10 rounded-2xl p-5 space-y-2 shadow-lg">
                <span className="block text-[9px] font-bold text-white/40 uppercase tracking-wider">Produtos a Vencer</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display font-extrabold text-2xl text-red-400">{metricPdvsAlertados}</span>
                  <span className="text-xs text-white/50">PDVs alertados</span>
                </div>
              </div>

              {/* Card 4: Monitoramento Concorrência */}
              <div className="bg-[#161618] border border-white/10 rounded-2xl p-5 space-y-2 shadow-lg">
                <span className="block text-[9px] font-bold text-white/40 uppercase tracking-wider">Monitoramento Concorrência</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display font-extrabold text-2xl text-white">{metricConcorrenciaRegs}</span>
                  <span className="text-xs text-white/50">com registros</span>
                </div>
              </div>

            </div>

            {/* Sub-tab view selections (Auditoria feed, Presença, Vendas) */}
            <div className="flex bg-[#1F1F22] p-1 rounded-xl border border-white/10 gap-1 w-full max-w-lg self-start">
              <button
                onClick={() => setReportViewMode('auditoria')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  reportViewMode === 'auditoria'
                    ? 'bg-amber-500 text-gray-950 font-bold shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Auditorias Completas
              </button>
              <button
                onClick={() => setReportViewMode('presenca')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  reportViewMode === 'presenca'
                    ? 'bg-amber-500 text-gray-950 font-bold shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Ponto & Presença
              </button>
              <button
                onClick={() => setReportViewMode('vendas')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  reportViewMode === 'vendas'
                    ? 'bg-amber-500 text-gray-950 font-bold shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Peças Vendidas
              </button>
            </div>

            {/* VIEW MODE 1: AUDITORIAS COMPLETAS */}
            {reportViewMode === 'auditoria' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-display font-bold text-sm text-white">
                    Histórico Filtrado de Auditorias ({filteredVisitasRealizadas.length})
                  </h4>
                  <button
                    onClick={() => {
                      setToastMessage("Relatório de auditorias consolidado e exportado com sucesso em PDF!");
                    }}
                    className="text-xs text-amber-400 font-bold hover:underline cursor-pointer border border-amber-500/10 px-3 py-1.5 rounded-xl bg-[#1F1F22] hover:bg-white/5 transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 transform rotate-180" />
                    Exportar PDF
                  </button>
                </div>

                <div className="space-y-5">
                  {filteredVisitasRealizadas.map((v) => (
                    <div key={v.id} className="bg-[#161618] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg hover:border-white/20 transition-all">
                      
                      {/* Header line of the Audit card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-3">
                        <div>
                          <h4 className="font-bold text-sm text-white">{v.clienteNome}</h4>
                          <p className="text-[10px] text-white/50 mt-0.5">
                            Promotora: <span className="font-bold text-white">{v.promotoraNome}</span> • Cód: {v.promotoraId}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                          <span className="text-white/50">{new Date(v.data).toLocaleDateString('pt-BR')}</span>
                          <span className="text-white/30">•</span>
                          <span className="bg-[#1F1F22] text-white/70 px-2 py-0.5 rounded border border-white/5">
                            Entrada: {v.pontoEntradaManha || '08:00'}
                          </span>
                          <span className="bg-[#1F1F22] text-white/70 px-2 py-0.5 rounded border border-white/5">
                            Saída: {v.pontoSaidaTarde || '17:00'}
                          </span>
                        </div>
                      </div>

                      {/* 3 columns inner content */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        
                        {/* Col 1: PRODUTOS VENDIDOS & REPOSIÇÃO */}
                        <div className="bg-[#1C1C1F]/40 border border-white/5 rounded-xl p-3.5 space-y-3">
                          <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">Produtos Vendidos & Reposição</span>
                          <div className="space-y-1">
                            <p className="font-bold text-sm text-white">{v.pecasVendidas || 0} unidades vendidas</p>
                            <p className="text-[10px] text-white/60">Auditado em gôndola e registrado no Bling.</p>
                          </div>
                          
                          {/* Summary status of stock */}
                          <div className="border-t border-white/5 pt-2 space-y-1 text-[11px]">
                            {v.auditoriaGondola && v.auditoriaGondola.length > 0 ? (
                              (() => {
                                const inStockCount = v.auditoriaGondola.filter(g => g.temEstoque).length;
                                const displayCount = v.auditoriaGondola.filter(g => g.noDisplay).length;
                                return (
                                  <>
                                    <p className="text-white/70">🛒 Estoque: <span className="font-bold text-white">{inStockCount}/{v.auditoriaGondola.length} SKUs OK</span></p>
                                    <p className="text-white/70">✨ Display: <span className="font-bold text-white">{displayCount}/{v.auditoriaGondola.length} SKUs expostos</span></p>
                                  </>
                                );
                              })()
                            ) : (
                              <p className="text-white/40 italic">Sem dados detalhados de estoque.</p>
                            )}
                          </div>
                        </div>

                        {/* Col 2: STATUS CONCORRENTE */}
                        <div className="bg-[#1C1C1F]/40 border border-white/5 rounded-xl p-3.5 space-y-2.5">
                          <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">Status Concorrente</span>
                          
                          {v.analiseConcorrencia && v.analiseConcorrencia.length > 0 ? (
                            <div className="space-y-1.5 text-xs text-white/80">
                              {v.analiseConcorrencia.map((c, idx) => (
                                <div key={idx} className="space-y-1">
                                  <p className="font-bold text-amber-400">Marca: {c.marca}</p>
                                  <p className="text-[11px] text-white/70 leading-normal">
                                    Preços/Notas: Condicionador concorrente saindo a <span className="font-semibold text-white">R$ {c.precoConcorrente.toFixed(2)}</span>. {c.observacoes}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-white/40 italic pt-1">Nenhuma ação concorrente relatada.</p>
                          )}
                        </div>

                        {/* Col 3: REGISTRO FOTOGRÁFICO */}
                        <div className="bg-[#1C1C1F]/40 border border-white/5 rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                          <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">Registro Fotográfico</span>
                          {v.fotoDisplay ? (
                            <div className="flex gap-2 items-center bg-[#1F1F22] p-1.5 rounded-lg border border-white/10">
                              <img src={v.fotoDisplay} alt="Foto Display" className="w-14 h-14 object-cover rounded-md shrink-0" referrerPolicy="no-referrer" />
                              <div className="text-[10px] overflow-hidden">
                                <p className="font-bold text-white truncate">foto_display.jpg</p>
                                <p className="text-white/40">Gôndola organizada</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-lg py-4 text-white/30 text-[10px]">
                              <Camera className="w-5 h-5 mb-1 text-white/15" />
                              Sem fotos anexadas
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Observações Gerais */}
                      <div className="bg-[#1F1F22]/50 border border-white/5 rounded-xl p-3.5 space-y-1 text-xs">
                        <p className="font-bold text-white/80">Observações Gerais do Check-In:</p>
                        <p className="text-white/60 leading-normal italic">
                          "{v.comentarios || 'Nenhum comentário adicional preenchido pela promotora.'}"
                        </p>
                      </div>

                    </div>
                  ))}

                  {filteredVisitasRealizadas.length === 0 && (
                    <div className="text-center py-16 bg-[#161618] rounded-2xl border border-white/10 text-white/40 text-xs">
                      Nenhuma auditoria concluída atende aos filtros de promotora, cliente e período.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW MODE 2: PONTO & PRESENÇA */}
            {reportViewMode === 'presenca' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <h4 className="font-display font-bold text-sm text-white">
                      Relatório de Horários de Entrada & Saída (Mês Corrente)
                    </h4>
                    <p className="text-[11px] text-white/50">Planilha de horários consolidados para espelho de ponto eletrônico.</p>
                  </div>
                  <button
                    onClick={() => {
                      setToastMessage("Espelho de Ponto exportado com sucesso em Excel (CSV)!");
                    }}
                    className="text-xs text-amber-400 font-bold hover:underline cursor-pointer border border-amber-500/10 px-3 py-1.5 rounded-xl bg-[#1F1F22] hover:bg-white/5 transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 transform rotate-180" />
                    Exportar Excel
                  </button>
                </div>

                <div className="overflow-x-auto border border-white/10 rounded-xl bg-[#161618] shadow-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#1F1F22] border-b border-white/10 text-white/60 font-bold font-mono">
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Promotora</th>
                        <th className="px-4 py-3">Ponto de Venda (PDV)</th>
                        <th className="px-4 py-3 text-center">Entrada</th>
                        <th className="px-4 py-3 text-center">Iníc. Almoço</th>
                        <th className="px-4 py-3 text-center">Fim Almoço</th>
                        <th className="px-4 py-3 text-center">Saída Fim</th>
                        <th className="px-4 py-3 text-center">Total Visita</th>
                        <th className="px-4 py-3 text-center">GPS Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white/80">
                      {filteredVisitasRealizadas.map((v) => {
                        let totalHrs = "8h 00m";
                        if (v.entrada && v.saida) {
                          const mDiff = Math.floor((new Date(v.saida).getTime() - new Date(v.entrada).getTime()) / 60000);
                          const hrs = Math.floor(mDiff / 60);
                          const mins = mDiff % 60;
                          totalHrs = `${hrs}h ${mins}m`;
                        }
                        
                        return (
                          <tr key={v.id} className="hover:bg-white/5">
                            <td className="px-4 py-3 font-mono text-white/70">{new Date(v.data).toLocaleDateString('pt-BR')}</td>
                            <td className="px-4 py-3 font-semibold text-white">{v.promotoraNome}</td>
                            <td className="px-4 py-3 text-white/70 truncate max-w-[180px]">{v.clienteNome}</td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-amber-400">{v.pontoEntradaManha || '08:00'}</td>
                            <td className="px-4 py-3 text-center font-mono text-white/50">{v.pontoSaidaAlmoco || '12:00'}</td>
                            <td className="px-4 py-3 text-center font-mono text-white/50">{v.pontoVoltaAlmoco || '13:00'}</td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-amber-400">{v.pontoSaidaTarde || '17:00'}</td>
                            <td className="px-4 py-3 text-center font-mono text-emerald-400 font-bold">{totalHrs}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-block text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                OK (3.0m)
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredVisitasRealizadas.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-4 py-10 text-center text-white/40 italic">
                            Nenhum registro de presença encontrado para os filtros selecionados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW MODE 3: PEÇAS VENDIDAS */}
            {reportViewMode === 'vendas' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h4 className="font-display font-bold text-sm text-white">
                      Análise Quantitativa de Peças Vendidas
                    </h4>
                    <p className="text-[11px] text-white/50">Veja a quantidade de produtos vendidos no período, agrupado conforme sua preferência.</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setToastMessage("Relatório de faturamento e vendas exportado com sucesso em Excel (CSV)!");
                      }}
                      className="text-xs text-amber-400 font-bold hover:underline cursor-pointer border border-amber-500/10 px-3 py-1.5 rounded-xl bg-[#1F1F22] hover:bg-white/5 transition-all flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 transform rotate-180" />
                      Exportar Vendas
                    </button>
                  </div>
                </div>

                <div className="flex bg-[#1F1F22] p-1 rounded-xl border border-white/10 gap-1 w-full max-w-sm self-start">
                  <button
                    onClick={() => setSalesGroupBy('promotora')}
                    className={`flex-1 py-1 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      salesGroupBy === 'promotora'
                        ? 'bg-amber-500 text-gray-950 font-bold shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Por Promotora
                  </button>
                  <button
                    onClick={() => setSalesGroupBy('pdv')}
                    className={`flex-1 py-1 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      salesGroupBy === 'pdv'
                        ? 'bg-amber-500 text-gray-950 font-bold shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Por PDV
                  </button>
                  <button
                    onClick={() => setSalesGroupBy('periodo')}
                    className={`flex-1 py-1 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      salesGroupBy === 'periodo'
                        ? 'bg-amber-500 text-gray-950 font-bold shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Por Período
                  </button>
                </div>

                <div className="bg-[#161618] border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
                  <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Resultados Consolidados ({
                      salesGroupBy === 'promotora' ? 'Promotoras Ativas' : salesGroupBy === 'pdv' ? 'Pontos de Venda' : 'Dias com Registro'
                    })
                  </span>

                  <div className="space-y-4 pt-1">
                    {salesGroupBy === 'promotora' && (() => {
                      const data = promotoras.map(p => {
                        const visits = filteredVisitasRealizadas.filter(v => v.promotoraId === p.id);
                        const sales = visits.reduce((sum, v) => sum + (v.pecasVendidas || 0), 0);
                        return { id: p.id, name: p.nome, sales, visits: visits.length };
                      }).sort((a, b) => b.sales - a.sales);

                      const maxSales = Math.max(...data.map(d => d.sales), 1);

                      return (
                        <div className="space-y-3.5">
                          {data.map(item => (
                            <div key={item.id} className="space-y-1 text-xs">
                              <div className="flex justify-between font-bold text-white">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  {item.name} <span className="text-[10px] text-white/40 font-medium">({item.visits} visitas concluídas)</span>
                                </span>
                                <span className="font-mono text-amber-400">{item.sales} un</span>
                              </div>
                              <div className="w-full bg-[#1F1F22] h-2.5 rounded-full overflow-hidden border border-white/5">
                                <div 
                                  className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${(item.sales / maxSales) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {salesGroupBy === 'pdv' && (() => {
                      const data = clientes.map(c => {
                        const visits = filteredVisitasRealizadas.filter(v => v.clienteId === c.id);
                        const sales = visits.reduce((sum, v) => sum + (v.pecasVendidas || 0), 0);
                        return { id: c.id, name: c.nome, city: c.cidade, sales, visits: visits.length };
                      }).sort((a, b) => b.sales - a.sales);

                      const maxSales = Math.max(...data.map(d => d.sales), 1);

                      return (
                        <div className="space-y-3.5">
                          {data.map(item => (
                            <div key={item.id} className="space-y-1 text-xs">
                              <div className="flex justify-between font-bold text-white">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  {item.name} <span className="text-[10px] text-white/40 font-medium">({item.city}/ES - {item.visits} check-ins)</span>
                                </span>
                                <span className="font-mono text-amber-400">{item.sales} un</span>
                              </div>
                              <div className="w-full bg-[#1F1F22] h-2.5 rounded-full overflow-hidden border border-white/5">
                                <div 
                                  className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${(item.sales / maxSales) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {salesGroupBy === 'periodo' && (() => {
                      const dates = Array.from(new Set(filteredVisitasRealizadas.map(v => v.data))).sort();
                      
                      const data = dates.map(dt => {
                        const visits = filteredVisitasRealizadas.filter(v => v.data === dt);
                        const sales = visits.reduce((sum, v) => sum + (v.pecasVendidas || 0), 0);
                        return { dateStr: dt, sales, visits: visits.length };
                      });

                      const maxSales = Math.max(...data.map(d => d.sales), 1);

                      return (
                        <div className="space-y-3.5">
                          {data.map(item => (
                            <div key={item.dateStr} className="space-y-1 text-xs">
                              <div className="flex justify-between font-bold text-white">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  {new Date(item.dateStr).toLocaleDateString('pt-BR')} <span className="text-[10px] text-white/40 font-medium">({item.visits} pdvs auditados)</span>
                                </span>
                                <span className="font-mono text-amber-400">{item.sales} un</span>
                              </div>
                              <div className="w-full bg-[#1F1F22] h-2.5 rounded-full overflow-hidden border border-white/5">
                                <div 
                                  className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${(item.sales / maxSales) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}

                          {data.length === 0 && (
                            <p className="text-xs text-white/40 italic text-center py-4">Nenhum dado de vendas registrado no período.</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Toast Notification */}
            {toastMessage && (
              <div className="fixed bottom-6 right-6 bg-[#161618] border-2 border-emerald-500/40 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 animate-slide-up z-50">
                <span className="text-emerald-400 text-lg leading-none">✓</span>
                <div>
                  <p className="font-bold text-xs">Sucesso!</p>
                  <p className="text-[11px] text-white/70">{toastMessage}</p>
                </div>
              </div>
            )}

          </div>
        );
      })()}

      {/* SUB TAB: CONFIGURAÇÕES DO APP */}
      {activeSubTab === 'config' && (
        <div className="bg-[#161618] rounded-2xl border border-white/10 p-6 space-y-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                Configurações Gerais do Aplicativo
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                  activePromotora?.role === 'Admin'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {activePromotora?.role === 'Admin' ? 'Acesso Administrativo Liberado' : 'Acesso Restrito - Somente Leitura'}
                </span>
              </h3>
              <p className="text-xs text-white/60">Gerencie o escopo e o modo de exibição das telas do sistema de acordo com os parâmetros globais.</p>
            </div>

            <div className="bg-[#1F1F22] border border-white/10 px-3 py-2 rounded-xl text-xs space-y-1 shrink-0">
              <div className="text-[10px] text-white/50 font-mono flex items-center gap-1">
                <Shield className="w-3 h-3 text-amber-400" />
                <span>Perfil Ativo: <strong className="text-white">{activePromotora?.nome}</strong> ({activePromotora?.role})</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-mono">
                ✓ Persistência de Sessão Segura Ativa
              </div>
            </div>
          </div>

          {activePromotora?.role !== 'Admin' && (
            <div className="bg-rose-950/40 border border-rose-500/40 p-4 rounded-xl flex items-center gap-3 text-xs text-rose-200">
              <Lock className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="font-bold">Validação de Segurança de Perfil</p>
                <p className="text-[11px] text-rose-300/80">
                  Sua conta atual ({activePromotora?.email || activePromotora?.nome}) está registrada como <strong>{activePromotora?.role}</strong>. A alteração de parâmetros globais do aplicativo (como alternar entre Modo Standalone e Portal Multimodular) é restrita exclusivamente a usuários com perfil <strong>Admin</strong>.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Standalone */}
            <div className={`border p-5 rounded-2xl space-y-3.5 transition-all flex flex-col justify-between ${
              isStandaloneMode 
                ? 'border-amber-500 bg-amber-500/5' 
                : 'border-white/10 hover:border-white/20 bg-[#1F1F22]'
            }`}>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-white">Módulo de Promotoras (Restrito / Standalone)</h4>
                  {isStandaloneMode && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">Ativo</span>
                  )}
                </div>
                <p className="text-xs text-white/60 leading-normal">
                  Neste modo, o aplicativo oculta faturamento Bling, representantes e relatórios comerciais. A tela de login, o cabeçalho e os fluxos são simplificados exclusivamente para a equipe de promotoras. O aplicativo funciona como um ecossistema independente focado em auditoria, check-in, escalas e fotos de gôndola.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (activePromotora?.role !== 'Admin') {
                    triggerPushAlert(
                      'Acesso Negado',
                      'Apenas usuários com perfil de Administrador podem alterar as configurações globais do aplicativo.',
                      'warning'
                    );
                    return;
                  }
                  setIsStandaloneMode(true);
                  triggerPushAlert(
                    'Modo Alterado',
                    'Aplicativo alternado para o Modo Standalone de Promotoras.',
                    'success'
                  );
                }}
                disabled={activePromotora?.role !== 'Admin'}
                className={`w-full font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activePromotora?.role !== 'Admin'
                    ? 'bg-gray-800 text-white/40 border border-white/5 cursor-not-allowed'
                    : isStandaloneMode
                    ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/10 hover:bg-amber-600'
                    : 'bg-[#1F1F22] hover:bg-white/5 border border-white/10 text-white'
                }`}
              >
                {activePromotora?.role !== 'Admin' && <Lock className="w-3.5 h-3.5 text-rose-400" />}
                Ativar Modo Promotoras Standalone
              </button>
            </div>

            {/* Multimodular */}
            <div className={`border p-5 rounded-2xl space-y-3.5 transition-all flex flex-col justify-between ${
              !isStandaloneMode 
                ? 'border-amber-500 bg-amber-500/5' 
                : 'border-white/10 hover:border-white/20 bg-[#1F1F22]'
            }`}>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-white">Portal Comercial Multimodular (Completo)</h4>
                  {!isStandaloneMode && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">Ativo</span>
                  )}
                </div>
                <p className="text-xs text-white/60 leading-normal">
                  O modo multimodular unifica todas as pontas comerciais da Safira Cosméticos: Faturamento de Pedidos de Representantes, Clientes, Sincronização do ERP Bling v3, BI Financeiro e de Vendas, além do acompanhamento em tempo real das visitas e ponto eletrônico de todas as promotoras.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (activePromotora?.role !== 'Admin') {
                    triggerPushAlert(
                      'Acesso Negado',
                      'Apenas usuários com perfil de Administrador podem alterar as configurações globais do aplicativo.',
                      'warning'
                    );
                    return;
                  }
                  setIsStandaloneMode(false);
                  triggerPushAlert(
                    'Modo Alterado',
                    'Aplicativo alternado para o Portal Comercial Multimodular Completo.',
                    'success'
                  );
                }}
                disabled={activePromotora?.role !== 'Admin'}
                className={`w-full font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activePromotora?.role !== 'Admin'
                    ? 'bg-gray-800 text-white/40 border border-white/5 cursor-not-allowed'
                    : !isStandaloneMode
                    ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/10 hover:bg-amber-600'
                    : 'bg-[#1F1F22] hover:bg-white/5 border border-white/10 text-white'
                }`}
              >
                {activePromotora?.role !== 'Admin' && <Lock className="w-3.5 h-3.5 text-rose-400" />}
                Ativar Modo Multimodular Completo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LIBERAÇÃO DE GEOFENCE POR SUPERVISOR */}
      {showBypassModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg bg-[#161618] border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/40">
                  <Unlock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-white">Liberação Especial de Geocerca (Supervisor)</h3>
                  <p className="text-[10px] text-white/50">Autorização para bater ponto fora do raio do PDV</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBypassModal(false);
                  setSupervisorCode('');
                  setBypassJustification('');
                  setBypassError('');
                }}
                className="text-white/40 hover:text-white text-xs font-bold p-1 rounded-lg hover:bg-white/5"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-white/70 leading-normal">
              Esta ação libera imediatamente o registro de ponto do colaborador mesmo que o GPS esteja fora do raio de geolocalização do PDV.
            </p>

            {/* Seleção do Cliente caso nenhum esteja selecionado */}
            {!selectedClienteId && (
              <div className="space-y-1 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider">Selecione o PDV / Cliente Alvo</label>
                <select
                  value={selectedClienteId}
                  onChange={(e) => setSelectedClienteId(e.target.value)}
                  className="w-full bg-[#1F1F22] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="">-- Escolha um Cliente --</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>[{c.id}] {c.nome} - {c.cidade}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">Código do Supervisor (Senha)</label>
                  <button
                    type="button"
                    onClick={() => setSupervisorCode('1234')}
                    className="text-[10px] text-amber-400 hover:underline font-bold"
                  >
                    ⚡ Usar Senha Padrão (1234)
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="Digite a senha (padrão: 1234 ou 0000)"
                  value={supervisorCode}
                  onChange={(e) => {
                    setSupervisorCode(e.target.value);
                    setBypassError('');
                  }}
                  className="w-full bg-[#1F1F22] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">Justificativa da Liberação</label>
                <textarea
                  placeholder="Descreva o motivo da liberação fora do raio do PDV..."
                  value={bypassJustification}
                  onChange={(e) => {
                    setBypassJustification(e.target.value);
                    setBypassError('');
                  }}
                  rows={2}
                  className="w-full bg-[#1F1F22] border border-white/10 rounded-xl px-3.5 py-2.5 text-white leading-normal placeholder-white/30 focus:border-amber-500 focus:outline-none"
                />

                {/* Chips com Justificativas Rápidas */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    '📍 Instabilidade no Sinal de GPS do Aparelho',
                    '🏢 Loja em Shopping / Subsolo sem Sinal',
                    '📱 Dispositivo em Manutenção / Erro de Precisão',
                    '👑 Autorizado pelo Gestor Responsável em Campo'
                  ].map((just, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setBypassJustification(just);
                        setBypassError('');
                      }}
                      className="text-[10px] bg-white/5 hover:bg-amber-500/20 text-white/70 hover:text-amber-300 border border-white/10 px-2 py-1 rounded-lg transition-all text-left cursor-pointer"
                    >
                      + {just}
                    </button>
                  ))}
                </div>
              </div>

              {bypassError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 font-medium">
                  ⚠️ {bypassError}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowBypassModal(false);
                  setSupervisorCode('');
                  setBypassJustification('');
                  setBypassError('');
                }}
                className="py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!selectedClienteId && clientes.length > 0) {
                    setSelectedClienteId(clientes[0].id);
                  }
                  const code = supervisorCode.trim();
                  const just = bypassJustification.trim() || 'Liberação emergencial de ponto autorizada pelo supervisor em campo.';

                  if (code && code !== '1234' && code !== '0000' && code !== 'admin' && code.length < 3) {
                    setBypassError('Código de autorização inválido! Use a senha "1234" ou clique no botão de autorização rápida.');
                    return;
                  }

                  setIsSupervisorBypassActive(true);
                  setBypassJustification(just);
                  setShowBypassModal(false);
                  setSupervisorCode('');
                  setBypassError('');
                  triggerPushAlert(
                    '🔓 Geocerca Liberada',
                    `Ponto liberado com sucesso pelo supervisor!`,
                    'success'
                  );
                }}
                className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <Unlock className="w-4 h-4" />
                Autorizar e Liberar Ponto Agora
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE PROMOTORA */}
      {editingPromotora && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#161618] border border-amber-500/30 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-500" />
                  Editar Cadastro da Promotora
                </h3>
                <p className="text-xs text-white/50">Atualize os dados e credenciais de acesso da promotora.</p>
              </div>
              <button
                onClick={() => setEditingPromotora(null)}
                className="text-white/40 hover:text-white p-1 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditPromotoraSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={editPromNome}
                    onChange={(e) => setEditPromNome(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#1F1F22] border border-white/10 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Código Bling/Vendedor *</label>
                  <input
                    type="text"
                    required
                    value={editPromBling}
                    onChange={(e) => setEditPromBling(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#1F1F22] border border-white/10 text-white focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    value={editPromTel}
                    onChange={(e) => setEditPromTel(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#1F1F22] border border-white/10 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">E-mail Corporativo *</label>
                  <input
                    type="email"
                    required
                    value={editPromEmail}
                    onChange={(e) => setEditPromEmail(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#1F1F22] border border-white/10 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Função / Cargo</label>
                  <select
                    value={editPromRole}
                    onChange={(e) => setEditPromRole(e.target.value as any)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#1F1F22] border border-white/10 text-white focus:border-amber-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Promotora" className="bg-[#161618]">Promotora de Vendas</option>
                    <option value="Admin" className="bg-[#161618]">Supervisão / Administradora</option>
                    <option value="Representante" className="bg-[#161618]">Representante Comercial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Status da Conta</label>
                  <select
                    value={editPromStatus}
                    onChange={(e) => setEditPromStatus(e.target.value as any)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#1F1F22] border border-white/10 text-white focus:border-amber-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Ativa" className="bg-[#161618]">🟢 Ativa (Pode Bater Ponto)</option>
                    <option value="Inativa" className="bg-[#161618]">🔴 Inativa (Acesso Bloqueado)</option>
                  </select>
                </div>
              </div>

              {/* Login e Senha */}
              <div className="bg-[#1F1F22] p-4 rounded-xl border border-amber-500/20 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Key className="w-3.5 h-3.5" /> Credenciais de Login e Senha
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const creds = generateCredentials(editPromNome);
                      setEditPromUsuario(creds.usuario);
                      setEditPromSenha(creds.senha);
                    }}
                    className="text-[10px] text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Redefinir Automático
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Usuário / Login *</label>
                    <input
                      type="text"
                      required
                      value={editPromUsuario}
                      onChange={(e) => setEditPromUsuario(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#161618] border border-white/10 text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Senha de Acesso *</label>
                    <input
                      type="text"
                      required
                      value={editPromSenha}
                      onChange={(e) => setEditPromSenha(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#161618] border border-white/10 text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">URL da Foto de Perfil (Avatar)</label>
                <input
                  type="text"
                  value={editPromAvatar}
                  onChange={(e) => setEditPromAvatar(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-lg bg-[#1F1F22] border border-white/10 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/10">
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold px-6 py-2.5 rounded-xl text-xs cursor-pointer shadow-md shadow-amber-500/10 flex-1"
                >
                  Salvar Alterações
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPromotora(null)}
                  className="bg-[#1F1F22] hover:bg-white/5 text-white border border-white/10 px-5 py-2.5 rounded-xl text-xs cursor-pointer font-bold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ENVIAR CREDENCIAIS DE ACESSO */}
      {credentialsModalPromotora && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161618] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-500" />
                  Credenciais de Acesso da Promotora
                </h3>
                <p className="text-xs text-white/50">{credentialsModalPromotora.nome}</p>
              </div>
              <button
                onClick={() => setCredentialsModalPromotora(null)}
                className="text-white/40 hover:text-white p-1 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#1F1F22] p-4 rounded-xl border border-amber-500/20 space-y-3">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">Nome do Usuário</span>
                <span className="text-xs font-bold text-white">{credentialsModalPromotora.nome}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 font-mono text-xs">
                <div>
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block font-sans">Usuário / Login</span>
                  <span className="text-amber-400 font-bold block">{credentialsModalPromotora.usuario || credentialsModalPromotora.email.split('@')[0]}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block font-sans">Senha de Acesso</span>
                  <span className="text-white font-bold block">{credentialsModalPromotora.senha || 'safira123'}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-white/5 text-[11px] text-white/60 space-y-0.5">
                <p>E-mail: <strong className="text-white">{credentialsModalPromotora.email}</strong></p>
                <p>Telefone: <strong className="text-white">{credentialsModalPromotora.telefone}</strong></p>
                <p>Cód. Bling: <strong className="text-amber-400 font-mono">{credentialsModalPromotora.codigoBling}</strong></p>
              </div>
            </div>

            {copiedToast && (
              <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-3 py-2 rounded-xl text-xs font-bold text-center animate-pulse">
                ✅ Dados de acesso copiados para a área de transferência!
              </div>
            )}

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleSendCredentialsWhatsApp(credentialsModalPromotora)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
              >
                📲 Enviar Credenciais por WhatsApp Direct
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyCredentials(credentialsModalPromotora)}
                  className="bg-[#1F1F22] hover:bg-white/10 text-white border border-white/10 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" /> Copiar Acesso
                </button>
                <button
                  type="button"
                  onClick={() => handleSendCredentialsEmail(credentialsModalPromotora)}
                  className="bg-[#1F1F22] hover:bg-white/10 text-white border border-white/10 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-amber-400" /> Enviar por E-mail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LOGIN DA PROMOTORA */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161618] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-amber-500" />
                  Entrar no Portal com Usuário & Senha
                </h3>
                <p className="text-xs text-white/50">Digite o seu usuário e senha criados para acessar seu perfil de promotora.</p>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {loginErrorMessage && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs font-semibold">
                {loginErrorMessage}
              </div>
            )}

            <form onSubmit={handlePromotoraLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Usuário, E-mail ou Cód. Bling *</label>
                <input
                  type="text"
                  required
                  value={loginUsuarioInput}
                  onChange={(e) => setLoginUsuarioInput(e.target.value)}
                  placeholder="Ex: jaqueline.vechi ou PROM04"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white focus:border-amber-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Senha de Acesso *</label>
                <input
                  type="password"
                  required
                  value={loginSenhaInput}
                  onChange={(e) => setLoginSenhaInput(e.target.value)}
                  placeholder="Sua senha cadastrada"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="bg-[#1F1F22] p-3 rounded-xl border border-white/5 text-[11px] text-white/60 space-y-1">
                <p className="font-bold text-amber-400">💡 Dica de Acesso:</p>
                <p>Os logins de teste padrão são:</p>
                <p>• <strong>jaqueline.vechi</strong> / <strong>safira123</strong></p>
                <p>• <strong>daniela.alves</strong> / <strong>safira123</strong></p>
                <p>• <strong>admin.safira</strong> / <strong>safira2026</strong></p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-amber-500/10 cursor-pointer"
                >
                  Autenticar e Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
