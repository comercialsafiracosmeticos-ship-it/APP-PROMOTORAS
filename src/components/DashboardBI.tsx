import { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Cliente, Visita, Produto, Pedido, Promotora, MetaVendaPromotora } from '../types';
import { 
  Calendar, ShoppingBag, AlertOctagon, TrendingUp, DollarSign, 
  Target, Award, Settings, CheckCircle2, AlertCircle, ArrowUpRight,
  Edit3, Trophy, Users, Save, X, Plus, Sparkles, Bell, BellRing, Zap, Flame, CheckCheck
} from 'lucide-react';

interface DashboardBIProps {
  promotoras?: Promotora[];
  clientes: Cliente[];
  visitas: Visita[];
  produtos: Produto[];
  pedidos: Pedido[];
  metasVendas?: MetaVendaPromotora[];
  onSaveMetas?: (metas: MetaVendaPromotora[]) => void;
  currentUser?: Promotora | null;
}

export default function DashboardBI({ 
  promotoras = [], 
  clientes, 
  visitas, 
  produtos, 
  pedidos,
  metasVendas = [],
  onSaveMetas,
  currentUser
}: DashboardBIProps) {
  // Month Selection State
  const [selectedMesAno, setSelectedMesAno] = useState('2026-07');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [alertFilter, setAlertFilter] = useState<'ALL' | '100' | '80'>('ALL');
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const isPromotoraMode = currentUser?.role === 'Promotora';

  // Fallback default promotoras if empty prop
  const allPromotoras = promotoras.length > 0 ? promotoras : [
    { id: 'prom-01', nome: 'Jaqueline Vechi', codigoBling: 'PROM04', telefone: '', email: '', status: 'Ativa' as const, role: 'Promotora' as const },
    { id: 'prom-02', nome: 'Daniela Alves de Almeida', codigoBling: 'PROM05', telefone: '', email: '', status: 'Ativa' as const, role: 'Promotora' as const },
    { id: 'prom-03', nome: 'Vanessa Vicente', codigoBling: 'PROM06', telefone: '', email: '', status: 'Ativa' as const, role: 'Admin' as const },
    { id: 'prom-04', nome: 'Safira Cosméticos Admin', codigoBling: 'ADMIN01', telefone: '', email: '', status: 'Ativa' as const, role: 'Admin' as const }
  ];

  // If Promotora is logged in, filter list to HER ONLY
  const activePromotoras = isPromotoraMode && currentUser
    ? allPromotoras.filter(p => p.id === currentUser.id || p.nome === currentUser.nome)
    : allPromotoras;

  // Filter visits for active user if in Promotora Mode
  const filteredVisitas = isPromotoraMode && currentUser
    ? visitas.filter(v => v.promotoraId === currentUser.id)
    : visitas;

  // Map of targets by promotora ID for selected month
  const initialLocalMetas = activePromotoras.reduce((acc, p) => {
    const existing = metasVendas.find(m => m.promotoraId === p.id && m.mesAno === selectedMesAno);
    if (existing) {
      acc[p.id] = existing.metaValor;
    } else {
      // Default initial targets
      if (p.nome.includes('Jaqueline')) acc[p.id] = 5000;
      else if (p.nome.includes('Daniela')) acc[p.id] = 3500;
      else if (p.nome.includes('Vanessa')) acc[p.id] = 3000;
      else acc[p.id] = 4000;
    }
    return acc;
  }, {} as Record<string, number>);

  const [formMetas, setFormMetas] = useState<Record<string, number>>(initialLocalMetas);

  const handleOpenConfig = () => {
    // Refresh form state
    const current = activePromotoras.reduce((acc, p) => {
      const existing = metasVendas.find(m => m.promotoraId === p.id && m.mesAno === selectedMesAno);
      if (existing) {
        acc[p.id] = existing.metaValor;
      } else {
        acc[p.id] = formMetas[p.id] || 4000;
      }
      return acc;
    }, {} as Record<string, number>);

    setFormMetas(current);
    setIsConfigModalOpen(true);
  };

  const handleSaveConfig = () => {
    const updatedList: MetaVendaPromotora[] = [...metasVendas];

    activePromotoras.forEach((p) => {
      const val = Number(formMetas[p.id]) || 0;
      const idx = updatedList.findIndex(m => m.promotoraId === p.id && m.mesAno === selectedMesAno);
      if (idx >= 0) {
        updatedList[idx] = { ...updatedList[idx], metaValor: val };
      } else {
        updatedList.push({
          id: 'meta-' + Math.random().toString(36).substring(2, 9),
          promotoraId: p.id,
          promotoraNome: p.nome,
          mesAno: selectedMesAno,
          metaValor: val
        });
      }
    });

    if (onSaveMetas) {
      onSaveMetas(updatedList);
    }
    setIsConfigModalOpen(false);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 3000);
  };

  // Calculate actual sales per promotora
  const getVendasRealizadas = (promotora: Promotora) => {
    const matchingPedidos = pedidos.filter(p => {
      if (!p.vendedor) return false;
      const vend = p.vendedor.toLowerCase();
      const nameParts = promotora.nome.toLowerCase().split(' ');
      const firstName = nameParts[0];
      return vend.includes(firstName) || vend.includes(promotora.nome.toLowerCase());
    });

    const totalFromPedidos = matchingPedidos.reduce((sum, p) => sum + p.valor, 0);

    // If no orders mapped directly to seller name, check visits pieces sold * avg price fallback
    if (totalFromPedidos === 0) {
      const pVisitas = visitas.filter(v => v.promotoraId === promotora.id || v.promotoraNome === promotora.nome);
      const units = pVisitas.reduce((sum, v) => sum + (v.pecasVendidas || 0), 0);
      return units * 38.50; // Average price
    }

    return totalFromPedidos;
  };

  // Build dataset for progress chart & metrics
  const metasProgressData = activePromotoras.map((prom) => {
    const targetVal = (() => {
      const found = metasVendas.find(m => m.promotoraId === prom.id && m.mesAno === selectedMesAno);
      if (found) return found.metaValor;
      return formMetas[prom.id] || (prom.nome.includes('Jaqueline') ? 5000 : prom.nome.includes('Daniela') ? 3500 : 3000);
    })();

    const realizadasVal = getVendasRealizadas(prom);
    const percentAtingido = targetVal > 0 ? Math.round((realizadasVal / targetVal) * 100) : 0;
    const diferenca = realizadasVal - targetVal;

    let statusTag: 'SUPERADA' | 'EM_PROGRESSO' | 'ATENCAO' = 'EM_PROGRESSO';
    if (percentAtingido >= 100) statusTag = 'SUPERADA';
    else if (percentAtingido < 60) statusTag = 'ATENCAO';

    return {
      promotoraId: prom.id,
      nome: prom.nome.split(' ')[0] + ' ' + (prom.nome.split(' ')[1]?.[0] || '') + '.',
      nomeCompleto: prom.nome,
      avatar: prom.avatar,
      vendasRealizadas: Math.round(realizadasVal * 100) / 100,
      metaEstipulada: targetVal,
      percentAtingido,
      diferenca,
      statusTag
    };
  });

  // Global KPIs for Metas Module
  const totalMetaGlobal = metasProgressData.reduce((acc, curr) => acc + curr.metaEstipulada, 0);
  const totalRealizadoGlobal = metasProgressData.reduce((acc, curr) => acc + curr.vendasRealizadas, 0);
  const percentAtingimentoGlobal = totalMetaGlobal > 0 ? Math.round((totalRealizadoGlobal / totalMetaGlobal) * 100) : 0;
  
  // Top performer
  const topPromotora = [...metasProgressData].sort((a, b) => b.percentAtingido - a.percentAtingido)[0];

  // 1. Chart Data: Faturamento por Cliente
  const faturamentoData = clientes.map(c => ({
    name: c.nome.split('-')[0].trim(),
    Valor: c.faturamentoTotal
  }));

  // 2. Competitor Pricing comparison
  const pricesData = [
    { name: 'Reparador Amend', Safira: 43.89, Concorrente: 68.00 },
    { name: 'Filtro Amend', Safira: 26.99, Concorrente: 42.00 },
    { name: 'Mascara Brilho', Safira: 31.15, Concorrente: 59.00 },
    { name: 'Mascara Matiz', Safira: 42.99, Concorrente: 148.00 }
  ];

  // 3. Totals
  const totalVisitas = visitas.length;
  const concluidaVisitas = visitas.filter(v => v.status === 'concluida').length;
  const totalUnitsSold = visitas.reduce((sum, v) => sum + (v.pecasVendidas || 0), 0);
  const expiryAlerts = visitas.reduce((sum, v) => sum + (v.produtosVencer?.length || 0), 0);

  return (
    <div className="space-y-8" id="bi-dashboard-section">
      
      {/* ------------------------------------------------------------- */}
      {/* NOVO MÓDULO: METAS DE VENDAS MENSAIS POR PROMOTORA            */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#161618] rounded-2xl border border-white/10 shadow-xl overflow-hidden p-6 space-y-6">
        
        {/* Module Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl shadow-sm">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-lg text-white">Metas de Vendas Mensais por Promotora</h2>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Gestão Comercial
                </span>
              </div>
              <p className="text-xs text-white/60">Acompanhamento do atingimento de metas e comparação com pedidos faturados no Bling</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Month Filter */}
            <div className="flex items-center gap-2 bg-[#1F1F22] border border-white/10 px-3 py-1.5 rounded-xl text-xs">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-white/50 text-[11px] font-medium">Mês:</span>
              <select
                value={selectedMesAno}
                onChange={(e) => setSelectedMesAno(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="2026-05" className="bg-[#1F1F22] text-white">Maio / 2026</option>
                <option value="2026-06" className="bg-[#1F1F22] text-white">Junho / 2026</option>
                <option value="2026-07" className="bg-[#1F1F22] text-white">Julho / 2026</option>
                <option value="2026-08" className="bg-[#1F1F22] text-white">Agosto / 2026</option>
              </select>
            </div>

            {/* Config Metas Button */}
            <button
              onClick={handleOpenConfig}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-gray-950 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/10 cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              Configurar Metas
            </button>
          </div>
        </div>

        {/* Global Metas KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#1F1F22] p-4 rounded-xl border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Meta Total Consolidada</span>
            <div className="text-2xl font-display font-bold text-white">
              {totalMetaGlobal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-[11px] text-white/50">Soma das metas das promotoras</p>
          </div>

          <div className="bg-[#1F1F22] p-4 rounded-xl border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Vendas Realizadas (Bling)</span>
            <div className="text-2xl font-display font-bold text-amber-400">
              {totalRealizadoGlobal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-[11px] text-amber-400/80 font-medium">Faturamento real acumulado</p>
          </div>

          <div className="bg-[#1F1F22] p-4 rounded-xl border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">% Atingimento Global</span>
            <div className="text-2xl font-display font-bold text-emerald-400 flex items-center gap-2">
              {percentAtingimentoGlobal}%
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(percentAtingimentoGlobal, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-[#1F1F22] p-4 rounded-xl border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> Promotora Destaque
            </span>
            <div className="text-base font-display font-bold text-white truncate">
              {topPromotora?.nomeCompleto || 'N/A'}
            </div>
            <p className="text-[11px] text-emerald-400 font-semibold">
              {topPromotora ? `${topPromotora.percentAtingido}% da meta batida!` : ''}
            </p>
          </div>
        </div>

        {/* PAINEL DE ALERTAS VISUAIS DO GESTOR (METAS DE 80% E 100%) */}
        {(() => {
          const alerts100 = metasProgressData.filter(i => i.percentAtingido >= 100);
          const alerts80 = metasProgressData.filter(i => i.percentAtingido >= 80 && i.percentAtingido < 100);
          const totalAlerts = alerts100.length + alerts80.length;

          return (
            <div className="bg-[#1F1F22] rounded-2xl p-5 border border-amber-500/20 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <BellRing className="w-5 h-5 text-amber-400" />
                    {totalAlerts > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Alertas de Desempenho e Notificações ao Gestor
                      {totalAlerts > 0 && (
                        <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                          {totalAlerts} {totalAlerts === 1 ? 'notificação ativa' : 'notificações ativas'}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-white/50">Avisos visuais automáticos quando promotoras atingem os gatilhos de 80% e 100% da meta mensal</p>
                  </div>
                </div>

                {/* Filter tabs for alerts */}
                <div className="flex items-center gap-1.5 bg-[#161618] p-1 rounded-xl border border-white/10 text-xs">
                  <button
                    onClick={() => setAlertFilter('ALL')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      alertFilter === 'ALL' 
                        ? 'bg-amber-500 text-gray-950 shadow-sm' 
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Todos ({totalAlerts})
                  </button>
                  <button
                    onClick={() => setAlertFilter('100')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      alertFilter === '100' 
                        ? 'bg-emerald-500 text-gray-950 shadow-sm' 
                        : 'text-emerald-400/80 hover:text-emerald-300'
                    }`}
                  >
                    <Trophy className="w-3 h-3" />
                    100% Meta Batida ({alerts100.length})
                  </button>
                  <button
                    onClick={() => setAlertFilter('80')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      alertFilter === '80' 
                        ? 'bg-amber-500 text-gray-950 shadow-sm' 
                        : 'text-amber-400/80 hover:text-amber-300'
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    80%+ Reta Final ({alerts80.length})
                  </button>
                </div>
              </div>

              {/* Alert Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Render 100%+ Alerts */}
                {(alertFilter === 'ALL' || alertFilter === '100') && alerts100.map((item) => (
                  <div 
                    key={`alert-100-${item.promotoraId}`}
                    className="bg-gradient-to-r from-emerald-950/50 via-[#1F1F22] to-[#1F1F22] p-4 rounded-xl border border-emerald-500/40 relative overflow-hidden shadow-lg space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {item.avatar ? (
                          <img src={item.avatar} alt={item.nomeCompleto} className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center border-2 border-emerald-400">
                            {item.nomeCompleto[0]}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{item.nomeCompleto}</span>
                            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                              <Trophy className="w-3 h-3 text-emerald-400" /> META 100% BATIDA!
                            </span>
                          </div>
                          <p className="text-xs text-emerald-300 font-semibold mt-0.5">
                            Atingiu <strong className="text-white font-bold">{item.percentAtingido}%</strong> da meta ({item.vendasRealizadas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de {item.metaEstipulada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-500/20 text-[11px] text-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span><strong>Orientação do Gestor:</strong> Elegível para premiação/comissão de vendas.</span>
                      </span>
                      <button 
                        onClick={() => alert(`Notificação enviada e bonificação liberada para ${item.nomeCompleto}!`)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all shrink-0 shadow-sm"
                      >
                        Aprovar Bonificação
                      </button>
                    </div>
                  </div>
                ))}

                {/* Render 80%+ Alerts */}
                {(alertFilter === 'ALL' || alertFilter === '80') && alerts80.map((item) => {
                  const valorRestante = item.metaEstipulada - item.vendasRealizadas;
                  return (
                    <div 
                      key={`alert-80-${item.promotoraId}`}
                      className="bg-gradient-to-r from-amber-950/50 via-[#1F1F22] to-[#1F1F22] p-4 rounded-xl border border-amber-500/40 relative overflow-hidden shadow-lg space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {item.avatar ? (
                            <img src={item.avatar} alt={item.nomeCompleto} className="w-10 h-10 rounded-full object-cover border-2 border-amber-400" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center border-2 border-amber-400">
                              {item.nomeCompleto[0]}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{item.nomeCompleto}</span>
                              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-400" /> ALERTA DE 80%+
                              </span>
                            </div>
                            <p className="text-xs text-amber-300 font-semibold mt-0.5">
                              Alcançou <strong className="text-white font-bold">{item.percentAtingido}%</strong>! Faltam apenas <strong className="text-amber-200">{valorRestante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> para 100%.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-amber-950/60 p-2.5 rounded-lg border border-amber-500/20 text-[11px] text-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                          <span><strong>Ação do Gestor:</strong> Reforçar suporte em lojas estratégicas.</span>
                        </span>
                        <button 
                          onClick={() => alert(`Notificação de incentivo enviada para ${item.nomeCompleto}!`)}
                          className="bg-amber-500 hover:bg-amber-400 text-gray-950 px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all shrink-0 shadow-sm"
                        >
                          Incentivar Promotora
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Empty State */}
                {((alertFilter === 'ALL' && totalAlerts === 0) ||
                  (alertFilter === '100' && alerts100.length === 0) ||
                  (alertFilter === '80' && alerts80.length === 0)) && (
                  <div className="col-span-full py-6 text-center text-xs text-white/40 border border-dashed border-white/10 rounded-xl space-y-1">
                    <AlertCircle className="w-5 h-5 mx-auto text-white/30" />
                    <p>Nenhuma notificação nesta categoria para o mês selecionado.</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Gráfico de Progresso: Realizado vs Meta */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Chart */}
          <div className="lg:col-span-7 bg-[#1F1F22]/50 p-5 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Gráfico de Progresso: Vendas Realizadas vs Meta</h3>
                <p className="text-xs text-white/60">Comparação financeira em R$ por promotora no mês selecionado</p>
              </div>
              <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-semibold">
                {selectedMesAno}
              </span>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metasProgressData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis dataKey="nome" tick={{ fontSize: 11, fill: 'rgba(255, 255, 255, 0.6)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255, 255, 255, 0.4)' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1C1C1F', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }}
                    labelStyle={{ fontWeight: 'bold', color: '#fff' }}
                    formatter={(value: any, name: any) => [
                      `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      name === 'vendasRealizadas' ? 'Vendas Realizadas' : 'Meta Estabelecida'
                    ]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.7)' }} />
                  <Bar dataKey="vendasRealizadas" name="Vendas Realizadas (R$)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="metaEstipulada" name="Meta Estabelecida (R$)" fill="#374151" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Individual Promotora Progress List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex justify-between items-center pb-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                Desempenho por Promotora
              </h3>
              {saveFeedback && (
                <span className="text-[11px] text-emerald-400 font-semibold animate-fadeIn">
                  Metas salvas com sucesso!
                </span>
              )}
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {metasProgressData.map((item) => (
                <div key={item.promotoraId} className="bg-[#1F1F22] p-4 rounded-xl border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {item.avatar ? (
                        <img src={item.avatar} alt={item.nomeCompleto} className="w-8 h-8 rounded-full object-cover border border-amber-500/30" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs border border-amber-500/30">
                          {item.nomeCompleto[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-xs text-white">{item.nomeCompleto}</div>
                        <div className="text-[10px] text-white/40">
                          Meta: {item.metaEstipulada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                      item.percentAtingido >= 100
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : item.percentAtingido >= 80
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-white/5 text-white/50 border-white/10'
                    }`}>
                      {item.percentAtingido >= 100 && <Trophy className="w-3 h-3 text-emerald-400" />}
                      {item.percentAtingido >= 80 && item.percentAtingido < 100 && <Zap className="w-3 h-3 text-amber-400" />}
                      {item.percentAtingido >= 100 
                        ? '100% Meta Batida!' 
                        : item.percentAtingido >= 80 
                        ? '⚡ 80%+ Reta Final' 
                        : 'Em Progresso'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium">
                      <span className="text-white/60">
                        Realizado: <strong className="text-amber-400">{item.vendasRealizadas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                      </span>
                      <span className="font-bold text-white">{item.percentAtingido}%</span>
                    </div>

                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.percentAtingido >= 100 
                            ? 'bg-emerald-400' 
                            : item.percentAtingido >= 70 
                            ? 'bg-amber-400' 
                            : 'bg-rose-400'
                        }`}
                        style={{ width: `${Math.min(item.percentAtingido, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* OUTRAS MÉTRICAS DO BI (AUDITORIAS, PEÇAS, FATURAMENTO POR LOJA)*/}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#161618] p-5 rounded-2xl border border-white/10 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Total de Auditorias</span>
            <h3 className="font-display font-bold text-2xl text-white">{totalVisitas}</h3>
            <p className="text-[10px] text-emerald-400 font-semibold">{concluidaVisitas} concluídas com sucesso</p>
          </div>
          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400 border border-amber-500/20">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#161618] p-5 rounded-2xl border border-white/10 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Peças Vendidas no PDV</span>
            <h3 className="font-display font-bold text-2xl text-white">{totalUnitsSold} un</h3>
            <p className="text-[10px] text-white/40">Total relatado no check-out</p>
          </div>
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/60 border border-white/10">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#161618] p-5 rounded-2xl border border-white/10 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Alertas de Vencimento</span>
            <h3 className="font-display font-bold text-2xl text-red-400">{expiryAlerts} itens</h3>
            <p className="text-[10px] text-red-400/80 font-medium">Produtos &lt; 6 meses vencimento</p>
          </div>
          <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-400 border border-red-500/20">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#161618] p-5 rounded-2xl border border-white/10 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Faturamento Médio</span>
            <h3 className="font-display font-bold text-2xl text-white">
              {(pedidos.reduce((sum, p) => sum + p.valor, 0) / (clientes.length || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> Faturamento saudável
            </p>
          </div>
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/60 border border-white/10">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Faturamento por Loja */}
        <div className="bg-[#161618] p-5 rounded-2xl border border-white/10 shadow-lg space-y-4">
          <div>
            <h4 className="font-display font-bold text-sm text-white">Faturamento Sincronizado Bling por Loja</h4>
            <p className="text-xs text-white/60">Mapeamento do volume de compras de cosméticos por ponto de venda</p>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={faturamentoData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255, 255, 255, 0.4)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255, 255, 255, 0.4)' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F1F22', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }} 
                  labelStyle={{ fontWeight: 'bold', color: '#fff' }}
                  formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Faturamento']}
                />
                <Bar dataKey="Valor" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparação de Preço Concorrência */}
        <div className="bg-[#161618] p-5 rounded-2xl border border-white/10 shadow-lg space-y-4">
          <div>
            <h4 className="font-display font-bold text-sm text-white">Auditoria de Preços: Safira/Amend vs Concorrência</h4>
            <p className="text-xs text-white/60">Relação de preços médios praticados nas prateleiras dos clientes (R$)</p>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pricesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255, 255, 255, 0.4)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255, 255, 255, 0.4)' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F1F22', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: any) => [`R$ ${value}`, '']}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.6)' }} />
                <Bar dataKey="Safira" name="Preço Sugerido Amend" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Concorrente" name="Média Marcas Concorrentes" fill="#4b5563" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Shelf Life Warnings and Stock Alerts */}
      <div className="bg-[#161618] p-6 rounded-2xl border border-white/10 shadow-lg space-y-4">
        <div>
          <h4 className="font-display font-bold text-sm text-white">Relatório Consolidado de Itens Próximos ao Vencimento</h4>
          <p className="text-xs text-white/60">Lista gerada a partir dos relatórios fotográficos e checklists de auditoria</p>
        </div>

        <div className="overflow-x-auto border border-white/10 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#1F1F22]/50 border-b border-white/10 text-white/60 font-bold">
                <th className="px-4 py-3">PDV / Cliente</th>
                <th className="px-4 py-3">Produto com Alerta</th>
                <th className="px-4 py-3">Quantidade em Gôndola</th>
                <th className="px-4 py-3">Data de Vencimento</th>
                <th className="px-4 py-3">Ação Sugerida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visitas
                .filter(v => v.produtosVencer && v.produtosVencer.length > 0)
                .flatMap(v => (v.produtosVencer || []).map((pv, idx) => ({
                  id: `${v.id}-${idx}`,
                  pdv: v.clienteNome,
                  produto: pv.produtoNome,
                  qtd: pv.qtd,
                  vencimento: pv.vencimento
                })))
                .map((row) => (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white/90">{row.pdv}</td>
                    <td className="px-4 py-3 font-medium text-white">{row.produto}</td>
                    <td className="px-4 py-3 font-mono text-white/70 font-bold">{row.qtd} un</td>
                    <td className="px-4 py-3 text-red-400 font-mono font-bold">
                      {new Date(row.vencimento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/20">
                        Montar Brinde Compre & Ganhe
                      </span>
                    </td>
                  </tr>
                ))}
              {visitas.filter(v => v.produtosVencer && v.produtosVencer.length > 0).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                    Nenhum produto próximo ao vencimento reportado nas auditorias.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL PARA CONFIGURAR METAS MENSAIS POR PROMOTORA             */}
      {/* ------------------------------------------------------------- */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#1C1C1F] border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl space-y-0">
            {/* Modal Header */}
            <div className="bg-[#161618] px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Configurar Metas de Vendas Mensais</h3>
                  <p className="text-xs text-white/50">Mês de Referência: <span className="text-amber-400 font-semibold">{selectedMesAno}</span></p>
                </div>
              </div>

              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <p className="text-xs text-white/70">
                Defina o valor alvo em R$ (faturamento de vendas) para cada promotora comercial no mês. Os dados serão atualizados no gráfico de progresso imediatamente.
              </p>

              <div className="space-y-3">
                {activePromotoras.map((prom) => (
                  <div key={prom.id} className="bg-[#161618] p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {prom.avatar ? (
                        <img src={prom.avatar} alt={prom.nome} className="w-9 h-9 rounded-full object-cover border border-amber-500/30" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs border border-amber-500/30">
                          {prom.nome[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-xs text-white">{prom.nome}</div>
                        <div className="text-[10px] text-white/40">{prom.codigoBling || 'PROM-00'} • {prom.role}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/50 font-bold">R$</span>
                      <input
                        type="number"
                        step="100"
                        value={formMetas[prom.id] || ''}
                        onChange={(e) => setFormMetas({ ...formMetas, [prom.id]: Number(e.target.value) })}
                        placeholder="Ex: 5000"
                        className="w-32 text-xs font-bold font-mono px-3 py-2 rounded-xl bg-[#1F1F22] border border-white/10 text-amber-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#161618] px-6 py-4 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConfig}
                className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-gray-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Salvar Metas
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
