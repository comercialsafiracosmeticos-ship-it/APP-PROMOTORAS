import React, { useState, FormEvent } from 'react';
import { 
  Shield, User, Lock, Mail, LogIn, LogOut, Sparkles, X, 
  CheckCircle2, AlertCircle, Chrome, Key, RefreshCw, Layers
} from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  firebaseSignOut,
  FirebaseUser,
  updateProfile
} from '../lib/firebase';
import { Promotora } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  authUser: FirebaseUser | null;
  activePromotora: Promotora | null;
  promotoras: Promotora[];
  onSelectUser: (user: Promotora) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  authUser,
  activePromotora,
  promotoras,
  onSelectUser
}: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roleSelection, setRoleSelection] = useState<'Promotora' | 'Admin'>('Promotora');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const isAdmin = activePromotora?.role === 'Admin';

  // Handle standard email/password login
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        setSuccessMsg(`Login efetuado com sucesso via Firebase Auth (${credential.user.email})!`);
        
        // Find or map corresponding user profile
        const matched = promotoras.find(p => p.email?.toLowerCase() === email.toLowerCase()) ||
                        promotoras.find(p => p.usuario?.toLowerCase() === email.toLowerCase());
        if (matched) {
          onSelectUser(matched);
        } else {
          // If no match found, create dynamic promotora profile
          const isMasterAdmin = email.toLowerCase().includes('admin') || email.toLowerCase() === 'comercial.safiracosmeticos@gmail.com';
          const newUser: Promotora = {
            id: 'prom-fb-' + credential.user.uid.substr(0, 8),
            nome: credential.user.displayName || email.split('@')[0],
            codigoBling: 'FB-' + credential.user.uid.substr(0, 5),
            telefone: '(27) 99999-0000',
            email: email,
            usuario: email.split('@')[0],
            status: 'Ativa',
            role: isMasterAdmin ? 'Admin' : 'Promotora'
          };
          onSelectUser(newUser);
        }
        setTimeout(() => onClose(), 1200);
      } else {
        // Sign Up
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(credential.user, { displayName });
        }
        setSuccessMsg(`Conta criada no Firebase Auth! Acessando como ${roleSelection}...`);

        const newUser: Promotora = {
          id: 'prom-fb-' + credential.user.uid.substr(0, 8),
          nome: displayName || email.split('@')[0],
          codigoBling: 'FB-' + credential.user.uid.substr(0, 5),
          telefone: '(27) 99999-0000',
          email: email,
          usuario: email.split('@')[0],
          status: 'Ativa',
          role: roleSelection
        };
        onSelectUser(newUser);
        setTimeout(() => onClose(), 1200);
      }
    } catch (err: any) {
      console.error("Firebase Auth Error:", err);
      let msg = "Falha ao autenticar no Firebase Auth.";
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = "Senha ou e-mail incorretos.";
      } else if (err.code === 'auth/user-not-found') {
        msg = "Usuário não encontrado no Firebase Auth.";
      } else if (err.code === 'auth/email-already-in-use') {
        msg = "Este e-mail já está cadastrado no Firebase Auth.";
      } else if (err.code === 'auth/weak-password') {
        msg = "A senha deve ter no mínimo 6 caracteres.";
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Auth Login
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      setSuccessMsg(`Autenticado via Google Firebase Auth (${user.email})!`);

      const matched = promotoras.find(p => p.email?.toLowerCase() === user.email?.toLowerCase());
      if (matched) {
        onSelectUser(matched);
      } else {
        const isMasterAdmin = user.email?.toLowerCase() === 'comercial.safiracosmeticos@gmail.com' || user.email?.toLowerCase().includes('admin');
        const newUser: Promotora = {
          id: 'prom-google-' + user.uid.substr(0, 8),
          nome: user.displayName || user.email?.split('@')[0] || 'Usuário Google',
          codigoBling: 'GOOG-' + user.uid.substr(0, 5),
          telefone: '(27) 99999-0000',
          email: user.email || '',
          usuario: user.email?.split('@')[0] || 'google_user',
          status: 'Ativa',
          avatar: user.photoURL || undefined,
          role: isMasterAdmin ? 'Admin' : 'Promotora'
        };
        onSelectUser(newUser);
      }
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setErrorMsg("Não foi possível conectar via Google. Verifique os pop-ups.");
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Login Helper
  const handleQuickDemoLogin = async (targetUser: Promotora) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    const demoEmail = targetUser.email || `${targetUser.usuario || 'user'}@safiracosmeticos.com.br`;
    const demoPassword = targetUser.senha || 'safira123456';

    try {
      // Try signing in or create if missing
      try {
        await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      } catch (signInErr: any) {
        if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
          await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
        } else {
          throw signInErr;
        }
      }

      onSelectUser(targetUser);
      setSuccessMsg(`Autenticado no Firebase Auth como ${targetUser.nome} (${targetUser.role})!`);
      setTimeout(() => onClose(), 1000);
    } catch (e: any) {
      // Fallback local switch if network is restricted
      onSelectUser(targetUser);
      setSuccessMsg(`Sessão ativada como ${targetUser.nome} (${targetUser.role})!`);
      setTimeout(() => onClose(), 800);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
      setSuccessMsg("Desconectado do Firebase Auth com sucesso!");
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#18181B] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative text-white">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                Firebase Authentication
                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  Sessão Segura
                </span>
              </h3>
              <p className="text-xs text-white/60">Controle central de acesso ao Portal Safira Cosméticos</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Auth Status Banner */}
        <div className="bg-[#222226] border border-white/10 rounded-xl p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
              isAdmin ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {activePromotora?.nome?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="font-bold text-white flex items-center gap-1.5">
                {activePromotora?.nome}
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  isAdmin ? 'bg-amber-500 text-gray-950' : 'bg-emerald-500 text-gray-950'
                }`}>
                  {isAdmin ? 'ADMINISTRADOR' : 'PROMOTORA DE VENDAS'}
                </span>
              </p>
              <p className="text-[10px] text-white/50 font-mono mt-0.5">
                {authUser?.email ? `Firebase: ${authUser.email}` : `Local UID: ${activePromotora?.id}`}
              </p>
            </div>
          </div>

          {authUser && (
            <button
              type="button"
              onClick={handleLogout}
              className="text-[11px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          )}
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Mode Selector */}
        <div className="flex bg-[#141416] p-1 rounded-xl border border-white/10 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              mode === 'signin' ? 'bg-amber-500 text-gray-950 shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            Entrar com E-mail & Senha
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              mode === 'signup' ? 'bg-amber-500 text-gray-950 shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            Criar Nova Conta Auth
          </button>
        </div>

        {/* Login / Register Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-white/60 mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex: Mariana Oliveira"
                    required
                    className="w-full bg-[#222226] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-white/60 mb-1">Perfil de Acesso no Sistema</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setRoleSelection('Promotora')}
                    className={`p-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      roleSelection === 'Promotora' 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' 
                        : 'bg-[#222226] border-white/10 text-white/60'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    Promotora de Vendas
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleSelection('Admin')}
                    className={`p-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      roleSelection === 'Admin' 
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300' 
                        : 'bg-[#222226] border-white/10 text-white/60'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Administrador Master
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-white/60 mb-1">E-mail Cadastrado</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@safiracosmeticos.com.br"
                required
                className="w-full bg-[#222226] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-white/60 mb-1">Senha do Firebase Auth</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
                required
                className="w-full bg-[#222226] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-gray-950 font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/10 mt-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {mode === 'signin' ? 'Autenticar via Firebase' : 'Criar e Acessar Conta'}
          </button>
        </form>

        {/* Single Sign On Google */}
        <div className="pt-2 border-t border-white/10 space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2 bg-[#222226] hover:bg-[#2A2A30] border border-white/10 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Chrome className="w-4 h-4 text-amber-400" />
            Entrar com Google SSO (Firebase Auth)
          </button>

          {/* Quick Demo Login Switcher */}
          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center justify-between">
              <span>Acesso Rápido de Teste (Perfis do Sistema)</span>
              <span className="text-amber-400 text-[9px] font-mono">Firebase Auth Sync</span>
            </p>

            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {promotoras.map((p) => {
                const isSelected = activePromotora?.id === p.id;
                const isPAdmin = p.role === 'Admin';
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleQuickDemoLogin(p)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/50 text-white font-bold'
                        : 'bg-[#1C1C1E] hover:bg-[#252528] border-white/5 text-white/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        isPAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {isPAdmin ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          {p.nome}
                          <span className={`text-[8px] px-1 py-0.2 rounded font-mono font-black ${
                            isPAdmin ? 'bg-amber-500/30 text-amber-300' : 'bg-emerald-500/30 text-emerald-300'
                          }`}>
                            {p.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-white/40 font-mono">
                          {p.email || `${p.usuario || 'user'}@safiracosmeticos.com.br`}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-[10px] text-amber-400 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Ativo
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
