import { Link2, Sparkles, LogOut, CheckCircle2, Menu, X, Landmark, Compass, Calendar, ShoppingBag, Shield } from 'lucide-react';
import { useState } from 'react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isStandaloneMode: boolean;
}

export default function Navbar({ activeTab, setActiveTab, isStandaloneMode }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter tabs if standalone is active
  // STANDALONE MODE: only "PROMOTORA" and "PAINEL BLING V3" (for config) is displayed/needed, or simplify to keep it focused.
  // MULTIMODULAR MODE: full tabs.
  const tabs = [
    { id: 'PROMOTORA', label: 'Promotoras & PDV', icon: Compass },
    ...(isStandaloneMode ? [] : [
      { id: 'CLIENTES', label: 'Clientes & Financeiro', icon: Landmark },
      { id: 'DASHBOARD', label: 'Dashboard de BI', icon: Sparkles },
      { id: 'PEDIDOS', label: 'Pedidos de Vendas', icon: ShoppingBag }
    ]),
    { id: 'BLING', label: 'Painel Bling v3', icon: Link2 }
  ];

  return (
    <header className="bg-[#161618] border-b border-white/10 text-[#E0E0E0] sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center font-bold text-gray-950 shadow-md shadow-amber-500/20 font-display text-lg tracking-wider">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-sm sm:text-base tracking-tight text-white">SAFIRA COSMÉTICOS</span>
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider font-mono">
                  {isStandaloneMode ? 'Standalone' : 'Multimodular'}
                </span>
              </div>
              <p className="text-[10px] text-white/40 leading-none mt-0.5">Portal Comercial Integrado</p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-amber-500 text-gray-950 shadow-sm shadow-amber-500/10'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Connection Status and Actions */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-[#1F1F22] border border-white/10 px-3 py-1.5 rounded-xl text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <span className="text-white/40 font-sans text-[10px]">Sincronia:</span>
              <span className="text-emerald-400 font-bold text-[10px] uppercase font-mono">Definitivo / Ativo</span>
            </div>
          </div>

          {/* Mobile Menu button */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 focus:outline-none cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-[#161618] px-4 pt-2 pb-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-amber-500 text-gray-950 font-extrabold'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}

          <div className="border-t border-white/10 pt-3 mt-3 px-4 flex items-center justify-between">
            <span className="text-[10px] text-white/40 font-mono">CONEXÃO PORTAL</span>
            <span className="text-emerald-400 font-bold font-mono text-[10px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              CONECTADO
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
