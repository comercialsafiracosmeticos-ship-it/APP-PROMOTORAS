import React, { useState } from 'react';
import { 
  ShoppingBag, Search, RefreshCw, ChevronDown, ChevronUp, FileText, 
  DollarSign, PackageCheck, Store, Calendar, ArrowUpRight, Plus, 
  CheckCircle2, Clock, AlertCircle, Eye, Printer, X, Tag, User, CreditCard,
  Edit2, Trash2, AlertTriangle
} from 'lucide-react';
import { Pedido, Cliente, Produto, PedidoItem } from '../types';

interface SalesOrdersPanelProps {
  pedidos: Pedido[];
  clientes: Cliente[];
  produtos: Produto[];
  ultimoSincronismo?: string;
  onSyncBling?: () => void;
  syncing?: boolean;
  onClearTestData?: () => void;
  onAddPedido?: (p: Omit<Pedido, 'id'>) => void;
  onUpdatePedido?: (p: Pedido) => void;
  onDeletePedido?: (id: string) => void;
}

export default function SalesOrdersPanel({
  pedidos,
  clientes,
  produtos,
  ultimoSincronismo,
  onSyncBling,
  syncing,
  onClearTestData,
  onAddPedido,
  onUpdatePedido,
  onDeletePedido
}: SalesOrdersPanelProps) {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [expandedPedidoId, setExpandedPedidoId] = useState<string | null>(pedidos[0]?.id || null);
  const [espelhoPedido, setEspelhoPedido] = useState<Pedido | null>(null);

  // States para Edição e Exclusão de Pedido
  const [orderToEdit, setOrderToEdit] = useState<Pedido | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Pedido | null>(null);

  // Modal para Novo Pedido de Vendas
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    numero: String(Math.floor(Math.random() * 800) + 10460),
    clienteId: clientes[0]?.id || '',
    clienteNome: clientes[0]?.nome || '',
    data: new Date().toISOString().split('T')[0],
    vendedor: 'Jaqueline Vechi (Promotora)',
    condicaoPagamento: '28 Dias - Boleto Bancário',
    observacoes: 'Pedido de venda emitido e integrado via Portal Safira Cosméticos',
    status: 'Faturado' as 'Atendido' | 'Faturado' | 'Pendente' | 'Cancelado',
    itens: [
      { sku: '103-1', produtoNome: 'Reparador De Pontas Amend 60Mi', qtd: 20, preco: 43.89 },
      { sku: '603-1', produtoNome: 'Mascara Brilho Com Vitamina E Amend 500G', qtd: 10, preco: 31.15 }
    ]
  });

  const toggleExpand = (id: string) => {
    setExpandedPedidoId(expandedPedidoId === id ? null : id);
  };

  // Metric calculations
  const totalFaturado = pedidos
    .filter(p => p.status === 'Faturado' || p.status === 'Atendido')
    .reduce((sum, p) => sum + p.valor, 0);

  const totalPecas = pedidos.reduce((sumP, p) => {
    const sumItens = p.itens?.reduce((sumI, i) => sumI + (i.qtd || 0), 0) || 0;
    return sumP + sumItens;
  }, 0);

  const totalPedidosFaturados = pedidos.filter(p => p.status === 'Faturado' || p.status === 'Atendido').length;

  // Filter logic
  const filteredPedidos = pedidos.filter((p) => {
    const matchesSearch = 
      p.numero.toLowerCase().includes(search.toLowerCase()) ||
      p.clienteNome.toLowerCase().includes(search.toLowerCase()) ||
      p.itens.some(i => i.produtoNome.toLowerCase().includes(search.toLowerCase()) || (i.sku && i.sku.toLowerCase().includes(search.toLowerCase())));
    
    const matchesStatus = selectedStatus === 'TODOS' || p.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // Calculate order total from items mathematically
  const calculateOrderTotal = (itens: PedidoItem[]) => {
    return itens.reduce((sum, item) => sum + (item.qtd * item.preco), 0);
  };

  // Add Item to new order form
  const handleAddItemToNewOrder = () => {
    const defaultProd = produtos[0] || { nome: 'Produto Amend', sku: 'SKU-01', precoSugerido: 35.00 };
    setNewOrder(prev => ({
      ...prev,
      itens: [
        ...prev.itens,
        {
          sku: defaultProd.sku || 'SKU-AMEND',
          produtoNome: defaultProd.nome,
          qtd: 10,
          preco: defaultProd.precoSugerido || 30.00
        }
      ]
    }));
  };

  const handleRemoveItemFromNewOrder = (index: number) => {
    setNewOrder(prev => ({
      ...prev,
      itens: prev.itens.filter((_, idx) => idx !== index)
    }));
  };

  const handleCreateNewOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddPedido) return;

    const calculatedValor = calculateOrderTotal(newOrder.itens);
    const selectedCli = clientes.find(c => c.id === newOrder.clienteId);

    onAddPedido({
      numero: newOrder.numero,
      clienteId: newOrder.clienteId || 'cli-01',
      clienteNome: selectedCli?.nome || newOrder.clienteNome || 'Cliente Safira',
      data: newOrder.data,
      valor: calculatedValor,
      status: newOrder.status,
      vendedor: newOrder.vendedor,
      condicaoPagamento: newOrder.condicaoPagamento,
      observacoes: newOrder.observacoes,
      itens: newOrder.itens
    });

    setIsNewOrderModalOpen(false);
  };

  // Add/Remove Item for Editing Order
  const handleAddItemToEditOrder = () => {
    if (!orderToEdit) return;
    const defaultProd = produtos[0] || { nome: 'Produto Amend', sku: 'SKU-01', precoSugerido: 35.00 };
    setOrderToEdit({
      ...orderToEdit,
      itens: [
        ...(orderToEdit.itens || []),
        {
          sku: defaultProd.sku || 'SKU-AMEND',
          produtoNome: defaultProd.nome,
          qtd: 10,
          preco: defaultProd.precoSugerido || 30.00
        }
      ]
    });
  };

  const handleRemoveItemFromEditOrder = (index: number) => {
    if (!orderToEdit) return;
    setOrderToEdit({
      ...orderToEdit,
      itens: (orderToEdit.itens || []).filter((_, idx) => idx !== index)
    });
  };

  const handleSaveEditOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToEdit || !onUpdatePedido) return;

    const recalculatedValor = calculateOrderTotal(orderToEdit.itens || []);
    onUpdatePedido({
      ...orderToEdit,
      valor: recalculatedValor
    });

    setOrderToEdit(null);
  };

  const handleConfirmDeleteOrder = () => {
    if (!orderToDelete || !onDeletePedido) return;
    onDeletePedido(orderToDelete.id);
    setOrderToDelete(null);
  };

  return (
    <div className="space-y-6" id="pedidos-vendas-section">
      {/* HEADER BAR & SYNC ACTION */}
      <div className="bg-[#161618] border border-white/10 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white">Pedidos de Vendas Integrados com Bling ERP</h2>
              <p className="text-xs text-white/60">
                Sincronização fidedigna dos números de pedidos, valores totais, quantidades de peças e itens detalhados produto a produto.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {onSyncBling && (
            <button
              type="button"
              onClick={onSyncBling}
              disabled={syncing}
              className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-gray-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/15"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando com Bling...' : 'Sincronizar Pedidos com Bling ERP'}
            </button>
          )}

          {onClearTestData && (
            <button
              type="button"
              onClick={onClearTestData}
              className="w-full md:w-auto bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold px-3 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              title="Zerar simulações, métricas e pedidos de teste para iniciar produção"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Zerar Simulações (Produção)
            </button>
          )}

          {onAddPedido && (
            <button
              type="button"
              onClick={() => setIsNewOrderModalOpen(true)}
              className="w-full md:w-auto bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              Lançar Pedido Manual
            </button>
          )}
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#161618] p-5 rounded-2xl border border-white/10 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Faturamento Sincronizado</span>
            <h3 className="font-display font-bold text-2xl text-amber-400">
              {totalFaturado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <p className="text-[10px] text-emerald-400 font-medium">Bling ERP Oficial</p>
          </div>
          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 border border-amber-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#161618] p-5 rounded-2xl border border-white/10 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Pedidos Faturados</span>
            <h3 className="font-display font-bold text-2xl text-white">{totalPedidosFaturados} Ordens</h3>
            <p className="text-[10px] text-white/50">Com status Faturado/Atendido</p>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#161618] p-5 rounded-2xl border border-white/10 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Total de Peças/Produtos</span>
            <h3 className="font-display font-bold text-2xl text-white">{totalPecas} Unidades</h3>
            <p className="text-[10px] text-white/50">Somatório de itens das notas</p>
          </div>
          <div className="w-12 h-12 bg-sky-500/10 rounded-2xl flex items-center justify-center text-sky-400 border border-sky-500/20">
            <Tag className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#161618] p-5 rounded-2xl border border-white/10 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Último Sincronismo Bling</span>
            <p className="font-mono font-bold text-xs text-white pt-1">
              {ultimoSincronismo 
                ? new Date(ultimoSincronismo).toLocaleString('pt-BR') 
                : 'Recente / Conectado'}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              API v3 Ativa
            </span>
          </div>
          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/60 border border-white/10">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH ROW */}
      <div className="bg-[#161618] p-4 rounded-2xl border border-white/10 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nº do pedido Bling (#10458), cliente ou produto..."
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-white/40 uppercase tracking-wider shrink-0 mr-1">Status:</span>
          {['TODOS', 'Faturado', 'Atendido', 'Pendente', 'Cancelado'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedStatus === st 
                  ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/20' 
                  : 'bg-[#1F1F22] text-white/60 hover:text-white border border-white/5'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ORDERS LIST / TABLE WITH DETAILED ITEMS */}
      <div className="space-y-4">
        {filteredPedidos.map((ped) => {
          const isExpanded = expandedPedidoId === ped.id;
          const totalUnidades = ped.itens?.reduce((sum, item) => sum + (item.qtd || 0), 0) || 0;

          return (
            <div 
              key={ped.id}
              className={`bg-[#161618] border rounded-2xl overflow-hidden transition-all shadow-xl ${
                isExpanded ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-white/10 hover:border-white/20'
              }`}
            >
              {/* Order Header Summary Row */}
              <div 
                onClick={() => toggleExpand(ped.id)}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer bg-[#1F1F22]/40 hover:bg-[#1F1F22]/80 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col items-center justify-center text-amber-400 shrink-0">
                    <span className="text-[9px] uppercase font-bold text-amber-500/70">Bling</span>
                    <span className="font-mono font-bold text-xs">#{ped.numero}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">{ped.clienteNome}</h3>
                      <span className="text-[10px] bg-white/5 border border-white/10 text-white/60 px-2 py-0.5 rounded font-mono">
                        {ped.itens?.length || 0} produto(s) • {totalUnidades} un.
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/50">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-white/40" />
                        {new Date(ped.data).toLocaleDateString('pt-BR')}
                      </span>
                      {ped.vendedor && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-white/40">
                          <User className="w-3.5 h-3.5 text-white/30" />
                          {ped.vendedor}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-white/5">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-white/40 uppercase block font-bold">Valor Total Faturado</span>
                    <span className="font-display font-bold text-lg text-amber-400">
                      {ped.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                      ped.status === 'Faturado' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                      ped.status === 'Atendido' ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' :
                      ped.status === 'Pendente' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                      'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {ped.status}
                    </span>

                    {/* ACTION BUTTONS: ESPELHO, EDITAR, EXCLUIR */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEspelhoPedido(ped);
                      }}
                      title="Ver Espelho Completo do Pedido"
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-all cursor-pointer border border-white/10"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {onUpdatePedido && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrderToEdit({ 
                            ...ped, 
                            itens: ped.itens ? ped.itens.map(i => ({ ...i })) : [] 
                          });
                        }}
                        title="Editar Pedido"
                        className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl transition-all cursor-pointer border border-amber-500/20"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}

                    {onDeletePedido && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrderToDelete(ped);
                        }}
                        title="Excluir Pedido"
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all cursor-pointer border border-rose-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="text-white/40 p-1">
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-amber-400" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* EXPANDABLE ITEM-BY-ITEM DETAILS TABLE */}
              {isExpanded && (
                <div className="border-t border-white/10 p-5 bg-[#161618] space-y-4 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-[#1F1F22] p-3 rounded-xl border border-white/5 text-xs text-white/70">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1 text-white/50">
                        <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                        Condição: <strong className="text-white">{ped.condicaoPagamento || 'Boleto Bancário Bling'}</strong>
                      </span>
                      {ped.observacoes && (
                        <span className="text-white/50 italic line-clamp-1">
                          "{ped.observacoes}"
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-amber-400/90 font-mono font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      Integração Sincronizada Bling v3
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-amber-400" />
                      Itens Detalhados do Pedido Bling (#{ped.numero})
                    </h4>

                    <div className="overflow-x-auto rounded-xl border border-white/10">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#1F1F22] border-b border-white/10 text-white/50 uppercase font-bold text-[10px] tracking-wider">
                            <th className="px-4 py-3"># SKU / Código</th>
                            <th className="px-4 py-3">Descrição do Produto</th>
                            <th className="px-4 py-3 text-center">Quantidade (Qtd)</th>
                            <th className="px-4 py-3 text-right">Preço Unitário (R$)</th>
                            <th className="px-4 py-3 text-right">Subtotal (R$)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {ped.itens?.map((item, idx) => {
                            const subtotal = item.qtd * item.preco;
                            return (
                              <tr key={idx} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3 font-mono text-amber-400 font-bold">
                                  {item.sku || `SKU-${idx + 101}`}
                                </td>
                                <td className="px-4 py-3 font-semibold text-white">
                                  {item.produtoNome}
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-white">
                                  <span className="bg-amber-500/10 text-amber-300 px-2.5 py-1 rounded-lg font-mono border border-amber-500/20">
                                    {item.qtd} un
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-white/70">
                                  {item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-emerald-400">
                                  {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[#1F1F22] border-t border-white/10 font-bold text-xs text-white">
                            <td colSpan={2} className="px-4 py-3 text-white/60">
                              Somatório Total dos Itens ({ped.itens?.length || 0} produtos diferentes)
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-amber-400">
                              {totalUnidades} Peças
                            </td>
                            <td className="px-4 py-3 text-right text-white/40">Total Faturado:</td>
                            <td className="px-4 py-3 text-right font-display text-sm text-amber-400">
                              {ped.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredPedidos.length === 0 && (
          <div className="bg-[#161618] border border-white/10 rounded-2xl p-12 text-center text-xs text-white/40 space-y-3">
            <ShoppingBag className="w-10 h-10 text-white/20 mx-auto" />
            <p>Nenhum pedido de venda encontrado para a busca especificada.</p>
          </div>
        )}
      </div>

      {/* MODAL ESPELHO COMERCIAL DO PEDIDO BLING */}
      {espelhoPedido && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161618] border border-amber-500/30 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-base text-white">
                      Espelho de Pedido de Venda #{espelhoPedido.numero}
                    </h3>
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30 font-mono">
                      Bling ERP
                    </span>
                  </div>
                  <p className="text-xs text-white/60">Safira Cosméticos • Faturamento Comercial Integrado</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEspelhoPedido(null)}
                className="text-white/40 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dados do Cliente e Pedido */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#1F1F22] p-4 rounded-xl border border-white/5">
              <div>
                <span className="text-[10px] text-white/40 uppercase font-bold block">Destinatário / Cliente</span>
                <strong className="text-white font-bold text-sm">{espelhoPedido.clienteNome}</strong>
              </div>
              <div>
                <span className="text-[10px] text-white/40 uppercase font-bold block">Data de Emissão</span>
                <span className="text-white font-medium">{new Date(espelhoPedido.data).toLocaleDateString('pt-BR')}</span>
              </div>
              <div>
                <span className="text-[10px] text-white/40 uppercase font-bold block">Vendedor / Promotora</span>
                <span className="text-amber-300 font-medium">{espelhoPedido.vendedor || 'Atendimento Comercial'}</span>
              </div>
              <div>
                <span className="text-[10px] text-white/40 uppercase font-bold block">Condição de Pagamento</span>
                <span className="text-white font-medium">{espelhoPedido.condicaoPagamento || 'Boleto Bancário'}</span>
              </div>
            </div>

            {/* Itens do Pedido */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Itens Integrados (Produto por Produto)</h4>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#1F1F22] text-white/50 uppercase text-[10px] font-bold border-b border-white/10">
                      <th className="p-3">SKU</th>
                      <th className="p-3">Produto</th>
                      <th className="p-3 text-center">Qtd</th>
                      <th className="p-3 text-right">Unitário</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white">
                    {espelhoPedido.itens?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-mono text-amber-400 font-bold">{item.sku || 'SKU-01'}</td>
                        <td className="p-3">{item.produtoNome}</td>
                        <td className="p-3 text-center font-bold">{item.qtd}</td>
                        <td className="p-3 text-right text-white/70">{item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">{(item.qtd * item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
              <span className="text-xs text-amber-300 font-bold">Valor Total Faturado:</span>
              <span className="font-display font-extrabold text-xl text-amber-400">
                {espelhoPedido.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEspelhoPedido(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PEDIDO DE VENDA */}
      {orderToEdit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161618] border border-amber-500/30 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">Editar Pedido de Venda #{orderToEdit.numero}</h3>
                  <p className="text-xs text-white/60">Atualize dados cadastrais, itens e valores do pedido</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrderToEdit(null)}
                className="text-white/40 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditOrder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Número do Pedido Bling *</label>
                  <input
                    type="text"
                    required
                    value={orderToEdit.numero}
                    onChange={(e) => setOrderToEdit({ ...orderToEdit, numero: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Cliente / PDV Destinatário *</label>
                  <select
                    value={orderToEdit.clienteId}
                    onChange={(e) => {
                      const cli = clientes.find(c => c.id === e.target.value);
                      setOrderToEdit({ 
                        ...orderToEdit, 
                        clienteId: e.target.value, 
                        clienteNome: cli?.nome || orderToEdit.clienteNome 
                      });
                    }}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white"
                  >
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nome} ({c.cidade})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Data do Pedido</label>
                  <input
                    type="date"
                    value={orderToEdit.data.split('T')[0]}
                    onChange={(e) => setOrderToEdit({ ...orderToEdit, data: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Status do Pedido</label>
                  <select
                    value={orderToEdit.status}
                    onChange={(e) => setOrderToEdit({ 
                      ...orderToEdit, 
                      status: e.target.value as 'Atendido' | 'Faturado' | 'Pendente' | 'Cancelado'
                    })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white"
                  >
                    <option value="Faturado">Faturado</option>
                    <option value="Atendido">Atendido</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Vendedor / Promotora</label>
                  <input
                    type="text"
                    value={orderToEdit.vendedor || ''}
                    onChange={(e) => setOrderToEdit({ ...orderToEdit, vendedor: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Condição de Pagamento</label>
                <input
                  type="text"
                  value={orderToEdit.condicaoPagamento || ''}
                  onChange={(e) => setOrderToEdit({ ...orderToEdit, condicaoPagamento: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white"
                />
              </div>

              {/* Seção de Itens do Pedido no Modal de Edição */}
              <div className="space-y-2 border-t border-white/10 pt-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Itens do Pedido (Produto por Produto)</h4>
                  <button
                    type="button"
                    onClick={handleAddItemToEditOrder}
                    className="text-xs text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    + Adicionar Produto
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(orderToEdit.itens || []).map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 bg-[#1F1F22] p-2.5 rounded-xl border border-white/5 items-center text-xs">
                      <div className="col-span-3 sm:col-span-2">
                        <input
                          type="text"
                          placeholder="SKU"
                          value={item.sku}
                          onChange={(e) => {
                            const newItens = [...(orderToEdit.itens || [])];
                            newItens[idx].sku = e.target.value;
                            setOrderToEdit({ ...orderToEdit, itens: newItens });
                          }}
                          className="w-full bg-[#161618] border border-white/10 px-2 py-1.5 rounded text-[11px] text-amber-400 font-mono font-bold"
                        />
                      </div>
                      <div className="col-span-9 sm:col-span-4">
                        <input
                          type="text"
                          placeholder="Nome do produto"
                          value={item.produtoNome}
                          onChange={(e) => {
                            const newItens = [...(orderToEdit.itens || [])];
                            newItens[idx].produtoNome = e.target.value;
                            setOrderToEdit({ ...orderToEdit, itens: newItens });
                          }}
                          className="w-full bg-[#161618] border border-white/10 px-2 py-1.5 rounded text-[11px] text-white"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <input
                          type="number"
                          placeholder="Qtd"
                          value={item.qtd}
                          onChange={(e) => {
                            const newItens = [...(orderToEdit.itens || [])];
                            newItens[idx].qtd = Number(e.target.value) || 0;
                            setOrderToEdit({ ...orderToEdit, itens: newItens });
                          }}
                          className="w-full bg-[#161618] border border-white/10 px-2 py-1.5 rounded text-[11px] text-white font-bold text-center"
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Preço (R$)"
                          value={item.preco}
                          onChange={(e) => {
                            const newItens = [...(orderToEdit.itens || [])];
                            newItens[idx].preco = Number(e.target.value) || 0;
                            setOrderToEdit({ ...orderToEdit, itens: newItens });
                          }}
                          className="w-full bg-[#161618] border border-white/10 px-2 py-1.5 rounded text-[11px] text-emerald-400 font-bold"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemFromEditOrder(idx)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs text-white">
                  <span className="font-bold">Valor Total Recalculado:</span>
                  <span className="font-display font-bold text-sm text-amber-400">
                    {calculateOrderTotal(orderToEdit.itens || []).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setOrderToEdit(null)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-amber-500/15"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR PEDIDO (CONFIRMAÇÃO) */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161618] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-white">Excluir Pedido de Venda?</h3>
                <p className="text-xs text-white/60">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>

            <div className="bg-[#1F1F22] p-4 rounded-xl border border-white/5 text-xs text-white/80 space-y-1.5">
              <p>
                Você está prestes a remover o pedido <strong className="text-amber-400">#{orderToDelete.numero}</strong>.
              </p>
              <p className="text-white/60">
                Cliente: <strong className="text-white">{orderToDelete.clienteNome}</strong>
              </p>
              <p className="text-white/60">
                Valor Total: <strong className="text-emerald-400">{orderToDelete.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrder}
                className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-rose-500/20"
              >
                Sim, Excluir Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LANÇAMENTO DE NOVO PEDIDO MANUAL */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161618] border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">Novo Pedido de Venda Comercial</h3>
                  <p className="text-xs text-white/60">Cadastre e integre um pedido com itens detalhados produto a produto</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewOrder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Número do Pedido Bling *</label>
                  <input
                    type="text"
                    required
                    value={newOrder.numero}
                    onChange={(e) => setNewOrder({ ...newOrder, numero: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Cliente / PDV Destinatário *</label>
                  <select
                    value={newOrder.clienteId}
                    onChange={(e) => {
                      const cli = clientes.find(c => c.id === e.target.value);
                      setNewOrder({ ...newOrder, clienteId: e.target.value, clienteNome: cli?.nome || '' });
                    }}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white"
                  >
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nome} ({c.cidade})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Data do Pedido</label>
                  <input
                    type="date"
                    value={newOrder.data}
                    onChange={(e) => setNewOrder({ ...newOrder, data: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Condição de Pagamento</label>
                  <input
                    type="text"
                    value={newOrder.condicaoPagamento}
                    onChange={(e) => setNewOrder({ ...newOrder, condicaoPagamento: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white"
                  />
                </div>
              </div>

              {/* Seção de Itens do Pedido */}
              <div className="space-y-2 border-t border-white/10 pt-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Itens do Pedido (Produto por Produto)</h4>
                  <button
                    type="button"
                    onClick={handleAddItemToNewOrder}
                    className="text-xs text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    + Adicionar Produto
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {newOrder.itens.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 bg-[#1F1F22] p-2.5 rounded-xl border border-white/5 items-center text-xs">
                      <div className="col-span-3 sm:col-span-2">
                        <input
                          type="text"
                          placeholder="SKU"
                          value={item.sku}
                          onChange={(e) => {
                            const newItens = [...newOrder.itens];
                            newItens[idx].sku = e.target.value;
                            setNewOrder({ ...newOrder, itens: newItens });
                          }}
                          className="w-full bg-[#161618] border border-white/10 px-2 py-1.5 rounded text-[11px] text-amber-400 font-mono font-bold"
                        />
                      </div>
                      <div className="col-span-9 sm:col-span-4">
                        <input
                          type="text"
                          placeholder="Nome do produto"
                          value={item.produtoNome}
                          onChange={(e) => {
                            const newItens = [...newOrder.itens];
                            newItens[idx].produtoNome = e.target.value;
                            setNewOrder({ ...newOrder, itens: newItens });
                          }}
                          className="w-full bg-[#161618] border border-white/10 px-2 py-1.5 rounded text-[11px] text-white"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <input
                          type="number"
                          placeholder="Qtd"
                          value={item.qtd}
                          onChange={(e) => {
                            const newItens = [...newOrder.itens];
                            newItens[idx].qtd = Number(e.target.value) || 0;
                            setNewOrder({ ...newOrder, itens: newItens });
                          }}
                          className="w-full bg-[#161618] border border-white/10 px-2 py-1.5 rounded text-[11px] text-white font-bold text-center"
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Preço (R$)"
                          value={item.preco}
                          onChange={(e) => {
                            const newItens = [...newOrder.itens];
                            newItens[idx].preco = Number(e.target.value) || 0;
                            setNewOrder({ ...newOrder, itens: newItens });
                          }}
                          className="w-full bg-[#161618] border border-white/10 px-2 py-1.5 rounded text-[11px] text-emerald-400 font-bold"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemFromNewOrder(idx)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs text-white">
                  <span className="font-bold">Valor Total Recalculado:</span>
                  <span className="font-display font-bold text-sm text-amber-400">
                    {calculateOrderTotal(newOrder.itens).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewOrder}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-emerald-500/10"
                >
                  Salvar Pedido de Venda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
