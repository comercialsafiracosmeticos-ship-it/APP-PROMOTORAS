import { Link2, Sparkles, LogOut, CheckCircle2, Menu, X, Landmark, Compass, Calendar, ShoppingBag, Shield, User, ChevronDown, Lock, Key } from 'lucide-react';
import { useState, FormEvent } from 'react';
import { Promotora } from '../types';
import { FirebaseUser } from '../lib/firebase';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isStandaloneMode: boolean;
  activeUser: Promotora | null;
  promotoras: Promotora[];
  onSelectUser: (user: Promotora) => void;
  onOpenAuthModal?: () => void;
  authUser?: FirebaseUser | null;
}

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  isStandaloneMode,
  activeUser,
  promotoras,
  onSelectUser,
  onOpenAuthModal,
  authUser
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [selectedUserToAuth, setSelectedUserToAuth] = useState<Promotora | null>(null);
  const [authPasswordInput, setAuthPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const isAdmin = activeUser?.role === 'Admin';

  // Role-Based Tabs Filter:
  // - Admin sees ALL modules: Promotoras & PDV, Clientes & Financeiro, Dashboard, Pedidos de Vendas, Painel Bling v3
  // - Promotoras see ONLY: Promotoras & PDV and Dashboard de BI (visitas/metas)
  // Restricted for non-admins: 'CLIENTES' (Clientes/Financeiro), 'PEDIDOS' (Pedidos), 'BLING' (Bling)
  const allTabs = [
    { id: 'PROMOTORA', label: 'Promotoras & PDV', icon: Compass, adminOnly: false },
    { id: 'CLIENTES', label: 'Clientes & Financeiro', icon: Landmark, adminOnly: true },
    { id: 'DASHBOARD', label: 'Dashboard de BI', icon: Sparkles, adminOnly: false },
    { id: 'PEDIDOS', label: 'Pedidos de Vendas', icon: ShoppingBag, adminOnly: true },
    { id: 'BLING', label: 'Painel Bling v3', icon: Link2, adminOnly: true }
  ];

  const visibleTabs = allTabs.filter(tab => {
    if (isStandaloneMode && (tab.id === 'CLIENTES' || tab.id === 'PEDIDOS' || tab.id === 'DASHBOARD')) {
      return false;
    }
    if (!isAdmin && tab.adminOnly) {
      return false;
    }
    return true;
  });

  const handleConfirmUserSwitch = (targetUser: Promotora) => {
    // If targeted user requires password and it's set
    if (targetUser.senha) {
      setSelectedUserToAuth(targetUser);
      setAuthPasswordInput('');
      setAuthError('');
    } else {
      onSelectUser(targetUser);
      setShowSwitchModal(false);
    }
  };

  const handleAuthenticate = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUserToAuth) return;

    if (selectedUserToAuth.senha && authPasswordInput !== selectedUserToAuth.senha) {
      setAuthError('Senha incorreta! Tente novamente.');
      return;
    }

    onSelectUser(selectedUserToAuth);
    setSelectedUserToAuth(null);
    setShowSwitchModal(false);
  };

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
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider font-mono border ${
                  isAdmin 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}>
                  {isAdmin ? 'Acesso Master Admin' : 'Portal Promotora'}
                </span>
              </div>
              <p className="text-[10px] text-white/40 leading-none mt-0.5">Sistema de Gestão Comercial</p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-amber-500 text-gray-950 shadow-sm shadow-amber-500/10 font-black'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* User Profile / Switcher Button & Firebase Auth Trigger */}
          <div className="hidden sm:flex items-center gap-2">
            {onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                title="Abrir gerenciador de login Firebase Auth"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Firebase Auth</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (onOpenAuthModal) {
                  onOpenAuthModal();
                } else {
                  setShowSwitchModal(true);
                }
              }}
              className="flex items-center gap-2.5 bg-[#1F1F22] hover:bg-[#28282C] border border-white/10 hover:border-amber-500/40 px-3 py-1.5 rounded-xl transition-all cursor-pointer group text-left"
              title="Clique para alternar perfil de login ou trocar usuário no Firebase Auth"
            >
              <div className="w-7 h-7 rounded-lg overflow-hidden bg-amber-500/20 border border-amber-500/30 shrink-0 flex items-center justify-center text-amber-400 font-bold text-xs">
                {activeUser?.avatar ? (
                  <img src={activeUser.avatar} alt={activeUser.nome} className="w-full h-full object-cover" />
                ) : (
                  activeUser?.nome?.charAt(0) || 'U'
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  <span>{activeUser?.nome || 'Usuário Safira'}</span>
                  <ChevronDown className="w-3 h-3 text-white/40 group-hover:text-amber-400 transition-colors" />
                </div>
                <div className="text-[10px] text-amber-400/90 font-mono flex items-center gap-1">
                  {isAdmin ? <Shield className="w-2.5 h-2.5 text-amber-400" /> : <User className="w-2.5 h-2.5 text-emerald-400" />}
                  <span>{isAdmin ? 'Administrador' : 'Promotora de Vendas'}</span>
                </div>
              </div>
            </button>
          </div>

          {/* Mobile Menu button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSwitchModal(true)}
              className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>{activeUser?.nome?.split(' ')[0]}</span>
            </button>
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
          {visibleTabs.map((tab) => {
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
            <span className="text-[10px] text-white/40 font-mono">PERFIL ATIVO</span>
            <span className="text-amber-400 font-bold font-mono text-[10px] flex items-center gap-1">
              {activeUser?.nome} ({isAdmin ? 'Admin' : 'Promotora'})
            </span>
          </div>
        </div>
      )}

      {/* Profile Switcher Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181A] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-400" />
                  Alternar Perfil de Acesso
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Selecione o usuário para acessar o portal com as permissões correspondentes
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSwitchModal(false);
                  setSelectedUserToAuth(null);
                }}
                className="text-white/40 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedUserToAuth ? (
              <form onSubmit={handleAuthenticate} className="space-y-4">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                  <p className="font-bold text-amber-400">Autenticação Requerida</p>
                  <p className="mt-0.5">Digite a senha para acessar como <strong>{selectedUserToAuth.nome}</strong> ({selectedUserToAuth.role}).</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1">Senha de Acesso</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-white/40 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={authPasswordInput}
                      onChange={(e) => setAuthPasswordInput(e.target.value)}
                      placeholder="Digite sua senha..."
                      autoFocus
                      required
                      className="w-full bg-[#222226] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  {authError && <p className="text-[11px] text-rose-400 mt-1 font-medium">{authError}</p>}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUserToAuth(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold text-xs cursor-pointer"
                  >
                    Confirmar Login
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Perfis Disponíveis no Sistema</p>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {promotoras.map((p) => {
                    const isCurrent = activeUser?.id === p.id;
                    const isPAdmin = p.role === 'Admin';
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleConfirmUserSwitch(p)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                          isCurrent 
                            ? 'bg-amber-500/15 border-amber-500/50 text-white' 
                            : 'bg-[#222226] hover:bg-[#2A2A30] border-white/5 hover:border-white/20 text-white/80'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                            {p.avatar ? (
                              <img src={p.avatar} alt={p.nome} className="w-full h-full object-cover" />
                            ) : (
                              p.nome.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-white flex items-center gap-1.5">
                              {p.nome}
                              {isCurrent && <span className="text-[9px] bg-amber-500 text-gray-950 px-1.5 py-0.2 rounded font-black">LOGADO</span>}
                            </div>
                            <div className="text-[10px] text-white/40 flex items-center gap-2">
                              <span>{isPAdmin ? '🛡️ Administrador' : '👤 Promotora'}</span>
                              {p.usuario && <span>• Usuário: {p.usuario}</span>}
                            </div>
                          </div>
                        </div>

                        {p.senha && <Lock className="w-3.5 h-3.5 text-white/30" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 text-center">
                  <p className="text-[11px] text-white/40">
                    * Ao selecionar uma Promotora, o acesso às abas restritas (Financeiro, Pedidos, Bling) e configurações será ocultado.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

