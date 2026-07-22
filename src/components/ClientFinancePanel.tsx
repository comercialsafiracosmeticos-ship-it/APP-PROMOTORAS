import { useState } from 'react';
import { Search, MapPin, Phone, Landmark, DollarSign, ArrowUpRight, TrendingUp, Briefcase } from 'lucide-react';
import { Cliente, Pedido } from '../types';

interface ClientFinancePanelProps {
  clientes: Cliente[];
  pedidos: Pedido[];
}

export default function ClientFinancePanel({ clientes, pedidos }: ClientFinancePanelProps) {
  const [search, setSearch] = useState('');

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
        <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-sm text-white">Carteira de Clientes & faturamento</h3>
            <p className="text-xs text-white/60">Consulte o histórico comercial e hábitos de compras das lojas do ES</p>
          </div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
          {filteredClientes.map((c) => (
            <div key={c.id} className="bg-[#1F1F22]/30 border border-white/5 rounded-2xl p-4 space-y-3 hover:border-amber-500/40 hover:bg-[#1F1F22]/60 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-xs text-white leading-snug line-clamp-1">{c.nome}</h4>
                  <span className="shrink-0 text-[10px] bg-amber-500/10 text-amber-400 font-semibold px-2 py-0.5 rounded-md border border-amber-500/20">
                    PDV Ativo
                  </span>
                </div>
                
                <div className="space-y-1 text-[11px] text-white/60">
                  <p className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-white/40 shrink-0" />
                    <span className="line-clamp-1">{c.endereco}</span>
                  </p>
                  <p className="flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-white/40 shrink-0" />
                    <span>{c.telefone}</span>
                  </p>
                  <p className="text-[10px] text-white/40">CNPJ: {c.cnpj}</p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-3 mt-3 space-y-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Produtos Faturados (Bling)</span>
                <div className="flex flex-wrap gap-1">
                  {c.produtosComprados.map((p, idx) => (
                    <span key={idx} className="bg-white/5 text-white/75 text-[9px] px-1.5 py-0.5 rounded-md border border-white/10 font-sans">
                      {p}
                    </span>
                  ))}
                </div>
                
                <div className="flex justify-between items-center pt-2 mt-1">
                  <span className="text-[10px] text-white/40">Faturamento Total:</span>
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-0.5">
                    {c.faturamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    <ArrowUpRight className="w-3.5 h-3.5 text-white/40" />
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filteredClientes.length === 0 && (
            <div className="col-span-full py-8 text-center text-xs text-white/40 font-sans">
              Nenhum cliente comercial corresponde aos termos pesquisados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
