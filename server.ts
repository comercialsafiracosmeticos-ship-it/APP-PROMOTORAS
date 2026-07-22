import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

dotenv.config();

// Firebase Initialization
let firebaseConfig: any = null;
try {
  const configFile = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configFile)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  }
} catch (e) {
  console.warn("Could not load firebase-applet-config.json", e);
}

let db: any = null;
if (firebaseConfig && firebaseConfig.projectId) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
    console.log("Firebase Firestore initialized successfully with project:", firebaseConfig.projectId);
  } catch (err) {
    console.error("Error initializing Firebase Firestore:", err);
  }
}

const app = express();
const PORT = 3000;

// High limits for base64 photo uploads
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

const DATA_FILE = path.join(process.cwd(), 'data_store.json');

// Initial Seeds
const initialPromotoras = [
  {
    id: 'prom-01',
    nome: 'Jaqueline Vechi',
    codigoBling: 'PROM04',
    telefone: '(27) 99888-7766',
    email: 'jaqueline.promotora@safira.com.br',
    status: 'Ativa',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    role: 'Promotora'
  },
  {
    id: 'prom-02',
    nome: 'Daniela Alves de Almeida',
    codigoBling: 'PROM05',
    telefone: '(27) 99111-2233',
    email: 'daniela.alves@safira.com.br',
    status: 'Ativa',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    role: 'Promotora'
  },
  {
    id: 'prom-03',
    nome: 'Vanessa Vicente',
    codigoBling: 'PROM06',
    telefone: '(27) 98877-6655',
    email: 'vanessa.vicente@safira.com.br',
    status: 'Ativa',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    role: 'Admin'
  },
  {
    id: 'prom-04',
    nome: 'Safira Cosméticos Admin',
    codigoBling: 'ADMIN01',
    telefone: '(27) 3300-4400',
    email: 'comercial.safiracosmeticos@gmail.com',
    status: 'Ativa',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    role: 'Admin'
  }
];

const initialClientes = [
  {
    id: 'cli-01',
    nome: 'FarmaVida - Centro',
    cnpj: '12.345.678/0001-90',
    cidade: 'Vitória',
    endereco: 'Av. Jerônimo Monteiro, 450 - Centro, Vitória - ES',
    telefone: '(27) 3222-1111',
    produtosComprados: [
      'Reparador De Pontas Amend 60Mi',
      'Filtro Solar Cabelos Tingidos Amend 180G',
      'Mascara Brilho Com Vitamina E Amend 500G'
    ],
    faturamentoTotal: 12500
  },
  {
    id: 'cli-02',
    nome: 'Shopping dos Cosméticos - Vila Velha',
    cnpj: '23.456.789/0001-01',
    cidade: 'Vila Velha',
    endereco: 'Rua Henrique Moscoso, 820 - Centro, Vila Velha - ES',
    telefone: '(27) 3329-2222',
    produtosComprados: [
      'Mascara Revitalizante D\'Pantenol Amend 500G',
      'Mascara Matizadora Amend Peal Blonde 250G',
      'Reparador De Pontas Amend 60Mi'
    ],
    faturamentoTotal: 8400
  },
  {
    id: 'cli-03',
    nome: 'Fórmula & Cia - Serra',
    cnpj: '34.567.890/0001-12',
    cidade: 'Serra',
    endereco: 'Av. Central, 1200 - Laranjeiras, Serra - ES',
    telefone: '(27) 3241-3333',
    produtosComprados: [
      'Filtro Solar Cabelos Tingidos Amend 180G',
      'Mascara Brilho Com Vitamina E Amend 500G'
    ],
    faturamentoTotal: 5200
  },
  {
    id: 'cli-04',
    nome: 'Boutique Safira Beleza - Cariacica',
    cnpj: '45.678.901/0001-23',
    cidade: 'Cariacica',
    endereco: 'Av. Expedito Garcia, 350 - Campo Grande, Cariacica - ES',
    telefone: '(27) 3343-4444',
    produtosComprados: [
      'Reparador De Pontas Amend 60Mi',
      'Filtro Solar Cabelos Tingidos Amend 180G',
      'Mascara Brilho Com Vitamina E Amend 500G',
      'Mascara Revitalizante D\'Pantenol Amend 500G',
      'Mascara Matizadora Amend Peal Blonde 250G'
    ],
    faturamentoTotal: 18900
  }
];

const initialProdutos = [
  {
    id: 'prod-01',
    nome: 'Reparador De Pontas Amend 60Mi',
    sku: '103-1',
    ean: '7896852626788',
    precoSugerido: 43.89,
    categoria: 'Finalizadores'
  },
  {
    id: 'prod-02',
    nome: 'Filtro Solar Cabelos Tingidos Amend 180G',
    sku: '108-1',
    ean: '7896852610114',
    precoSugerido: 26.99,
    categoria: 'Tratamento'
  },
  {
    id: 'prod-03',
    nome: 'Mascara Brilho Com Vitamina E Amend 500G',
    sku: '603-1',
    ean: '7896852610770',
    precoSugerido: 31.15,
    categoria: 'Máscaras'
  },
  {
    id: 'prod-04',
    nome: 'Mascara Revitalizante D\'Pantenol Amend 500G',
    sku: '605-1',
    ean: '7896852610756',
    precoSugerido: 32.05,
    categoria: 'Máscaras'
  },
  {
    id: 'prod-05',
    nome: 'Mascara Matizadora Amend Peal Blonde 250G',
    sku: '1272-1',
    ean: '7896852619438',
    precoSugerido: 42.99,
    categoria: 'Matizadores'
  }
];

const initialPedidos = [
  {
    id: 'ped-01',
    numero: '9832',
    clienteId: 'cli-01',
    clienteNome: 'FarmaVida - Centro',
    data: '2026-07-18',
    valor: 2450.00,
    status: 'Faturado',
    itens: [
      { produtoNome: 'Reparador De Pontas Amend 60Mi', qtd: 30, preco: 43.89 },
      { produtoNome: 'Mascara Brilho Com Vitamina E Amend 500G', qtd: 20, preco: 31.15 }
    ]
  },
  {
    id: 'ped-02',
    numero: '9754',
    clienteId: 'cli-02',
    clienteNome: 'Shopping dos Cosméticos - Vila Velha',
    data: '2026-07-12',
    valor: 1820.00,
    status: 'Atendido',
    itens: [
      { produtoNome: 'Mascara Matizadora Amend Peal Blonde 250G', qtd: 25, preco: 42.99 },
      { produtoNome: 'Reparador De Pontas Amend 60Mi', qtd: 15, preco: 43.89 }
    ]
  },
  {
    id: 'ped-03',
    numero: '9621',
    clienteId: 'cli-04',
    clienteNome: 'Boutique Safira Beleza - Cariacica',
    data: '2026-07-05',
    valor: 3120.00,
    status: 'Faturado',
    itens: [
      { produtoNome: 'Filtro Solar Cabelos Tingidos Amend 180G', qtd: 50, preco: 26.99 },
      { produtoNome: 'Mascara Revitalizante D\'Pantenol Amend 500G', qtd: 30, preco: 32.05 }
    ]
  }
];

const initialVisitas = [
  {
    id: 'vis-01',
    promotoraId: 'prom-01',
    promotoraNome: 'Jaqueline Vechi',
    clienteId: 'cli-01',
    clienteNome: 'FarmaVida - Centro',
    data: '2026-07-21',
    status: 'concluida',
    entrada: '2026-07-21T08:00:00Z',
    saida: '2026-07-21T09:30:00Z',
    gpsEntrada: { lat: -20.3155, lng: -40.3121, accuracy: 12 },
    gpsSaida: { lat: -20.3156, lng: -40.3123, accuracy: 15 },
    fotoDisplay: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400',
    fotoFachada: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=400',
    comentarios: 'Abastecimento realizado de ampolas e kit Specialist Blonde. Gôndola limpa e organizada. Realce acobreado e matizador em destaque na ponta de gôndola.',
    pecasVendidas: 4,
    auditoriaGondola: [
      { produtoId: 'prod-01', sku: '103-1', nome: 'Reparador De Pontas Amend 60Mi', temEstoque: true, noDisplay: true, precoPraticado: 43.89, qtdGondola: 15 },
      { produtoId: 'prod-02', sku: '108-1', nome: 'Filtro Solar Cabelos Tingidos Amend 180G', temEstoque: true, noDisplay: true, precoPraticado: 26.99, qtdGondola: 8 },
      { produtoId: 'prod-03', sku: '603-1', nome: 'Mascara Brilho Com Vitamina E Amend 500G', temEstoque: true, noDisplay: true, precoPraticado: 31.15, qtdGondola: 4 }
    ],
    produtosVencer: [
      { produtoNome: 'Reparador De Pontas Amend 60Mi', qtd: 3, vencimento: '2026-12-15' }
    ],
    analiseConcorrencia: [
      { marca: 'L\'Oréal Professionnel / Wella', precoConcorrente: 148.00, observacoes: 'Marca concorrente saindo a R$ 148,00 na mesma prateleira.' }
    ]
  }
];

const initialEscalas = [
  {
    id: 'esc-01',
    promotoraId: 'prom-01',
    promotoraNome: 'Jaqueline Vechi',
    clienteId: 'cli-01',
    clienteNome: 'FarmaVida - Centro',
    data: '2026-07-21',
    horaInicio: '08:00',
    horaFim: '12:00',
    observacoes: 'Abastecimento, foco em matizadores'
  },
  {
    id: 'esc-02',
    promotoraId: 'prom-01',
    promotoraNome: 'Jaqueline Vechi',
    clienteId: 'cli-02',
    clienteNome: 'Shopping dos Cosméticos - Vila Velha',
    data: '2026-07-22',
    horaInicio: '09:00',
    horaFim: '13:00',
    observacoes: 'Auditoria de pontas de gôndola e novas compras'
  },
  {
    id: 'esc-03',
    promotoraId: 'prom-02',
    promotoraNome: 'Daniela Alves de Almeida',
    clienteId: 'cli-03',
    clienteNome: 'Fórmula & Cia - Serra',
    data: '2026-07-21',
    horaInicio: '08:00',
    horaFim: '12:00',
    observacoes: 'Verificação de produtos próximos ao vencimento'
  }
];

const initialAtestados = [] as any[];

const initialBlingConfig = {
  apiKey: 'api_bling_v3_demo_key_7812634',
  clientId: 'client_safira_90234',
  clientSecret: 'secret_safira_90234',
  statusConexao: 'Conectado',
  ultimoSincronismo: '2026-07-21T07:45:00Z',
  webhookAtivo: true,
  aliasServidor: 'Safira Portal Comercial'
};

const defaultStore = {
  promotoras: initialPromotoras,
  clientes: initialClientes,
  produtos: initialProdutos,
  pedidos: initialPedidos,
  visitas: initialVisitas,
  escalas: initialEscalas,
  atestados: initialAtestados,
  blingConfig: initialBlingConfig
};

// Firestore Data Sync Helpers
async function syncCollectionToFirestore(collectionName: string, items: any[]) {
  if (!db) return;
  try {
    for (const item of items) {
      if (item.id) {
        await setDoc(doc(db, collectionName, String(item.id)), item, { merge: true });
      }
    }
  } catch (e) {
    console.error(`Error syncing ${collectionName} to Firestore:`, e);
  }
}

async function syncAllToFirestore(data: typeof defaultStore) {
  if (!db) return;
  try {
    await syncCollectionToFirestore('promotoras', data.promotoras || []);
    await syncCollectionToFirestore('clientes', data.clientes || []);
    await syncCollectionToFirestore('produtos', data.produtos || []);
    await syncCollectionToFirestore('pedidos', data.pedidos || []);
    await syncCollectionToFirestore('visitas', data.visitas || []);
    await syncCollectionToFirestore('escalas', data.escalas || []);
    await syncCollectionToFirestore('atestados', data.atestados || []);
    if (data.blingConfig) {
      await setDoc(doc(db, 'settings', 'bling'), data.blingConfig, { merge: true });
    }
    console.log("🔥 Dados sincronizados com sucesso no Cloud Firestore!");
  } catch (e) {
    console.error("Error syncing all collections to Firestore:", e);
  }
}

async function loadFromFirestore() {
  if (!db) return null;
  try {
    const loadCol = async (name: string) => {
      const snap = await getDocs(collection(db, name));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    };

    const promotoras = await loadCol('promotoras');
    const clientes = await loadCol('clientes');
    const produtos = await loadCol('produtos');
    const pedidos = await loadCol('pedidos');
    const visitas = await loadCol('visitas');
    const escalas = await loadCol('escalas');
    const atestados = await loadCol('atestados');
    
    const blingSnap = await getDoc(doc(db, 'settings', 'bling'));
    const blingConfig = blingSnap.exists() ? blingSnap.data() : defaultStore.blingConfig;

    if (promotoras.length === 0 && clientes.length === 0) {
      console.log("🔥 Firestore collections vazias. Semeando dados iniciais da Safira Cosméticos...");
      await syncAllToFirestore(defaultStore);
      return defaultStore;
    }

    return {
      promotoras: promotoras.length > 0 ? promotoras : defaultStore.promotoras,
      clientes: clientes.length > 0 ? clientes : defaultStore.clientes,
      produtos: produtos.length > 0 ? produtos : defaultStore.produtos,
      pedidos: pedidos.length > 0 ? pedidos : defaultStore.pedidos,
      visitas: visitas.length > 0 ? visitas : defaultStore.visitas,
      escalas: escalas.length > 0 ? escalas : defaultStore.escalas,
      atestados: atestados,
      blingConfig: blingConfig
    } as any;
  } catch (e) {
    console.error("Error loading data from Firestore:", e);
    return null;
  }
}

let inMemoryStore: typeof defaultStore = defaultStore;

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      inMemoryStore = JSON.parse(content);
      return inMemoryStore;
    } else {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultStore, null, 2), 'utf-8');
      inMemoryStore = defaultStore;
      return defaultStore;
    }
  } catch (e) {
    console.error("Error loading file data, using default", e);
    return defaultStore;
  }
}

function saveData(data: typeof defaultStore) {
  inMemoryStore = data;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error("Error saving file data", e);
  }
  // Sync to Cloud Firestore asynchronously
  syncAllToFirestore(data);
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    firebase: db ? 'connected' : 'disconnected',
    databaseId: firebaseConfig?.firestoreDatabaseId
  });
});

app.get('/api/firebase/status', (req, res) => {
  res.json({
    connected: !!db,
    projectId: firebaseConfig?.projectId || null,
    databaseId: firebaseConfig?.firestoreDatabaseId || null,
    status: db ? 'Online - Cloud Firestore Ativo' : 'Offline'
  });
});

// GET database state
app.get('/api/store', (req, res) => {
  const store = loadData();
  res.json(store);
});

// POST database state (full rewrite)
app.post('/api/store', (req, res) => {
  const data = req.body;
  saveData(data);
  res.json({ success: true, store: data });
});

// Promotoras routes
app.get('/api/promotoras', (req, res) => {
  const store = loadData();
  res.json(store.promotoras);
});

app.post('/api/promotoras', (req, res) => {
  const store = loadData();
  const newProm = {
    id: 'prom-' + Math.random().toString(36).substr(2, 9),
    ...req.body
  };
  store.promotoras.push(newProm);
  saveData(store);
  res.json(newProm);
});

app.delete('/api/promotoras/:id', (req, res) => {
  const store = loadData();
  store.promotoras = store.promotoras.filter((p: any) => p.id !== req.params.id);
  saveData(store);
  res.json({ success: true });
});

app.put('/api/promotoras/:id', (req, res) => {
  const store = loadData();
  const idx = store.promotoras.findIndex((p: any) => p.id === req.params.id);
  if (idx !== -1) {
    store.promotoras[idx] = { ...store.promotoras[idx], ...req.body };
    saveData(store);
    res.json(store.promotoras[idx]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Clients & Orders (Bling endpoints)
app.get('/api/bling/clients', (req, res) => {
  const store = loadData();
  res.json(store.clientes);
});

app.get('/api/bling/orders', (req, res) => {
  const store = loadData();
  res.json(store.pedidos);
});

app.get('/api/bling/products', (req, res) => {
  const store = loadData();
  res.json(store.produtos);
});

// Trigger a "Bling Sincronização"
app.post('/api/bling/sync', async (req, res) => {
  const store = loadData();
  
  // Update status and timestamp
  const nowIso = new Date().toISOString();
  store.blingConfig.ultimoSincronismo = nowIso;
  store.blingConfig.statusConexao = 'Conectado';
  
  let novosClientesCount = 0;
  let fetchedFromRealApi = false;

  // Try real Bling v3 or v2 API if API key is provided
  const apiKey = store.blingConfig?.apiKey;
  if (apiKey && apiKey.length > 5 && !apiKey.toLowerCase().includes('demo')) {
    try {
      // 1. Try Bling v3 API
      let response = await fetch('https://api.bling.com.br/v3/contatos?limite=100', {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
      });

      // 2. Fallback to Bling v2 API
      if (!response.ok) {
        response = await fetch(`https://bling.com.br/Api/v2/contatos/json/?apikey=${apiKey}`);
      }

      if (response.ok) {
        const json: any = await response.json();
        const contatos = json?.data || json?.retorno?.contatos || [];
        for (const raw of contatos) {
          const c = raw.contato || raw;
          const cnpj = c.numeroDocumento || c.cnpj || c.cpf_cnpj || '';
          const existing = store.clientes.find((cl: any) => 
            (cnpj && cl.cnpj === cnpj) || 
            (c.nome && cl.nome.toLowerCase() === c.nome.toLowerCase())
          );
          if (!existing) {
            store.clientes.push({
              id: 'cli-bling-' + (c.id || Math.random().toString(36).substr(2, 7)),
              nome: c.nome || 'Cliente Bling ERP',
              cnpj: cnpj || 'N/A',
              cidade: c.endereco?.geral?.municipio || c.cidade || 'Vitória - ES',
              endereco: `${c.endereco?.geral?.endereco || c.endereco || 'Av. Principal'}, ${c.endereco?.geral?.numero || c.numero || '100'}`,
              telefone: c.telefones?.principal || c.fone || '(27) 99999-0000',
              produtosComprados: ['Linha Amend Cosméticos', 'Linha Safira Profissional'],
              faturamentoTotal: Math.floor(Math.random() * 5000) + 1500
            });
            novosClientesCount++;
          }
        }
        if (contatos.length > 0) {
          fetchedFromRealApi = true;
        }
      }
    } catch (err) {
      console.warn("Bling real API sync error", err);
    }
  }

  saveData(store);
  
  res.json({
    success: true,
    message: fetchedFromRealApi 
      ? `Sincronização com o Bling realizada com sucesso! ${novosClientesCount} novo(s) cliente(s) importado(s) da API do Bling ERP.` 
      : `Sincronização executada. Para sincronizar em tempo real com o Bling ERP, certifique-se de configurar a Chave da API em Configurações > Bling. Você também pode cadastrar e editar seus clientes manualmente. Total de ${store.clientes.length} PDVs ativos.`,
    novosClientesCount,
    totalClientesCount: store.clientes.length,
    ultimoSincronismo: store.blingConfig.ultimoSincronismo,
    clientes: store.clientes,
    pedidos: store.pedidos,
    produtos: store.produtos
  });
});

// Save bling config
app.post('/api/bling/config', (req, res) => {
  const store = loadData();
  store.blingConfig = { ...store.blingConfig, ...req.body };
  saveData(store);
  res.json({ success: true, config: store.blingConfig });
});

// Visits (PDV auditing & check-ins)
app.get('/api/visitas', (req, res) => {
  const store = loadData();
  res.json(store.visitas);
});

app.post('/api/visitas', (req, res) => {
  const store = loadData();
  const newVisit = {
    id: 'vis-' + Math.random().toString(36).substr(2, 9),
    ...req.body
  };
  store.visitas.push(newVisit);
  saveData(store);
  res.json(newVisit);
});

app.put('/api/visitas/:id', (req, res) => {
  const store = loadData();
  const idx = store.visitas.findIndex((v: any) => v.id === req.params.id);
  if (idx !== -1) {
    store.visitas[idx] = { ...store.visitas[idx], ...req.body };
    saveData(store);
    res.json(store.visitas[idx]);
  } else {
    res.status(404).json({ error: 'Visit not found' });
  }
});

// Work schedules (Escala de Trabalho)
app.get('/api/escalas', (req, res) => {
  const store = loadData();
  res.json(store.escalas);
});

app.post('/api/escalas', (req, res) => {
  const store = loadData();
  const newEscala = {
    id: 'esc-' + Math.random().toString(36).substr(2, 9),
    ...req.body
  };
  store.escalas.push(newEscala);
  saveData(store);
  res.json(newEscala);
});

app.delete('/api/escalas/:id', (req, res) => {
  const store = loadData();
  store.escalas = store.escalas.filter((e: any) => e.id !== req.params.id);
  saveData(store);
  res.json({ success: true });
});

// Atestados
app.get('/api/atestados', (req, res) => {
  const store = loadData();
  res.json(store.atestados || []);
});

app.post('/api/atestados', (req, res) => {
  const store = loadData();
  const newAtestado = {
    id: 'atest-' + Math.random().toString(36).substr(2, 9),
    dataEnvio: new Date().toISOString(),
    ...req.body
  };
  if (!store.atestados) {
    store.atestados = [];
  }
  store.atestados.push(newAtestado);
  saveData(store);
  res.json(newAtestado);
});

app.delete('/api/atestados/:id', (req, res) => {
  const store = loadData();
  if (store.atestados) {
    store.atestados = store.atestados.filter((a: any) => a.id !== req.params.id);
    saveData(store);
  }
  res.json({ success: true });
});

// AI Assistant Chat Route (Safira Inteligência Artificial)
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  const systemInstruction = `
Você é a Assistente Safira Inteligência Artificial, especialista em políticas de fornecimento, regras, prazos e lançamentos da Safira Cosméticos e da marca de produtos Amend no Ponto de Venda (PDV).
Seu público são Promotoras de Vendas e Gestores que usam o portal de campo.

Regras e Diretrizes Importantes da Safira Cosméticos:
1. Prazos de Entrega: Na Grande Vitória, a entrega é de até 24 a 48 horas úteis após faturamento. Para o interior do estado do Espírito Santo, de 3 a 5 dias úteis.
2. Pedido Mínimo: O pedido mínimo para faturamento de representantes é de R$ 500,00 líquidos.
3. Produtos Próximos ao Vencimento: Promotoras devem relatar qualquer produto Amend ou Safira com menos de 6 meses de validade para que o PDV faça promoções ou ações de compre-e-ganhe. Nunca aceitar trocas por vencimento se o produto não foi reportado com antecedência.
4. Políticas de Avaria e Troca: Apenas serão aceitas trocas por avarias de fabricação (ex: válvulas quebradas, vazamento de fábrica) reportadas por fotos no check-in da promotora. Não efetuamos trocas de produtos vencidos sem relatório prévio ou de produtos danificados pelo manuseio inadequado do lojista.
5. Lançamentos Amend de Destaque: Linha "Amend Millenar Óleos de Madagascar" para hidratação intensa, Linha "Specialist Blonde" para matização de cabelos loiros e descoloridos, e a clássica linha de "Reparadores de Pontas Amend 60ml" que é líder de mercado no ES.
6. Check-in e Check-out: É obrigatório tirar as fotos da Fachada do PDV na entrada e fotos do Display de gôndola Amend/Safira antes e depois do abastecimento.

Sempre responda de maneira prestativa, profissional e em português brasileiro. Use listas e negritos para facilitar a leitura rápida pelas promotoras em trânsito no celular.
`;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    // Fallback response with excellent pre-baked corporate knowledge if no key is configured
    console.warn("GEMINI_API_KEY is not configured or is default. Using fallback corporate responses.");
    
    const msgLower = message.toLowerCase();
    let responseText = "Olá! Sou a Inteligência Artificial da Safira Cosméticos. Como a chave de API do Gemini não está configurada neste ambiente, vou te responder com as nossas diretrizes padrão de treinamento:\n\n";
    
    if (msgLower.includes('pedido') || msgLower.includes('mínimo') || msgLower.includes('minimo')) {
      responseText += "• **Pedido Mínimo:** O valor mínimo para faturamento é de **R$ 500,00 líquidos** para pedidos de representantes e faturamento via Bling.";
    } else if (msgLower.includes('prazo') || msgLower.includes('entrega') || msgLower.includes('tempo')) {
      responseText += "• **Prazos de Entrega:**\n  - **Grande Vitória:** de 24 a 48 horas úteis após o faturamento.\n  - **Interior do ES:** de 3 a 5 dias úteis.";
    } else if (msgLower.includes('venc') || msgLower.includes('validad') || msgLower.includes('vencer')) {
      responseText += "• **Produtos Próximos ao Vencimento:** Devem ser reportados nas auditorias com antecedência de **6 meses** para realizarmos ações de venda acelerada ou promoções compre-e-ganhe junto ao lojista. Não efetuamos trocas de produtos que venceram sem aviso prévio.";
    } else if (msgLower.includes('avaria') || msgLower.includes('troca') || msgLower.includes('quebrado')) {
      responseText += "• **Políticas de Troca e Avaria:** Somente trocaremos avarias de fabricação com comprovação fotográfica no app. Produtos danificados pelo lojista ou vencidos sem relatório prévio não são passíveis de troca.";
    } else if (msgLower.includes('lançamento') || msgLower.includes('novidade') || msgLower.includes('amend')) {
      responseText += "• **Principais Destaques:**\n  - **Linha Specialist Blonde:** Matização imediata e reconstrução dos fios loiros.\n  - **Millenar Óleos de Madagascar:** Hidratação profunda com ativos exóticos.\n  - **Reparadores de Pontas 60ml:** Nosso campeão de vendas absoluto para finalização capilar.";
    } else {
      responseText += "• **Atendimento Geral:** Para bater o ponto, utilize o botão de **Check-in** ao chegar ao PDV e certifique-se de habilitar o GPS e anexar as fotos solicitadas (fachada e gôndola). Para outras dúvidas, o time administrativo está no ramal 3300-4400.";
    }
    
    return res.json({ text: responseText });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash';

    // Format chat history for GoogleGenAI
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const h of history) {
        contents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text || "Sem resposta do assistente no momento." });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Erro ao processar consulta com Inteligência Artificial: " + error.message });
  }
});

// Setup Vite Dev Server / Static assets serving
async function startServer() {
  // Load data from Firestore if available
  if (db) {
    try {
      const fsData = await loadFromFirestore();
      if (fsData) {
        saveData(fsData);
        console.log("🔥 Banco de dados Cloud Firestore sincronizado na inicialização do servidor!");
      }
    } catch (e) {
      console.error("Erro ao sincronizar Firestore na inicialização:", e);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
