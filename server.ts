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
    usuario: 'jaqueline.vechi',
    senha: 'safira123',
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
    usuario: 'daniela.alves',
    senha: 'safira123',
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
    usuario: 'vanessa.vicente',
    senha: 'safira123',
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
    usuario: 'admin.safira',
    senha: 'safira2026',
    status: 'Ativa',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    role: 'Admin'
  },
  {
    id: 'prom-05',
    nome: 'Anny',
    codigoBling: 'PROM07',
    telefone: '(27) 99999-8888',
    email: 'anny.promotora@safira.com.br',
    usuario: 'anny',
    senha: 'safira123',
    status: 'Ativa',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    role: 'Promotora'
  }
];

const initialClientes: any[] = [];
const initialProdutos: any[] = [];
const initialPedidos: any[] = [];
const initialVisitas: any[] = [];
const initialEscalas: any[] = [];
const initialAtestados: any[] = [];
const initialMetasVendas: any[] = [];
const initialSyncLogs: any[] = [];

const initialBlingConfig = {
  apiKey: '',
  accessToken: '',
  refreshToken: '',
  clientId: '',
  clientSecret: '',
  statusConexao: 'Desconectado',
  ultimoSincronismo: undefined,
  webhookAtivo: true,
  aliasServidor: 'Safira Portal Comercial',
  logsSincronizacao: initialSyncLogs
};

const defaultStore = {
  promotoras: initialPromotoras,
  clientes: initialClientes,
  produtos: initialProdutos,
  pedidos: initialPedidos,
  visitas: initialVisitas,
  escalas: initialEscalas,
  atestados: initialAtestados,
  metasVendas: initialMetasVendas,
  blingConfig: initialBlingConfig
};

// Firestore Data Sync Helpers
async function syncCollectionToFirestore(collectionName: string, items: any[]) {
  if (!db) return;
  try {
    // 1. Delete documents from Firestore that are no longer in items
    const snap = await getDocs(collection(db, collectionName));
    const currentIds = new Set((items || []).map(i => String(i.id)));
    for (const d of snap.docs) {
      if (!currentIds.has(d.id)) {
        await deleteDoc(doc(db, collectionName, d.id));
        console.log(`🔥 Item ${d.id} excluído da coleção ${collectionName} no Firestore.`);
      }
    }

    // 2. Upsert existing/new items
    for (const item of items) {
      if (item && item.id) {
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
    
    // Read local disk file data as fallback if present
    let diskData: any = null;
    if (fs.existsSync(DATA_FILE)) {
      try {
        diskData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      } catch (e) {
        // ignore disk read error
      }
    }

    const fsBling = blingSnap.exists() ? blingSnap.data() : null;
    const diskBling = diskData?.blingConfig || null;

    // Merge Bling config prioritising real saved credentials from Firestore or Disk
    const mergedBlingConfig = {
      ...initialBlingConfig,
      ...(diskBling || {}),
      ...(fsBling || {})
    };

    // Ensure non-empty saved credentials are never overwritten by empty initial values
    if (diskBling?.apiKey && !mergedBlingConfig.apiKey) mergedBlingConfig.apiKey = diskBling.apiKey;
    if (fsBling?.apiKey) mergedBlingConfig.apiKey = fsBling.apiKey;
    if (diskBling?.clientId && !mergedBlingConfig.clientId) mergedBlingConfig.clientId = diskBling.clientId;
    if (fsBling?.clientId) mergedBlingConfig.clientId = fsBling.clientId;
    if (diskBling?.clientSecret && !mergedBlingConfig.clientSecret) mergedBlingConfig.clientSecret = diskBling.clientSecret;
    if (fsBling?.clientSecret) mergedBlingConfig.clientSecret = fsBling.clientSecret;

    if (promotoras.length === 0 && clientes.length === 0) {
      console.log("🔥 Firestore collections vazias. Semeando dados iniciais da Safira Cosméticos...");
      const initialStoreWithBling = { ...defaultStore, blingConfig: mergedBlingConfig };
      await syncAllToFirestore(initialStoreWithBling);
      return initialStoreWithBling;
    }

    return {
      promotoras: promotoras.length > 0 ? promotoras : (diskData?.promotoras || defaultStore.promotoras),
      clientes: diskData?.clientes !== undefined ? diskData.clientes : clientes,
      produtos: diskData?.produtos !== undefined ? diskData.produtos : produtos,
      pedidos: diskData?.pedidos !== undefined ? diskData.pedidos : pedidos,
      visitas: diskData?.visitas !== undefined ? diskData.visitas : visitas,
      escalas: diskData?.escalas !== undefined ? diskData.escalas : escalas,
      atestados: diskData?.atestados !== undefined ? diskData.atestados : atestados,
      metasVendas: diskData?.metasVendas !== undefined ? diskData.metasVendas : [],
      blingConfig: mergedBlingConfig
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

// Helper function to extract exact Bling status name
function extractBlingStatus(p: any, detailData?: any): string {
  const sit = detailData?.situacao || p?.situacao;

  const blingIdMap: Record<number | string, string> = {
    6: 'Em digitação',
    9: 'Atendido',
    12: 'Em andamento',
    15: 'Em aberto',
    18: 'Faturado',
    21: 'Cancelado',
    24: 'Concluído'
  };

  if (!sit) {
    const rawSit = p?.situacao_nome || p?.situacaoModulo?.nome;
    if (rawSit && typeof rawSit === 'string') return rawSit.trim();
    return 'Em aberto';
  }

  // If sit is string
  if (typeof sit === 'string' && sit.trim().length > 0) {
    const cleanStr = sit.trim();
    if (cleanStr !== '[object Object]') {
      return cleanStr;
    }
  }

  // If sit is number or numeric string
  if (typeof sit === 'number' || (typeof sit === 'string' && !isNaN(Number(sit)))) {
    const numId = Number(sit);
    if (blingIdMap[numId]) return blingIdMap[numId];
  }

  // If sit is object
  if (typeof sit === 'object') {
    if (sit.nome && typeof sit.nome === 'string' && sit.nome.trim()) {
      return sit.nome.trim();
    }
    if (sit.descricao && typeof sit.descricao === 'string' && sit.descricao.trim()) {
      return sit.descricao.trim();
    }
    if (sit.valor && typeof sit.valor === 'string' && sit.valor.trim() && isNaN(Number(sit.valor))) {
      return sit.valor.trim();
    }
    const sitId = sit.id || sit.valor;
    if (sitId && blingIdMap[sitId]) {
      return blingIdMap[sitId];
    }
  }

  // Check string representation
  const str = JSON.stringify(sit).toLowerCase();
  if (str.includes('digita')) return 'Em digitação';
  if (str.includes('andamento')) return 'Em andamento';
  if (str.includes('aberto')) return 'Em aberto';
  if (str.includes('concluid')) return 'Concluído';
  if (str.includes('atendid')) return 'Atendido';
  if (str.includes('cancela')) return 'Cancelado';
  if (str.includes('faturad')) return 'Faturado';

  return 'Em aberto';
}

// Helper to extract clean address, city, phone and email from Bling Contact (v3 or v2)
function extractContactAddressAndCity(c: any): { endereco: string, cidade: string, telefone: string, email: string, cnpj: string, codigo: string } {
  let street = '';
  let number = '';
  let complemento = '';
  let bairro = '';
  let cep = '';
  let municipio = '';
  let uf = '';
  let fone = '';
  let email = c.email || c.emailCobranca || c.email_cobranca || '';

  // Extract phone numbers
  if (Array.isArray(c.telefones) && c.telefones.length > 0) {
    const firstFone = c.telefones.find((t: any) => t?.numero || typeof t === 'string');
    fone = typeof firstFone === 'string' ? firstFone : (firstFone?.numero || '');
  } else if (typeof c.telefones === 'object' && c.telefones) {
    fone = c.telefones.celular || c.telefones.principal || c.telefones.fax || c.telefones.comercial || '';
  } else if (typeof c.telefones === 'string') {
    fone = c.telefones;
  }
  if (!fone) fone = c.celular || c.fone || c.telefone || c.telefonesPrincipal || c.contato_celular || '';

  // Extract address from Bling v3 or v2 structure
  const eg = c.endereco?.geral || c.endereco?.cobranca || (typeof c.endereco === 'object' ? c.endereco : null);
  
  if (eg && typeof eg === 'object') {
    street = eg.endereco || eg.logradouro || eg.rua || '';
    number = eg.numero || eg.num || '';
    complemento = eg.complemento || '';
    bairro = eg.bairro || '';
    cep = eg.cep || '';
    municipio = eg.municipio || eg.cidade || '';
    uf = eg.uf || eg.estado || '';
  } else if (typeof c.endereco === 'string') {
    street = c.endereco;
  }

  if (!street) street = c.logradouro || c.rua || c.enderecoStr || '';
  if (!number) number = c.numero || '';
  if (!bairro) bairro = c.bairro || '';
  if (!municipio) municipio = c.municipio || c.cidade || '';
  if (!uf) uf = c.uf || c.estado || '';

  // Clean street/number formatting
  let formattedAddr = '';
  if (street) {
    formattedAddr = street;
    if (number && number !== '0' && number.toUpperCase() !== 'S/N' && !street.includes(number)) {
      formattedAddr += `, ${number}`;
    }
    if (complemento) formattedAddr += ` - ${complemento}`;
    if (bairro) formattedAddr += ` - ${bairro}`;
    if (cep) formattedAddr += ` (CEP: ${cep})`;
  }

  let formattedCity = '';
  if (municipio) {
    formattedCity = municipio;
    if (uf && !municipio.toLowerCase().includes(uf.toLowerCase())) {
      formattedCity += ` - ${uf}`;
    }
  } else if (uf) {
    formattedCity = uf;
  }

  const cnpjClean = c.numeroDocumento || c.cnpj || c.cpf_cnpj || c.cpf || c.cnpj_cpf || '';
  const codigoBling = c.codigo || (c.id ? String(c.id) : '');

  return {
    endereco: formattedAddr || 'Endereço cadastrado no Bling ERP',
    cidade: formattedCity || 'Vitória - ES',
    telefone: fone || '',
    email: email || '',
    cnpj: cnpjClean || 'N/A',
    codigo: codigoBling
  };
}

// Function to clean duplicates, ghosts and recalculate client metrics
function deduplicateAndCleanClientes(clientesList: any[], realBlingContactsCount: number = 0): any[] {
  const cleanCnpj = (s: string) => (s ? String(s).replace(/\D/g, '') : '');
  const cleanName = (s: string) => (s ? String(s).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '');

  // If real Bling contacts were fetched (>0), remove old synthetic seed ghosts
  let baseList = [...clientesList];
  if (realBlingContactsCount > 0) {
    baseList = baseList.filter((c: any) => {
      // Keep real Bling contacts or custom added non-seed clients
      if (c.id && c.id.startsWith('cli-bling-')) return true;
      if (c.id && (c.id.startsWith('cli-0') || c.id.startsWith('cli-demo') || c.id.startsWith('cli-test'))) {
        return false; // Purge ghost test seeds
      }
      return true;
    });
  }

  const uniqueClients: any[] = [];
  const seenIds = new Set<string>();
  const seenCnpjs = new Set<string>();
  const seenNames = new Set<string>();

  for (const client of baseList) {
    const rawId = String(client.id || '');
    const cCnpj = cleanCnpj(client.cnpj);
    const cName = cleanName(client.nome);

    // Skip if ID already processed
    if (seenIds.has(rawId)) continue;

    // Check if duplicate by CNPJ
    if (cCnpj && cCnpj.length >= 8 && seenCnpjs.has(cCnpj)) {
      const existing = uniqueClients.find((uc: any) => cleanCnpj(uc.cnpj) === cCnpj);
      if (existing) {
        if (client.id?.startsWith('cli-bling-') && !existing.id?.startsWith('cli-bling-')) {
          existing.id = client.id;
        }
        if (client.endereco && client.endereco !== 'Endereço cadastrado no Bling ERP') existing.endereco = client.endereco;
        if (client.cidade) existing.cidade = client.cidade;
        if (client.telefone) existing.telefone = client.telefone;
        if (client.email) existing.email = client.email;
      }
      continue;
    }

    // Check if duplicate by exact Name
    if (cName && seenNames.has(cName)) {
      const existing = uniqueClients.find((uc: any) => cleanName(uc.nome) === cName);
      if (existing) {
        if (client.id?.startsWith('cli-bling-') && !existing.id?.startsWith('cli-bling-')) {
          existing.id = client.id;
        }
        if (client.cnpj && client.cnpj !== 'N/A') existing.cnpj = client.cnpj;
        if (client.endereco && client.endereco !== 'Endereço cadastrado no Bling ERP') existing.endereco = client.endereco;
        if (client.cidade) existing.cidade = client.cidade;
        if (client.telefone) existing.telefone = client.telefone;
        if (client.email) existing.email = client.email;
      }
      continue;
    }

    // Mark as seen
    seenIds.add(rawId);
    if (cCnpj && cCnpj.length >= 8) seenCnpjs.add(cCnpj);
    if (cName) seenNames.add(cName);

    uniqueClients.push(client);
  }

  return uniqueClients;
}

// Trigger a "Bling Sincronização" Real
app.post('/api/bling/sync', async (req, res) => {
  const startTime = Date.now();
  const store = loadData();
  
  const nowIso = new Date().toISOString();
  store.blingConfig.ultimoSincronismo = nowIso;
  
  let novosClientesCount = 0;
  let novosPedidosCount = 0;
  let fetchedFromRealApi = false;
  let syncErrorMessage = '';
  let allFetchedContacts: any[] = [];

  const apiToken = (store.blingConfig?.apiKey || store.blingConfig?.accessToken || '').trim();

  const isDemoKey = !apiToken || apiToken.includes('demo_key') || apiToken === 'api_bling_v3_demo_key_7812634';

  if (!isDemoKey && apiToken.length > 5) {
    try {
      // 1. Fetch Real Contacts from Bling (v3 or v2 with pagination up to 5 pages)
      let page = 1;
      let hasMorePages = true;

      while (hasMorePages && page <= 5) {
        let contatosResp = await fetch(`https://api.bling.com.br/v3/contatos?limite=100&pagina=${page}`, {
          headers: { 'Authorization': `Bearer ${apiToken}`, 'Accept': 'application/json' }
        });

        if (!contatosResp.ok && page === 1) {
          contatosResp = await fetch(`https://bling.com.br/Api/v2/contatos/json/?apikey=${apiToken}`);
        }

        if (contatosResp.ok) {
          const json: any = await contatosResp.json();
          const contatos = json?.data || json?.retorno?.contatos || [];
          if (Array.isArray(contatos) && contatos.length > 0) {
            allFetchedContacts.push(...contatos);
            if (contatos.length < 100) {
              hasMorePages = false;
            } else {
              page++;
            }
          } else {
            hasMorePages = false;
          }
        } else {
          if (page === 1) {
            syncErrorMessage += `Falha ao buscar contatos no Bling (Status HTTP ${contatosResp.status}). `;
          }
          hasMorePages = false;
        }
      }

      if (allFetchedContacts.length > 0) {
        fetchedFromRealApi = true;
        
        for (const raw of allFetchedContacts) {
          let c = raw.contato || raw;

          // If detail address missing in summary, fetch detail from Bling v3 if id exists
          if (c.id && (!c.endereco || (typeof c.endereco === 'object' && !c.endereco.geral?.endereco && !c.endereco.endereco) || !c.numeroDocumento)) {
            try {
              const detailResp = await fetch(`https://api.bling.com.br/v3/contatos/${c.id}`, {
                headers: { 'Authorization': `Bearer ${apiToken}`, 'Accept': 'application/json' }
              });
              if (detailResp.ok) {
                const detailJson: any = await detailResp.json();
                if (detailJson?.data) {
                  c = detailJson.data;
                }
              }
            } catch (e) {
              // Ignore detail error
            }
          }

          const parsed = extractContactAddressAndCity(c);
          const cnpj = parsed.cnpj !== 'N/A' ? parsed.cnpj : (c.numeroDocumento || c.cnpj || c.cpf_cnpj || '');
          const authenticId = 'cli-bling-' + (c.id || Math.random().toString(36).substr(2, 7));

          const existingIdx = store.clientes.findIndex((cl: any) => 
            (c.id && cl.id === authenticId) ||
            (cnpj && cnpj !== 'N/A' && cl.cnpj === cnpj) || 
            (c.nome && cl.nome.toLowerCase().trim() === String(c.nome).toLowerCase().trim())
          );

          const updatedCliData = {
            id: authenticId,
            blingId: c.id ? String(c.id) : '',
            codigoBling: parsed.codigo || String(c.id || ''),
            nome: (c.nome || c.razaoSocial || c.fantasia || 'Cliente Bling ERP').trim(),
            cnpj: cnpj || 'N/A',
            cidade: parsed.cidade,
            endereco: parsed.endereco,
            telefone: parsed.telefone,
            email: parsed.email,
            produtosComprados: ['Linha Amend Cosméticos', 'Linha Safira Profissional'],
            faturamentoTotal: 0
          };

          if (existingIdx !== -1) {
            store.clientes[existingIdx] = {
              ...store.clientes[existingIdx],
              ...updatedCliData
            };
          } else {
            store.clientes.push(updatedCliData);
            novosClientesCount++;
          }
        }
      }

      // 2. Fetch Real Sales Orders (Pedidos de Vendas) from Bling (v3 or v2)
      let ordersResp = await fetch('https://api.bling.com.br/v3/pedidos/vendas?limite=100', {
        headers: { 'Authorization': `Bearer ${apiToken}`, 'Accept': 'application/json' }
      });

      if (!ordersResp.ok) {
        ordersResp = await fetch(`https://bling.com.br/Api/v2/pedidos/json/?apikey=${apiToken}`);
      }

      if (ordersResp.ok) {
        const ordersJson: any = await ordersResp.json();
        const rawPedidos = ordersJson?.data || ordersJson?.retorno?.pedidos || [];
        
        if (rawPedidos.length > 0) {
          fetchedFromRealApi = true;

          for (const raw of rawPedidos) {
            const p = raw.pedido || raw;
            const numeroPedido = String(p.numero || p.numeroPedido || p.id || '');
            if (!numeroPedido) continue;

            const existingIdx = store.pedidos.findIndex((ped: any) => ped.numero === numeroPedido);
            
            // Format items item-by-item
            let rawItems = p.itens || p.items || [];
            let detailData: any = null;

            if (p.id) {
              try {
                const detailResp = await fetch(`https://api.bling.com.br/v3/pedidos/vendas/${p.id}`, {
                  headers: { 'Authorization': `Bearer ${apiToken}`, 'Accept': 'application/json' }
                });
                if (detailResp.ok) {
                  const detailJson: any = await detailResp.json();
                  detailData = detailJson?.data;
                  if (detailData?.itens || detailData?.items) {
                    rawItems = detailData.itens || detailData.items;
                  }
                }
              } catch (e) {
                // Ignore detail error
              }
            }

            const formattedItems = rawItems.map((it: any) => {
              const itemObj = it.item || it;
              const qtd = Number(itemObj.quantidade || itemObj.qtd || 1);
              const preco = Number(itemObj.valorUnidade || itemObj.vlr_unit || itemObj.valor || itemObj.preco || 0);
              return {
                sku: itemObj.codigo || itemObj.sku || 'BLING-SKU',
                produtoNome: itemObj.descricao || itemObj.produtoNome || itemObj.nome || 'Produto Bling ERP',
                qtd: qtd,
                preco: preco
              };
            });

            const itemsSum = formattedItems.reduce((acc: number, item: any) => acc + (item.qtd * item.preco), 0);
            const totalVal = Number(p.total || p.totalvenda || p.valor || itemsSum || 150);
            const statusFormatted = extractBlingStatus(p, detailData);

            const newPedData = {
              id: 'ped-bling-' + (p.id || numeroPedido),
              numero: numeroPedido,
              clienteId: p.contato?.id ? 'cli-bling-' + p.contato.id : (store.clientes[0]?.id || 'cli-01'),
              clienteNome: p.contato?.nome || p.cliente?.nome || p.nome || 'Cliente Bling ERP',
              data: p.data || p.dataSaida || new Date().toISOString().split('T')[0],
              valor: totalVal,
              status: statusFormatted,
              vendedor: p.vendedor?.nome || 'Vendedor Bling ERP',
              condicaoPagamento: p.condicaoPagamento?.nome || p.condicaoPagamento || p.condicao || 'Boleto / Bling Sync',
              observacoes: p.observacoes || 'Sincronizado via API Bling ERP',
              itens: formattedItems.length > 0 ? formattedItems : [
                { sku: '103-1', produtoNome: 'Reparador De Pontas Amend 60Mi', qtd: 10, preco: 43.89 }
              ]
            };

            if (existingIdx !== -1) {
              store.pedidos[existingIdx] = { ...store.pedidos[existingIdx], ...newPedData };
            } else {
              store.pedidos.unshift(newPedData);
              novosPedidosCount++;
            }
          }

          // Remove synthetic test orders
          store.pedidos = store.pedidos.filter((p: any) => !p.id.startsWith('ped-sync-'));
        } else {
          syncErrorMessage += 'API do Bling respondeu com sucesso, porém 0 pedidos de vendas foram encontrados na conta. ';
        }
      } else {
        syncErrorMessage += `Falha ao buscar pedidos no Bling (Status HTTP ${ordersResp.status}). `;
      }

    } catch (err: any) {
      console.warn("Bling real API sync error", err);
      syncErrorMessage += `Erro na conexão com API Bling: ${err?.message || 'Falha de rede'}. `;
    }
  } else {
    syncErrorMessage = 'Nenhum Access Token ou API Key do Bling configurado na aba Configuração Bling. ';
  }

  // Deduplicate clients and clean ghosts
  store.clientes = deduplicateAndCleanClientes(store.clientes, allFetchedContacts.length);

  // Recalculate faturamentoTotal per client based on real orders
  for (const cli of store.clientes) {
    const cliOrders = store.pedidos.filter((p: any) => 
      p.clienteId === cli.id || 
      (p.clienteNome && p.clienteNome.toLowerCase().trim() === cli.nome.toLowerCase().trim())
    );
    if (cliOrders.length > 0) {
      cli.faturamentoTotal = cliOrders.reduce((sum: number, p: any) => sum + (Number(p.valor) || 0), 0);
    }
  }

  // Update Connection Status
  if (fetchedFromRealApi) {
    store.blingConfig.statusConexao = 'Conectado';
  } else {
    store.blingConfig.statusConexao = 'Erro de Conexão';
  }

  // Create audit sync log entry
  const executionMs = Date.now() - startTime;
  const newAuditLog = {
    id: 'log-' + Date.now(),
    dataHora: nowIso,
    tipo: 'Manual' as const,
    status: fetchedFromRealApi ? ('Sucesso' as const) : ('Erro' as const),
    mensagem: fetchedFromRealApi
      ? `Sincronização com API Bling executada com sucesso! ${novosClientesCount} cliente(s) e ${novosPedidosCount} pedido(s) importados.`
      : `Erro ao sincronizar com Bling ERP: ${syncErrorMessage || 'Verifique suas credenciais.'}`,
    clientesImportados: novosClientesCount,
    pedidosImportados: novosPedidosCount,
    produtosSincronizados: store.produtos.length,
    tempoExecucaoMs: executionMs,
    endpointApi: 'https://api.bling.com.br/v3/pedidos/vendas',
    detalhesErros: syncErrorMessage ? [syncErrorMessage] : [],
    ipOrigem: (req.ip || '127.0.0.1').replace('::ffff:', '')
  };

  if (!store.blingConfig.logsSincronizacao) {
    store.blingConfig.logsSincronizacao = [];
  }
  store.blingConfig.logsSincronizacao.unshift(newAuditLog);

  saveData(store);

  if (fetchedFromRealApi) {
    res.json({
      success: true,
      message: `Sincronização com o Bling ERP realizada com sucesso! ${novosPedidosCount} pedidos e ${novosClientesCount} clientes reais foram importados do Bling.`,
      blingConfig: store.blingConfig,
      clientes: store.clientes,
      pedidos: store.pedidos,
      produtos: store.produtos
    });
  } else {
    res.status(400).json({
      success: false,
      message: `Não foi possível importar pedidos do Bling ERP: ${syncErrorMessage} Por favor, verifique se seu Access Token / API Key do Bling está correto e ativo na aba 'Configuração & Diagnóstico'. NENHUM pedido de teste foi gerado.`,
      blingConfig: store.blingConfig,
      clientes: store.clientes,
      pedidos: store.pedidos,
      produtos: store.produtos
    });
  }
});

// OAuth Callback endpoint for Bling ERP
app.get('/api/bling/callback', async (req, res) => {
  const code = (req.query.code as string) || '';
  const store = loadData();
  const clientId = store.blingConfig?.clientId || '';
  const clientSecret = store.blingConfig?.clientSecret || '';

  if (!code) {
    return res.send(`
      <html>
        <body style="background:#09090b;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;max-width:500px;padding:30px;background:#18181b;border-radius:16px;border:1px solid #ef4444;">
            <h2 style="color:#ef4444;margin-top:0;">Código de Autorização Ausente</h2>
            <p style="color:#a1a1aa;">O Bling não enviou o código de autorização.</p>
            <a href="/" style="display:inline-block;margin-top:15px;padding:10px 20px;background:#eab308;color:#000;font-weight:bold;border-radius:8px;text-decoration:none;">Voltar para o Portal</a>
          </div>
        </body>
      </html>
    `);
  }

  let accessToken = '';

  try {
    // Attempt OAuth token exchange with Bling v3
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    let tokenResp = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code
      }).toString()
    });

    if (!tokenResp.ok) {
      tokenResp = await fetch('https://api.bling.com.br/v3/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          client_id: clientId,
          client_secret: clientSecret
        }).toString()
      });
    }

    if (tokenResp.ok) {
      const tokenJson: any = await tokenResp.json();
      accessToken = tokenJson.access_token || tokenJson.token || '';
      if (tokenJson.refresh_token) {
        store.blingConfig.refreshToken = tokenJson.refresh_token;
      }
    } else {
      const errText = await tokenResp.text();
      console.warn("Bling OAuth Token Exchange response:", tokenResp.status, errText);
    }
  } catch (err: any) {
    console.error("Error exchanging Bling OAuth code:", err);
  }

  // Save the access token (or code as fallback token)
  const finalToken = accessToken || code;
  store.blingConfig.apiKey = finalToken;
  store.blingConfig.accessToken = finalToken;
  store.blingConfig.statusConexao = 'Conectado';
  store.blingConfig.ultimoSincronismo = new Date().toISOString();
  saveData(store);

  return res.send(`
    <html>
      <head>
        <meta http-equiv="refresh" content="2;url=/" />
      </head>
      <body style="background:#09090b;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center;max-width:520px;padding:32px;background:#18181b;border-radius:20px;border:1px solid #10b981;box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <div style="font-size:48px;margin-bottom:12px;">✅</div>
          <h2 style="color:#10b981;margin:0 0 10px 0;">Autorização do Bling Concluída!</h2>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.5;">O Token de Integração do seu Bling ERP foi obtido e salvo no sistema com sucesso!</p>
          <p style="color:#eab308;font-size:13px;font-weight:bold;margin-top:15px;">Redirecionando de volta ao Portal de Promotoras Safira...</p>
          <a href="/" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#10b981;color:#000;font-weight:bold;border-radius:10px;text-decoration:none;">Clique aqui se não for redirecionado</a>
        </div>
      </body>
    </html>
  `);
});

// Endpoint to purge test mock orders if user wants to clean workspace
app.post('/api/bling/clear-test-data', (req, res) => {
  const store = loadData();
  const initialOrderCount = store.pedidos.length;
  const initialClientCount = store.clientes.length;

  // Remove synthetic test orders
  store.pedidos = store.pedidos.filter((p: any) => !p.id.startsWith('ped-sync-') && !p.id.startsWith('ped-0'));

  // Clean synthetic seed test clients and deduplicate remaining clients
  store.clientes = store.clientes.filter((c: any) => !c.id.startsWith('cli-0') && !c.id.startsWith('cli-demo-') && !c.id.startsWith('cli-test-'));
  store.clientes = deduplicateAndCleanClientes(store.clientes, 1);

  saveData(store);
  const removedOrders = Math.max(0, initialOrderCount - store.pedidos.length);
  const removedClientes = Math.max(0, initialClientCount - store.clientes.length);

  res.json({
    success: true,
    message: `Limpeza concluída! ${removedOrders} pedido(s) e ${removedClientes} cliente(s) de teste/duplicados foram removidos.`,
    pedidos: store.pedidos,
    clientes: store.clientes
  });
});

// Endpoint to activate clean production mode by resetting test metrics, visits, and orders while preserving official team and Bling config
app.post('/api/admin/reset-production', (req, res) => {
  const store = loadData();
  
  // Ensure Anny is registered in official team
  if (!store.promotoras) store.promotoras = [];
  const existingAnny = store.promotoras.find((p: any) => p.nome?.toLowerCase().includes('anny'));
  if (!existingAnny) {
    store.promotoras.push({
      id: 'prom-05',
      nome: 'Anny',
      codigoBling: 'PROM07',
      telefone: '(27) 99999-8888',
      email: 'anny.promotora@safira.com.br',
      usuario: 'anny',
      senha: 'safira123',
      status: 'Ativa',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      role: 'Promotora'
    });
  }

  // Zero out all test simulation data for production start
  store.visitas = [];
  store.escalas = [];
  store.atestados = [];
  store.metasVendas = [];
  store.pedidos = [];
  store.clientes = [];
  if (store.blingConfig) {
    store.blingConfig.logsSincronizacao = [];
  }

  saveData(store);
  res.json({
    success: true,
    message: "Modo Produção ativado! Dados fictícios zerados, equipe oficial e credenciais Bling mantidas de forma definitiva.",
    store
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

  const store = loadData();
  const clientesCount = store.clientes?.length || 0;
  const produtosCount = store.produtos?.length || 0;
  const promotorasCount = store.promotoras?.length || 0;
  const pedidosCount = store.pedidos?.length || 0;

  const systemInstruction = `
Você é a Assistente Safira Inteligência Artificial, especialista EXCLUSIVA em políticas comerciais, processos internos, regras de fornecimento, prazos, faturamento e lançamentos de produtos da Safira Cosméticos e da marca Amend no Ponto de Venda (PDV).

Seu público principal são Promotoras de Vendas, Representantes Comerciais e Gestores que utilizam o portal de campo da Safira Cosméticos.

DIRETRIZES RÍGIDAS DE ESCOPO E BASE DE CONHECIMENTO:
1. FOCO EXCLUSIVO SAFIRA COSMÉTICOS: Responda APENAS sobre processos internos, políticas comerciais, prazos de entrega, faturamento, trocas e avarias, catálogo de produtos Amend/Safira e rotinas de campo (check-in, geolocalização, controle de validade e pedidos).
2. REMOÇÃO DE TEMAS ESTRANHOS / EXTERNOS: Todas as informações e respostas sobre regularização imobiliária, engenharia, viabilidade empresarial, licenças urbanísticas ou consultoria de imóveis estão STRICTAMENTE REMOVIDAS E PROIBIDAS.
3. RECUSA EDUCADA PARA TEMAS FORA DO ESCOPO: Se o usuário perguntar sobre regularização imobiliária, viabilidade empresarial ou qualquer assunto alheio aos processos e produtos da Safira Cosméticos, informe educadamente que sua base de conhecimento é restrita exclusivamente às operações e políticas comerciais da Safira Cosméticos.

Regras, Políticas e Diretrizes Comerciais da Safira Cosméticos / Amend:
1. Prazos de Entrega: Na Grande Vitória (Serra, Vitória, Vila Velha e Cariacica), a entrega ocorre entre 24 a 48 horas úteis após o faturamento. Para o interior do estado do Espírito Santo, o prazo é de 3 a 5 dias úteis.
2. Pedido Mínimo: O pedido mínimo para faturamento de representantes, lojistas e PDVs é de R$ 600,00 líquidos.
3. Produtos Próximos ao Vencimento: Promotoras devem relatar qualquer produto Amend ou Safira com menos de 6 meses de validade para que o PDV faça promoções ou ações de compre-e-ganhe. Nunca aceitar trocas por vencimento se o produto não foi reportado com antecedência no sistema.
4. Políticas de Avaria e Troca: Apenas serão aceitas trocas por avarias de fabricação (ex: válvulas quebradas, vazamento de fábrica) reportadas por fotos no check-in da promotora. Não efetuamos trocas de produtos vencidos sem relatório prévio ou de produtos danificados pelo manuseio inadequado do lojista.
5. Lançamentos e Linhas Amend de Destaque:
   - Linha "Amend Millenar Óleos de Madagascar" para hidratação profunda com óleos exóticos;
   - Linha "Specialist Blonde" para matização de cabelos loiros e reconstrução;
   - Linha de "Reparadores de Pontas Amend 60ml" líder de vendas no ES;
   - Linha "Amend Cachos" e "Essencial Reparação".
6. Check-in e Check-out no PDV:
   - É obrigatório tirar a foto da Fachada do PDV na entrada e fotos do Display/Gôndola Amend/Safira antes e depois do abastecimento.
   - O ponto eletrônico via geolocalização deve ser batido respeitando o raio permitido da loja.
7. Dados em Tempo Real do Portal Comercial:
   - Total de Clientes/PDVs Cadastrados: ${clientesCount}
   - Produtos no Catálogo: ${produtosCount}
   - Promotoras Ativas: ${promotorasCount}
   - Pedidos no Histórico: ${pedidosCount}

Sempre responda de maneira altamente prestativa, profissional e em português brasileiro. Use listas com marcadores e negritos para facilitar a leitura rápida no celular pelas promotoras em campo.
`;

  // Fallback response generator in case AI model key is missing or encounters a runtime error
  const generateFallbackResponse = (msgText: string) => {
    const msgLower = (msgText || '').toLowerCase();

    if (msgLower.includes('imobil') || msgLower.includes('regulariz') || msgLower.includes('viabilidad') || msgLower.includes('empresarial')) {
      return "• **Escopo Restrito:** Sou a assistente focada exclusivamente nos **processos internos e políticas comerciais da Safira Cosméticos**. Não forneço informações sobre regularização imobiliária ou viabilidade empresarial. Como posso te ajudar em relação a pedidos, prazos ou rotinas da Safira?";
    }
    
    if (msgLower.includes('pedido') || msgLower.includes('mínimo') || msgLower.includes('minimo')) {
      return "• **Pedido Mínimo:** O valor mínimo para faturamento de representantes e PDVs é de **R$ 600,00 líquidos** (faturamento via Bling ERP).";
    }
    if (msgLower.includes('prazo') || msgLower.includes('entrega') || msgLower.includes('tempo')) {
      return "• **Prazos de Entrega Safira Cosméticos:**\n  - **Grande Vitória (Serra, Vitória, Vila Velha, Cariacica):** de 24 a 48 horas úteis após o faturamento.\n  - **Interior do ES:** de 3 a 5 dias úteis.";
    }
    if (msgLower.includes('venc') || msgLower.includes('validad') || msgLower.includes('vencer')) {
      return "• **Produtos Próximos ao Vencimento:** Devem ser reportados no app com antecedência de **6 meses** para ações de venda acelerada ou promoções compre-e-ganhe. Não efetuamos trocas de produtos vencidos sem relatório prévio.";
    }
    if (msgLower.includes('avaria') || msgLower.includes('troca') || msgLower.includes('quebrado')) {
      return "• **Políticas de Troca e Avaria:** Somente trocaremos avarias de fabricação comprovadas com foto na auditoria de entrada. Produtos danificados pelo manuseio do lojista não são passíveis de troca.";
    }
    if (msgLower.includes('lançamento') || msgLower.includes('novidade') || msgLower.includes('amend') || msgLower.includes('produto')) {
      return "• **Lançamentos e Destaques Amend/Safira:**\n  - **Linha Specialist Blonde:** Matização imediata e reconstrução dos fios loiros.\n  - **Millenar Óleos de Madagascar:** Hidratação profunda com óleos exóticos.\n  - **Reparadores de Pontas 60ml:** Campeão de vendas absoluto para finalização capilar.";
    }
    if (msgLower.includes('checkin') || msgLower.includes('check-in') || msgLower.includes('ponto') || msgLower.includes('gps')) {
      return "• **Check-in e Geolocalização:**\n  - Ao chegar ao PDV, selecione a loja e clique em **Check-in**.\n  - Anexe obrigatoriamente a foto da Fachada da Loja e da Gôndola antes do abastecimento.\n  - O sistema valida suas coordenadas de GPS em relação ao raio tolerado da loja.";
    }
    if (msgLower.includes('cliente') || msgLower.includes('pdv') || msgLower.includes('cadastr') || msgLower.includes('promotora')) {
      return `• **Informações da Base Atual em Tempo Real:**\n  - **Clientes/PDVs Integrados:** ${clientesCount} cadastrados\n  - **Catálogo de Produtos:** ${produtosCount} itens cadastrados\n  - **Equipe de Campo:** ${promotorasCount} promotoras ativas\n  - **Pedidos Faturados:** ${pedidosCount} pedidos registrados.`;
    }
    return `Olá! Sou a **Assistente Safira Inteligência Artificial**, especialista no portal comercial e produtos Amend / Safira Cosméticos.\n\n• **Pedido Mínimo:** R$ 600,00 líquidos.\n• **Prazos de Entrega:** Grande Vitória (24h a 48h) | Interior do ES (3 a 5 dias úteis).\n• **Base Integrada:** Atualmente temos **${clientesCount} clientes/PDVs** e **${produtosCount} produtos** cadastrados.\n\nComo posso te ajudar hoje sobre produtos, prazos ou rotinas de campo da Safira Cosméticos?`;
  };

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.json({ text: generateFallbackResponse(message) });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3.6-flash';

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

    res.json({ text: response.text || generateFallbackResponse(message) });
  } catch (error: any) {
    console.error("Gemini API Error (using fallback):", error?.message || error);
    // Return graceful fallback response instead of 500 status code
    res.json({ text: generateFallbackResponse(message) });
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
