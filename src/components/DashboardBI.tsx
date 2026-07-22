import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Cliente, Visita, Produto, Pedido } from '../types';
import { Calendar, ShoppingBag, AlertOctagon, TrendingUp, DollarSign } from 'lucide-react';

interface DashboardBIProps {
  clientes: Cliente[];
  visitas: Visita[];
  produtos: Produto[];
  pedidos: Pedido[];
}

export default function DashboardBI({ clientes, visitas, produtos, pedidos }: DashboardBIProps) {
  // 1. Chart Data: Faturamento por Cliente
  const faturamentoData = clientes.map(c => ({
    name: c.nome.split('-')[0].trim(),
    Valor: c.faturamentoTotal
  }));

  // 2. Competitor Pricing comparison
  // Gather from visits competitor pricing
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
  
  // Expiry alerts
  const expiryAlerts = visitas.reduce((sum, v) => sum + (v.produtosVencer?.length || 0), 0);

  return (
    <div className="space-y-6" id="bi-dashboard-section">
      {/* KPI Cards */}
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
    </div>
  );
}
