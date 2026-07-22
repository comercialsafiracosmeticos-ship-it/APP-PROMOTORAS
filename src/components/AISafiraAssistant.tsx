import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MessageSquare, ArrowRight, User, Bot, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTED_QUESTIONS = [
  'Qual o pedido mínimo?',
  'Qual o prazo de entrega?',
  'Como funciona a política de trocas e avarias?',
  'Quais são os últimos lançamentos Amend?'
];

export default function AISafiraAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Olá! Sou a **Assistente Safira Inteligência Artificial**. Estou aqui para tirar suas dúvidas instantâneas sobre políticas de fornecimento, prazos, lançamentos e regras de campo da Safira Cosméticos e Amend. Como posso te ajudar hoje?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Map history
      const history = messages.slice(1).map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend, history })
      });

      if (!res.ok) {
        throw new Error('Falha ao comunicar com o assistente.');
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: '⚠️ Desculpe, encontrei um erro ao conectar com o servidor. Por favor, tente novamente ou verifique se as configurações de rede estão corretas.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render markdown-like bold/list text simply
  const renderMessageText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let content: React.ReactNode = line;
      
      // Check for bullet lists
      const bulletMatch = line.match(/^(\s*[-•*]\s+)(.*)/);
      const isBullet = !!bulletMatch;
      const mainText = isBullet ? bulletMatch[2] : line;

      // Bold parsing (**text**)
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(mainText)) !== null) {
        if (match.index > lastIndex) {
          parts.push(mainText.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-semibold text-amber-400">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      
      if (lastIndex < mainText.length) {
        parts.push(mainText.substring(lastIndex));
      }

      content = parts.length > 0 ? parts : mainText;

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc pl-1 text-white/80 py-0.5">
            {content}
          </li>
        );
      }

      return (
        <p key={idx} className="text-white/80 py-1 min-h-[1.5rem]">
          {content}
        </p>
      );
    });
  };

  return (
    <div className="bg-[#161618] border border-white/10 rounded-2xl shadow-lg overflow-hidden" id="ai-assistant-card">
      {/* Header */}
      <div className="bg-[#1C1C1F] border-b border-white/10 px-5 py-3.5 flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400/20" />
          </div>
          <div>
            <h3 className="font-display font-medium text-sm tracking-tight leading-none">Assistente Safira Inteligência Artificial</h3>
            <span className="text-[10px] text-amber-400/90 font-mono tracking-wider uppercase">Base de Conhecimento Safira & Amend</span>
          </div>
        </div>
        <div className="px-2.5 py-0.5 bg-amber-500/10 text-[10px] text-amber-400 font-medium rounded-full border border-amber-500/20">
          Gemini 2.5 Flash
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col h-[320px] bg-[#161618]">
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-amber-400" />
                  </div>
                )}
                
                <div className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs shadow-md leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-amber-500 text-gray-950 rounded-tr-none font-semibold'
                    : 'bg-[#1F1F22] text-white rounded-tl-none border border-white/10'
                }`}>
                  {m.role === 'user' ? (
                    <p>{m.text}</p>
                  ) : (
                    <ul className="space-y-0.5">{renderMessageText(m.text)}</ul>
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 text-white/80 border border-white/10 font-bold text-[10px]">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4 text-amber-400" />
              </div>
              <div className="bg-[#1F1F22] border border-white/10 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-xs">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion tags */}
        <div className="px-4 py-2 bg-[#1C1C1F] border-t border-white/10 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <HelpCircle className="w-3 h-3 text-white/40" /> Sugestões:
          </span>
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={loading}
              className="text-[11px] text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1 rounded-full transition-all duration-150 cursor-pointer disabled:opacity-50 shrink-0 font-medium"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="border-t border-white/10 p-2.5 flex items-center gap-2 bg-[#1C1C1F]"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Pergunte sobre frete CIF, pedido mínimo, batom rose gold..."
            className="flex-1 text-xs px-3.5 py-2 rounded-xl bg-[#1F1F22] border border-white/10 focus:outline-none focus:border-amber-500 focus:ring-1.5 focus:ring-amber-500/20 transition-all placeholder:text-white/30 text-white font-sans"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2 bg-amber-500 hover:bg-amber-600 disabled:bg-[#1F1F22] disabled:text-white/20 text-gray-950 rounded-xl transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
