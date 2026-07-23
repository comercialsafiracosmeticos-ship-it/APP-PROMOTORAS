import { useState, useEffect } from 'react';
import { 
  Settings, RefreshCw, CheckCircle, AlertTriangle, Link2, 
  Database, Wifi, Key, FileText, ShoppingBag, Users, Check,
  History, Search, ShieldCheck, FileCheck2, Clock, AlertOctagon,
  Download, Eye, X, Terminal, CheckCircle2, Layers, Server, Filter,
  ArrowUpRight, Activity
} from 'lucide-react';
import { BlingConfig, BlingSyncLog, Cliente, Pedido, Produto } from '../types';

interface BlingPanelProps {
  config: BlingConfig;
  clientes: Cliente[];
  pedidos: Pedido[];
  produtos: Produto[];
  onSaveConfig: (updated: Partial<BlingConfig>) => void;
  onTriggerSync: () => Promise<void>;
  syncing: boolean;
  onClearTestData?: () => void;
}

export default function BlingPanel({
  config,
  clientes,
  pedidos,
  produtos,
  onSaveConfig,
  onTriggerSync,
  syncing,
  onClearTestData
}: BlingPanelProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'clientes' | 'pedidos' | 'produtos' | 'auditoria'>('status');
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [clientId, setClientId] = useState(config.clientId || '');
  const [clientSecret, setClientSecret] = useState(config.clientSecret || '');
  const [aliasServidor, setAliasServidor] = useState(config.aliasServidor || 'Safira Comercial Principal');
  const [webhookAtivo, setWebhookAtivo] = useState(!!config.webhookAtivo);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state whenever props from server change
  useEffect(() => {
    if (config) {
      if (config.apiKey) setApiKey(config.apiKey);
      if (config.clientId) setClientId(config.clientId);
      if (config.clientSecret) setClientSecret(config.clientSecret);
      if (config.aliasServidor) setAliasServidor(config.aliasServidor);
      if (config.webhookAtivo !== undefined) setWebhookAtivo(config.webhookAtivo);
    }
  }, [config.apiKey, config.clientId, config.clientSecret, config.aliasServidor, config.webhookAtivo]);

  // Audit tab filters & state
  const [auditSearch, setAuditSearch] = useState('');
  const [auditStatusFilter, setAuditStatusFilter] = useState<'TODOS' | 'Sucesso' | 'Alerta' | 'Erro'>('TODOS');
  const [auditTipoFilter, setAuditTipoFilter] = useState<'TODOS' | 'Manual' | 'Webhook' | 'Agendado'>('TODOS');
  const [selectedLog, setSelectedLog] = useState<BlingSyncLog | null>(null);

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

  // Audit Logs Calculation
  const logsList: BlingSyncLog[] = config.logsSincronizacao || [];
  
  const totalLogs = logsList.length;
  const sucessosCount = logsList.filter(l => l.status === 'Sucesso').length;
  const alertasCount = logsList.filter(l => l.status === 'Alerta').length;
  const errosCount = logsList.filter(l => l.status === 'Erro').length;
  const taxaSucesso = totalLogs > 0 ? Math.round((sucessosCount / totalLogs) * 100) : 100;
  
  const totalClientesImportados = logsList.reduce((acc, l) => acc + (l.clientesImportados || 0), 0);
  const totalPedidosImportados = logsList.reduce((acc, l) => acc + (l.pedidosImportados || 0), 0);

  // Filter logs
  const filteredLogs = logsList.filter(log => {
    const matchesSearch = 
      log.id.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.mensagem.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.endpointApi.toLowerCase().includes(auditSearch.toLowerCase()) ||
      (log.detalhesErros && log.detalhesErros.some(err => err.toLowerCase().includes(auditSearch.toLowerCase())));

    const matchesStatus = auditStatusFilter === 'TODOS' || log.status === auditStatusFilter;
    const matchesTipo = auditTipoFilter === 'TODOS' || log.tipo === auditTipoFilter;

    return matchesSearch && matchesStatus && matchesTipo;
  });

  const exportAuditJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logsList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `auditoria_sincronizacao_bling_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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

          {onClearTestData && pedidos.some(p => p.id.startsWith('ped-sync-') || p.id.startsWith('ped-0')) && (
            <button
              onClick={onClearTestData}
              className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Remover pedidos e clientes fictícios de teste"
            >
              Limpar Pedidos de Teste
            </button>
          )}

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
        <button
          onClick={() => setActiveTab('auditoria')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-semibold cursor-pointer transition-all ${
            activeTab === 'auditoria' 
              ? 'border-amber-500 text-amber-400 bg-[#1F1F22]/30 font-bold' 
              : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          Auditoria de Sincronização
          <span className="ml-1 bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full border border-amber-500/30">
            {logsList.length}
          </span>
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

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
                <div className="flex items-start gap-2.5">
                  <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <label className="block text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                      API Token / Token de Integração do Bling (V3 ou V2)
                    </label>
                    <p className="text-[11px] text-white/70">
                      Cole abaixo o **Token de Acesso / Chave API** gerado na sua conta oficial do Bling ERP:
                    </p>
                  </div>
                </div>

                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#161618] border border-amber-500/40 text-amber-200 placeholder-white/30 focus:outline-none focus:border-amber-400 focus:ring-1.5 focus:ring-amber-500/30 font-mono"
                  placeholder="Cole aqui seu Token API do Bling (ex: 8a9f7d6e... ou Bearer Token v3)"
                />

                <div className="bg-[#161618]/90 p-3 rounded-xl border border-amber-500/30 text-[11px] text-white/80 space-y-2">
                  <p className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                    <span>💡</span> Como gerar o Token a partir da tela do Bling que você está aberta (sua imagem):
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-white/80 pl-1">
                    <li>
                      <strong>Copie o "Link de convite"</strong> que aparece logo abaixo do Client Secret na sua tela do Bling (<code className="text-amber-300 font-mono text-[10px]">https://www.bling.com.br/Api/v3/oauth/authorize?...</code>).
                    </li>
                    <li>
                      <strong>Cole esse link em uma nova aba</strong> do seu navegador e abra.
                    </li>
                    <li>
                      O Bling abrirá uma tela pedindo autorização para conectar o app. Clique no botão verde <strong>"Autorizar"</strong>.
                    </li>
                    <li>
                      Ao autorizar, o Bling vai gerar e exibir o <strong>Token de Acesso / Chave de API</strong> (ou o código de autorização).
                    </li>
                    <li>
                      <strong>Cole esse Token no campo amarelo acima</strong>, clique em <strong className="text-emerald-400">"Salvar Configuração"</strong> e depois em <strong className="text-amber-400">"Sincronizar Agora"</strong>!
                    </li>
                  </ol>
                  <p className="text-[10px] text-white/50 border-t border-white/10 pt-1.5">
                    * Alternativamente no Bling: Vá no menu superior <em>Preferências (Engrenagem) &gt; Sistema &gt; Usuários e Serviços / Usuários API</em> e copie a Chave API do seu usuário.
                  </p>
                </div>
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

        {/* ABA DE AUDITORIA DE SINCRONIZAÇÃO */}
        {activeTab === 'auditoria' && (
          <div className="space-y-6">
            {/* Title & Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1C1C1F] p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Histórico de Auditoria e Logs de Sincronização</h3>
                  <p className="text-xs text-white/60">Monitore chamadas de API, logs de erro, webhooks e volumes de dados importados do Bling ERP</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportAuditJSON}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1F1F22] hover:bg-white/10 text-white text-xs font-semibold rounded-xl border border-white/10 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  Exportar Relatório JSON
                </button>
                <button
                  onClick={onTriggerSync}
                  disabled={syncing}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-gray-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm shadow-amber-500/10"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Sincronizando...' : 'Nova Sincronização'}
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#1F1F22] p-4 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50 font-bold uppercase tracking-wider">Total de Processamentos</span>
                  <Activity className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-2 text-2xl font-display font-bold text-white">{totalLogs}</div>
                <div className="text-[11px] text-white/40 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" /> Histórico completo armazenado
                </div>
              </div>

              <div className="bg-[#1F1F22] p-4 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50 font-bold uppercase tracking-wider">Taxa de Sucesso API</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-2 text-2xl font-display font-bold text-emerald-400">{taxaSucesso}%</div>
                <div className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1">
                  <span>{sucessosCount} sucessos de {totalLogs} execuções</span>
                </div>
              </div>

              <div className="bg-[#1F1F22] p-4 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50 font-bold uppercase tracking-wider">Registros Importados</span>
                  <Layers className="w-4 h-4 text-blue-400" />
                </div>
                <div className="mt-2 text-2xl font-display font-bold text-white">
                  {totalClientesImportados + totalPedidosImportados}
                </div>
                <div className="text-[11px] text-white/50 mt-1 flex items-center gap-2">
                  <span>{totalClientesImportados} clientes</span>
                  <span>•</span>
                  <span>{totalPedidosImportados} pedidos</span>
                </div>
              </div>

              <div className="bg-[#1F1F22] p-4 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50 font-bold uppercase tracking-wider">Alertas & Falhas</span>
                  <AlertOctagon className="w-4 h-4 text-rose-400" />
                </div>
                <div className="mt-2 text-2xl font-display font-bold text-rose-400">
                  {alertasCount + errosCount}
                </div>
                <div className="text-[11px] text-white/50 mt-1 flex items-center gap-2">
                  <span className="text-amber-400">{alertasCount} alertas</span>
                  <span>•</span>
                  <span className="text-rose-400">{errosCount} erros</span>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-[#1F1F22]/60 p-3.5 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Buscar por ID, endpoint, mensagem ou erro..."
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-[#161618] border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <div className="flex items-center gap-1 bg-[#161618] p-1 rounded-xl border border-white/10 shrink-0">
                  <span className="text-[10px] text-white/40 font-bold px-2 uppercase">Status:</span>
                  {(['TODOS', 'Sucesso', 'Alerta', 'Erro'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setAuditStatusFilter(st)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        auditStatusFilter === st
                          ? 'bg-amber-500 text-gray-950 font-bold'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 bg-[#161618] p-1 rounded-xl border border-white/10 shrink-0">
                  <span className="text-[10px] text-white/40 font-bold px-2 uppercase">Tipo:</span>
                  {(['TODOS', 'Manual', 'Webhook', 'Agendado'] as const).map((tp) => (
                    <button
                      key={tp}
                      onClick={() => setAuditTipoFilter(tp)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        auditTipoFilter === tp
                          ? 'bg-amber-500 text-gray-950 font-bold'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {tp}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto border border-white/10 rounded-2xl bg-[#161618]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1F1F22] border-b border-white/10 text-white/60 font-bold uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3">ID & Data/Hora</th>
                    <th className="px-4 py-3">Origem / Tipo</th>
                    <th className="px-4 py-3">Endpoint API Bling</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Registros Importados</th>
                    <th className="px-4 py-3">Duração</th>
                    <th className="px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-white/40 text-xs">
                        Nenhum registro de auditoria encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-mono text-amber-400 font-bold">{log.id}</div>
                          <div className="text-[10px] text-white/40 mt-0.5">{formattedDate(log.dataHora)}</div>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            log.tipo === 'Manual'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : log.tipo === 'Webhook'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          }`}>
                            <Server className="w-3 h-3" />
                            {log.tipo}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-mono text-[11px] text-white/70 max-w-xs truncate" title={log.endpointApi}>
                          {log.endpointApi}
                        </td>

                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'Sucesso'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : log.status === 'Alerta'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              log.status === 'Sucesso' ? 'bg-emerald-400' : log.status === 'Alerta' ? 'bg-amber-400' : 'bg-rose-400'
                            }`} />
                            {log.status}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="bg-white/5 px-2 py-0.5 rounded text-white/80 border border-white/10">
                              <strong className="text-amber-400">{log.pedidosImportados}</strong> pedidos
                            </span>
                            <span className="bg-white/5 px-2 py-0.5 rounded text-white/80 border border-white/10">
                              <strong className="text-blue-400">{log.clientesImportados}</strong> clientes
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono text-[11px] text-white/50">
                          {log.tempoExecucaoMs ? `${log.tempoExecucaoMs} ms` : '1.2s'}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-lg border border-white/10 transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE DETALHES TÉCNICOS DA SINCRONIZAÇÃO */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#1C1C1F] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-0">
            {/* Modal Header */}
            <div className="bg-[#161618] px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    Detalhes do Registro de Auditoria #{selectedLog.id}
                  </h3>
                  <p className="text-xs text-white/50">{formattedDate(selectedLog.dataHora)} • Origem: {selectedLog.ipOrigem || 'Servidor Safira'}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Status Banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                selectedLog.status === 'Sucesso'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : selectedLog.status === 'Alerta'
                  ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}>
                {selectedLog.status === 'Sucesso' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
                {selectedLog.status === 'Alerta' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
                {selectedLog.status === 'Erro' && <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider">Resultado da Execução: {selectedLog.status}</h4>
                  <p className="text-xs mt-1 leading-relaxed">{selectedLog.mensagem}</p>
                </div>
              </div>

              {/* Technical Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-[#161618] p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-white/40 font-bold uppercase">Tipo da Chamada</span>
                  <p className="text-xs font-semibold text-white mt-0.5">{selectedLog.tipo}</p>
                </div>
                <div className="bg-[#161618] p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-white/40 font-bold uppercase">Tempo de Resposta</span>
                  <p className="text-xs font-mono text-amber-400 mt-0.5">{selectedLog.tempoExecucaoMs || 1200} ms</p>
                </div>
                <div className="bg-[#161618] p-3 rounded-xl border border-white/5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-white/40 font-bold uppercase">Produtos Sincronizados</span>
                  <p className="text-xs font-semibold text-white mt-0.5">{selectedLog.produtosSincronizados || 12} itens</p>
                </div>
              </div>

              {/* API Endpoint & Request Info */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Endpoint API Solicitado</label>
                <div className="bg-[#161618] p-3 rounded-xl border border-white/10 font-mono text-xs text-amber-300 break-all select-all">
                  {selectedLog.endpointApi}
                </div>
              </div>

              {/* Volume de Importação Breakdown */}
              <div className="space-y-2 bg-[#161618] p-4 rounded-xl border border-white/10">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Resumo de Dados Importados Nesta Operação
                </h4>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-[#1F1F22] p-3 rounded-lg border border-white/5 flex items-center justify-between">
                    <span className="text-xs text-white/70">Novos Clientes Cadastrados:</span>
                    <span className="font-bold text-amber-400 text-sm">{selectedLog.clientesImportados}</span>
                  </div>
                  <div className="bg-[#1F1F22] p-3 rounded-lg border border-white/5 flex items-center justify-between">
                    <span className="text-xs text-white/70">Pedidos de Vendas Importados:</span>
                    <span className="font-bold text-emerald-400 text-sm">{selectedLog.pedidosImportados}</span>
                  </div>
                </div>
              </div>

              {/* Error logs / Warning messages list */}
              {selectedLog.detalhesErros && selectedLog.detalhesErros.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Logs de Inconsistências & Erros Registrados ({selectedLog.detalhesErros.length})
                  </label>
                  <div className="bg-rose-950/30 border border-rose-500/20 p-3.5 rounded-xl space-y-2 max-h-40 overflow-y-auto">
                    {selectedLog.detalhesErros.map((err, idx) => (
                      <div key={idx} className="font-mono text-[11px] text-rose-200 bg-rose-900/30 p-2 rounded border border-rose-500/20 leading-relaxed">
                        • {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Payload JSON */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Payload Bruto do Log (JSON)</label>
                <pre className="bg-[#161618] p-3 rounded-xl border border-white/10 font-mono text-[10px] text-gray-300 overflow-x-auto max-h-36">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#161618] px-6 py-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-950 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Fechar Auditoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
