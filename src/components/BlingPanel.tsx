import { useState } from 'react';
import { 
  Settings, RefreshCw, CheckCircle, AlertTriangle, Link2, 
  Database, Wifi, Key, FileText, ShoppingBag, Users, Check
} from 'lucide-react';
import { BlingConfig, Cliente, Pedido, Produto } from '../types';

interface BlingPanelProps {
  config: BlingConfig;
  clientes: Cliente[];
  pedidos: Pedido[];
  produtos: Produto[];
  onSaveConfig: (updated: Partial<BlingConfig>) => void;
  onTriggerSync: () => Promise<void>;
  syncing: boolean;
}

export default function BlingPanel({
  config,
  clientes,
  pedidos,
  produtos,
  onSaveConfig,
  onTriggerSync,
  syncing
}: BlingPanelProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'clientes' | 'pedidos' | 'produtos'>('status');
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [clientId, setClientId] = useState(config.clientId);
  const [clientSecret, setClientSecret] = useState(config.clientSecret);
  const [aliasServidor, setAliasServidor] = useState(config.aliasServidor);
  const [webhookAtivo, setWebhookAtivo] = useState(config.webhookAtivo);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    onSaveConfig({
      apiKey,
      clientId,
      clientSecret,
      aliasServidor,
      webhookAtivo
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const formattedDate = (isoString?: string) => {
    if (!isoString) return 'Nunca';
    const d = new Date(isoString);
    return d.toLocaleString('pt-BR');
  };

  return (
    <div className="bg-[#161618] rounded-2xl border border-white/10 shadow-lg overflow-hidden" id="bling-integration-card">
      {/* Banner de Status */}
      <div className="bg-[#1C1C1F] px-6 py-5 border-b border-white/10 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 rounded-xl shadow-md shadow-amber-500/20">
            <Link2 className="w-5 h-5 text-gray-950" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base tracking-tight text-white">Painel de Integração Bling v3</h2>
            <p className="text-xs text-white/60">Sincronização em tempo real de faturamento, estoque e carteira de clientes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1F1F22] border border-white/10 rounded-xl text-xs">
            <span className="text-white/40 font-sans">Status:</span>
            <span className={`flex items-center gap-1 font-semibold ${
              config.statusConexao === 'Conectado' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                config.statusConexao === 'Conectado' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`} />
              {config.statusConexao}
            </span>
          </div>

          <button
            onClick={onTriggerSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-[#1F1F22] disabled:text-white/40 text-gray-950 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm shadow-amber-500/10 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
          </button>
        </div>
      </div>

      {/* Tabs Internas */}
      <div className="border-b border-white/10 bg-[#161618] flex overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('status')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-semibold cursor-pointer transition-all ${
            activeTab === 'status' 
              ? 'border-amber-500 text-amber-400 bg-[#1F1F22]/30 font-bold' 
              : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Configuração & Diagnóstico
        </button>
        <button
          onClick={() => setActiveTab('clientes')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-semibold cursor-pointer transition-all ${
            activeTab === 'clientes' 
              ? 'border-amber-500 text-amber-400 bg-[#1F1F22]/30 font-bold' 
              : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Clientes Cadastrados ({clientes.length})
        </button>
        <button
          onClick={() => setActiveTab('pedidos')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-semibold cursor-pointer transition-all ${
            activeTab === 'pedidos' 
              ? 'border-amber-500 text-amber-400 bg-[#1F1F22]/30 font-bold' 
              : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Pedidos de Vendas ({pedidos.length})
        </button>
        <button
          onClick={() => setActiveTab('produtos')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-semibold cursor-pointer transition-all ${
            activeTab === 'produtos' 
              ? 'border-amber-500 text-amber-400 bg-[#1F1F22]/30 font-bold' 
              : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Catálogo / Preços ({produtos.length})
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      <div className="p-6">
        {activeTab === 'status' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form de Configuração */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-1.5 border-b border-white/10 pb-2">
                <Key className="w-4 h-4 text-amber-400" />
                Credenciais da API Bling v3
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1">
                    Alias do Servidor (Nome)
                  </label>
                  <input
                    type="text"
                    value={aliasServidor}
                    onChange={(e) => setAliasServidor(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-amber-500 focus:ring-1.5 focus:ring-amber-500/20"
                    placeholder="Ex: Safira Comercial Principal"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1">
                    Bling Client ID
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-amber-500 focus:ring-1.5 focus:ring-amber-500/20 font-mono"
                    placeholder="client_id_..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1">
                  Bling Client Secret
                </label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-amber-500 focus:ring-1.5 focus:ring-amber-500/20 font-mono"
                  placeholder="client_secret_..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1">
                  API Token / Token de Integração (V3)
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1F1F22] border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-amber-500 focus:ring-1.5 focus:ring-amber-500/20 font-mono"
                  placeholder="Insira o Token Gerado no Bling"
                />
                <span className="text-[10px] text-white/40 mt-1 block">
                  Recomendado obter o token em Preferências &gt; Integrações &gt; Plataformas.
                </span>
              </div>

              {/* Webhooks config */}
              <div className="bg-[#1F1F22]/40 border border-white/10 rounded-xl p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Configuração de Webhooks</h4>
                    <p className="text-[11px] text-white/60">Sincronização automática quando estoque ou pedidos mudarem no Bling</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookAtivo}
                      onChange={(e) => setWebhookAtivo(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/10 after:border after:rounded-full after:h-4 after:width-4 after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="text-[11px] text-white/80 bg-[#1F1F22] p-3 rounded-lg border border-white/10 space-y-1.5">
                  <p className="font-semibold text-white/95">DADOS PARA PREENCHER NO BLING:</p>
                  <p>Para receber atualizações automáticas, configure o Webhook no painel do Bling:</p>
                  <div className="font-mono text-[10px] bg-[#161618] p-2 rounded border border-white/5 text-amber-400 break-all select-all">
                    URL: {window.location.origin}/api/bling/webhook
                  </div>
                  <p>No campo **Servidor**, selecione o servidor cadastrado (**{aliasServidor || 'Safira Portal Comercial'}**).</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-gray-950 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-amber-500/10"
                >
                  Salvar Configuração
                </button>
                {saveSuccess && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-4 h-4" /> Configuração salva e atualizada!
                  </span>
                )}
              </div>
            </div>

            {/* Diagnóstico em Tempo Real */}
            <div className="lg:col-span-5 space-y-4">
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-1.5 border-b border-white/10 pb-2">
                <Database className="w-4 h-4 text-amber-400" />
                Módulo de Diagnóstico
              </h3>

              <div className="space-y-3">
                {/* Diagnóstico geral */}
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-400">Conexão Estabelecida</h4>
                    <p className="text-[11px] text-white/80 leading-relaxed mt-0.5">
                      O portal está autenticado na API Bling v3. O último sincronismo completo ocorreu em <span className="font-bold text-white">{formattedDate(config.ultimoSincronismo)}</span>.
                    </p>
                  </div>
                </div>

                {/* Bling Webhook status */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-start gap-3">
                  <Wifi className="w-5 h-5 text-white/40 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white/90">Webhooks de Estoques & Produtos</h4>
                    <p className="text-[11px] text-white/60 leading-relaxed mt-0.5">
                      No painel do Bling, insira o alias e a URL para atualizações automáticas em tempo real. Os estoques de finalizadores, shampoos e kits Amend são atualizados no momento do faturamento no ERP.
                    </p>
                  </div>
                </div>

                {/* Quotas & Limits */}
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-400">Limites de Chamadas API</h4>
                      <p className="text-[11px] text-white/80 leading-relaxed mt-0.5">
                        O Bling v3 opera sob taxa de limite de requisições por segundo. Em caso de sobrecarga, o portal aguardará e efetuará retentativas automáticas (Backoff exponencial).
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 bg-amber-500/20 p-2 rounded-lg text-[10px] text-amber-300 border border-amber-500/30 flex justify-between items-center">
                    <span>Taxa de Uso de Quota:</span>
                    <span className="font-bold">14 / 10.000 requisições diárias (0.1%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List of clients from Bling */}
        {activeTab === 'clientes' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white">Clientes Importados do Bling</h3>
                <p className="text-xs text-white/60">Total de clientes integrados para acompanhamento das promotoras</p>
              </div>
            </div>

            <div className="overflow-x-auto border border-white/10 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1F1F22]/50 border-b border-white/10 text-white/60 font-bold">
                    <th className="px-4 py-3">Cliente / PDV</th>
                    <th className="px-4 py-3">CNPJ</th>
                    <th className="px-4 py-3">Cidade / Localização</th>
                    <th className="px-4 py-3">Produtos Comprados (Bling)</th>
                    <th className="px-4 py-3 text-right">Faturamento Histórico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {clientes.map((c) => (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{c.nome}</div>
                        <div className="text-[10px] text-white/40 mt-0.5">{c.endereco}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-white/60">{c.cnpj}</td>
                      <td className="px-4 py-3 text-white/60">{c.cidade}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {c.produtosComprados.map((p, idx) => (
                            <span key={idx} className="bg-white/5 text-white/80 text-[9px] px-1.5 py-0.5 rounded-md border border-white/10">
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-400">
                        {c.faturamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* List of orders from Bling */}
        {activeTab === 'pedidos' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Últimos Pedidos de Faturamento (Bling v3)</h3>
              <p className="text-xs text-white/60 font-sans">Acompanhe as mercadorias Amend enviadas aos pontos de venda</p>
            </div>

            <div className="overflow-x-auto border border-white/10 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1F1F22]/50 border-b border-white/10 text-white/60 font-bold">
                    <th className="px-4 py-3">Pedido #</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Data Faturamento</th>
                    <th className="px-4 py-3">Itens Comprados</th>
                    <th className="px-4 py-3">Status Bling</th>
                    <th className="px-4 py-3 text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pedidos.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-amber-400">#{p.numero}</td>
                      <td className="px-4 py-3 text-white/80 font-medium">{p.clienteNome}</td>
                      <td className="px-4 py-3 text-white/60">
                        {new Date(p.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {p.itens.map((item, idx) => (
                            <div key={idx} className="text-[10px] text-white/50">
                              <span className="font-bold text-amber-500/90">{item.qtd}x</span> {item.produtoNome}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'Faturado' || p.status === 'Atendido'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-white">
                        {p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Catalog of products */}
        {activeTab === 'produtos' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Catálogo de Produtos Importados</h3>
              <p className="text-xs text-white/60">Relação de mercadorias Amend & Safira homologadas para auditoria em gôndola</p>
            </div>

            <div className="overflow-x-auto border border-white/10 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1F1F22]/50 border-b border-white/10 text-white/60 font-bold">
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Código EAN (Barras)</th>
                    <th className="px-4 py-3">Nome do Produto</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3 text-right">Preço Sugerido (Tabela)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {produtos.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-mono text-white/60">{p.sku}</td>
                      <td className="px-4 py-3 font-mono text-white/40">{p.ean}</td>
                      <td className="px-4 py-3 font-bold text-white">{p.nome}</td>
                      <td className="px-4 py-3">
                        <span className="bg-white/5 text-white/70 px-2 py-0.5 rounded-md border border-white/10">
                          {p.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        {p.precoSugerido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
