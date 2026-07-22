import React, { useState } from 'react';
import { Search, MapPin, Phone, Landmark, DollarSign, ArrowUpRight, TrendingUp, Briefcase, RefreshCw, Plus, Edit2, Trash2, X, Store, Check, UserCheck, AlertTriangle } from 'lucide-react';
import { Cliente, Pedido } from '../types';

interface ClientFinancePanelProps {
  clientes: Cliente[];
  pedidos: Pedido[];
  onSyncBling?: () => void;
  syncing?: boolean;
  onAddCliente?: (cliente: Omit<Cliente, 'id'>) => void;
  onUpdateCliente?: (cliente: Cliente) => void;
  onDeleteCliente?: (id: string) => void;
}

export default function ClientFinancePanel({ 
  clientes, 
  pedidos, 
  onSyncBling, 
  syncing,
  onAddCliente,
  onUpdateCliente,
  onDeleteCliente
}: ClientFinancePanelProps) {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [clientToDelete, setClientToDelete] = useState<{ id: string; name: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    cidade: 'Vitória - ES',
    endereco: '',
    telefone: '',
    contato: '',
    produtosComprados: 'Linha Amend Cosméticos, Linha Safira Profissional',
    faturamentoTotal: 0
  });

  const handleOpenAddModal = () => {
    setEditingCliente(null);
    setFormData({
      nome: '',
      cnpj: '',
      cidade: 'Vitória - ES',
      endereco: '',
      telefone: '',
      contato: '',
      produtosComprados: 'Linha Amend Cosméticos, Linha Safira Profissional',
      faturamentoTotal: 0
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome,
      cnpj: cliente.cnpj,
      cidade: cliente.cidade,
      endereco: cliente.endereco,
      telefone: cliente.telefone,
      contato: cliente.contato || '',
      produtosComprados: cliente.produtosComprados ? cliente.produtosComprados.join(', ') : '',
      faturamentoTotal: cliente.faturamentoTotal || 0
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) return;

    const produtosArray = formData.produtosComprados
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    if (editingCliente) {
      if (onUpdateCliente) {
        onUpdateCliente({
          ...editingCliente,
          nome: formData.nome,
          cnpj: formData.cnpj || 'N/A',
          cidade: formData.cidade,
          endereco: formData.endereco,
          telefone: formData.telefone,
          contato: formData.contato,
          produtosComprados: produtosArray,
          faturamentoTotal: Number(formData.faturamentoTotal) || 0
        });
      }
    } else {
      if (onAddCliente) {
        onAddCliente({
          nome: formData.nome,
          cnpj: formData.cnpj || 'N/A',
          cidade: formData.cidade,
          endereco: formData.endereco,
          telefone: formData.telefone,
          contato: formData.contato,
          produtosComprados: produtosArray,
          faturamentoTotal: Number(formData.faturamentoTotal) || 0
        });
      }
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    setClientToDelete({ id, name });
  };

  const confirmDeleteClient = () => {
    if (clientToDelete && onDeleteCliente) {
      onDeleteCliente(clientToDelete.id);
    }
    setClientToDelete(null);
  };

  const filteredClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase()) || 
    c.cidade.toLowerCase().includes(search.toLowerCase()) ||
    c.cnpj.includes(search)
  );

  const totalBilling = pedidos
    .filter(p => p.status === 'Faturado' || p.status === 'Atendido')
    .reduce((sum, p) => sum + p.valor, 0);

  const averageTicket = totalBilling / (pedidos.length || 1);

  return (
    <div className="space-y-6" id="client-finance-section">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#161618] p-5 rounded-2xl border border-white/10 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Faturamento Sincronizado</span>
            <h3 className="font-display font-bold text-2xl text-white">
              {totalBilling.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +12% em relação ao mês anterior
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 border border-amber-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#161618] p-5 rounded-2xl border border-white/10 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Ticket Médio de Pedidos</span>
            <h3 className="font-display font-bold text-2xl text-white">
              {averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <p className="text-[10px] text-white/40 font-sans">Média ponderada por PDV ativo</p>
          </div>
          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/60 border border-white/10">
            <Landmark className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#161618] p-5 rounded-2xl border border-white/10 shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">PDVs Atendidos</span>
            <h3 className="font-display font-bold text-2xl text-white">{clientes.length} Lojas</h3>
            <p className="text-[10px] text-white/40 font-sans">Cadastrados e roteirizados no Espírito Santo</p>
          </div>
          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/60 border border-white/10">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabela e Filtros */}
      <div className="bg-[#161618] rounded-2xl border border-white/10 shadow-lg overflow-hidden">
        <div className="p-5 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-sm text-white">Carteira de Clientes & faturamento</h3>
            <p className="text-xs text-white/60">Consulte, cadastre e edite as lojas e PDVs vinculados às promotoras</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/10 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Novo Cliente / PDV
            </button>

            {onSyncBling && (
              <button
                type="button"
                onClick={onSyncBling}
                disabled={syncing}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-gray-950 font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-500/10 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando Bling...' : 'Sincronizar Bling ERP'}
              </button>
            )}

            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar cliente, CNPJ ou cidade..."
                className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-amber-500 focus:ring-1.5 focus:ring-amber-500/20"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
          {filteredClientes.map((c) => (
            <div key={c.id} className="bg-[#1F1F22]/30 border border-white/5 rounded-2xl p-4 space-y-3 hover:border-amber-500/40 hover:bg-[#1F1F22]/60 transition-all flex flex-col justify-between group">
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-xs text-white leading-snug line-clamp-1">{c.nome}</h4>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(c)}
                      title="Editar cliente"
                      className="p-1 rounded-lg text-white/40 hover:text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id, c.nome)}
                      title="Excluir cliente"
                      className="p-1 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1 text-[11px] text-white/60">
                  <p className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-white/40 shrink-0" />
                    <span className="line-clamp-1">{c.endereco || 'Endereço não informado'}</span>
                  </p>
                  <p className="flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-white/40 shrink-0" />
                    <span>{c.telefone || 'Telefone não informado'}</span>
                  </p>
                  <p className="flex items-center gap-1 text-amber-300 font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg text-[10.5px]">
                    <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="line-clamp-1">Contato: {c.contato || 'Não informado (procure o Gerente)'}</span>
                  </p>
                  <div className="flex justify-between items-center text-[10px] text-white/40 pt-1">
                    <span>CNPJ: {c.cnpj}</span>
                    <span className="bg-amber-500/10 text-amber-400 font-semibold px-2 py-0.5 rounded-md border border-amber-500/20">
                      {c.cidade}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-3 mt-3 space-y-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Produtos Faturados</span>
                <div className="flex flex-wrap gap-1">
                  {c.produtosComprados && c.produtosComprados.length > 0 ? (
                    c.produtosComprados.map((p, idx) => (
                      <span key={idx} className="bg-white/5 text-white/75 text-[9px] px-1.5 py-0.5 rounded-md border border-white/10 font-sans">
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-white/30 italic">Nenhum produto associado</span>
                  )}
                </div>
                
                <div className="flex justify-between items-center pt-2 mt-1">
                  <span className="text-[10px] text-white/40">Faturamento Total:</span>
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-0.5">
                    {(c.faturamentoTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    <ArrowUpRight className="w-3.5 h-3.5 text-white/40" />
                  </span>
                </div>
              </div>
            </div>
          ))}

          {filteredClientes.length === 0 && (
            <div className="col-span-full py-12 text-center text-xs text-white/40 font-sans space-y-3">
              <Store className="w-8 h-8 text-white/20 mx-auto" />
              <p>Nenhum cliente comercial corresponde aos termos pesquisados.</p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 text-amber-400 hover:underline font-bold text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar primeiro cliente agora
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CADASTRAR / EDITAR CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161618] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    {editingCliente ? 'Editar Cliente / PDV' : 'Cadastrar Novo Cliente / PDV'}
                  </h3>
                  <p className="text-xs text-white/60">
                    {editingCliente ? 'Atualize as informações comerciais da loja' : 'Preencha os dados do ponto de venda para vincular às promotoras'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Nome da Loja / Razão Social *</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: FarmaVida - Centro ou Drogaria Safira"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="12.345.678/0001-90"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Cidade - Estado *</label>
                  <input
                    type="text"
                    required
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="Ex: Vitória - ES, Serra - ES"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Ex: Av. Jerônimo Monteiro, 450 - Centro"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(27) 99999-0000"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Faturamento Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.faturamentoTotal}
                    onChange={(e) => setFormData({ ...formData, faturamentoTotal: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  Pessoa de Contato no PDV (Gerente / Encarregado)
                </label>
                <input
                  type="text"
                  value={formData.contato}
                  onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                  placeholder="Ex: Carlos Santos (Gerente de Compras) ou Maria (Supervisora)"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Produtos Faturados (Separados por vírgula)</label>
                <input
                  type="text"
                  value={formData.produtosComprados}
                  onChange={(e) => setFormData({ ...formData, produtosComprados: e.target.value })}
                  placeholder="Ex: Linha Amend Cosméticos, Kit Specialist Blonde"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/70 hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Check className="w-4 h-4" />
                  {editingCliente ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CLIENTE / PDV */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161618] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-white">Confirmar Exclusão de PDV</h3>
                <p className="text-[11px] text-white/50">Ação irreversível no cadastro comercial</p>
              </div>
            </div>

            <p className="text-xs text-white/80 leading-relaxed">
              Tem certeza que deseja excluir permanentemente o cliente/PDV <strong className="text-amber-400 font-bold">"{clientToDelete.name}"</strong>?
            </p>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteClient}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-rose-600/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sim, Excluir PDV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
