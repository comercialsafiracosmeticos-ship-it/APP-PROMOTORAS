export interface Promotora {
  id: string;
  nome: string;
  codigoBling: string;
  telefone: string;
  email: string;
  status: 'Ativa' | 'Inativa';
  avatar?: string;
  role: 'Promotora' | 'Admin' | 'Representante';
}

export interface Cliente {
  id: string;
  nome: string;
  cnpj: string;
  cidade: string;
  endereco: string;
  telefone: string;
  contato?: string; // Pessoa de contato no PDV para a promotora procurar
  produtosComprados: string[]; // List of product names bought
  faturamentoTotal: number;
}

export interface PedidoItem {
  produtoNome: string;
  qtd: number;
  preco: number;
}

export interface Pedido {
  id: string;
  numero: string;
  clienteId: string;
  clienteNome: string;
  data: string;
  valor: number;
  status: 'Atendido' | 'Faturado' | 'Pendente' | 'Cancelado';
  itens: PedidoItem[];
}

export interface Produto {
  id: string;
  nome: string;
  sku: string;
  ean: string;
  precoSugerido: number;
  categoria: string;
}

export interface AuditoriaItem {
  produtoId: string;
  sku: string;
  nome: string;
  temEstoque: boolean;
  noDisplay: boolean;
  precoPraticado: number;
  qtdGondola: number;
}

export interface ProdutoVencer {
  id?: string;
  produtoNome: string;
  qtd: number;
  vencimento: string;
}

export interface AnaliseConcorrente {
  id?: string;
  marca: string;
  precoConcorrente: number;
  observacoes: string;
}

export interface Visita {
  id: string;
  promotoraId: string;
  promotoraNome: string;
  clienteId: string;
  clienteNome: string;
  data: string;
  status: 'agendada' | 'andamento' | 'concluida';
  entrada?: string; // ISO String
  saida?: string; // ISO String
  gpsEntrada?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  gpsSaida?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  fotoDisplay?: string; // Base64 or URL
  fotoFachada?: string; // Base64 or URL
  comentarios?: string;
  pecasVendidas?: number;
  auditoriaGondola?: AuditoriaItem[];
  produtosVencer?: ProdutoVencer[];
  analiseConcorrencia?: AnaliseConcorrente[];
  pontoEntradaManha?: string;
  pontoSaidaAlmoco?: string;
  pontoVoltaAlmoco?: string;
  pontoSaidaTarde?: string;
}

export interface Escala {
  id: string;
  promotoraId: string;
  promotoraNome: string;
  clienteId: string;
  clienteNome: string;
  data: string; // YYYY-MM-DD
  horaInicio: string; // HH:MM
  horaFim: string; // HH:MM
  observacoes?: string;
}

export interface Atestado {
  id: string;
  promotoraId: string;
  promotoraNome: string;
  dataEnvio: string; // ISO String
  tipo: string; // 'Médico' | 'Justificativa' | 'Recibo' | 'Outro'
  arquivoUrl: string; // Base64 or Mock URL
  nomeArquivo: string;
  tamanhoArquivo: string;
  observacoes?: string;
}

export interface BlingConfig {
  apiKey: string;
  clientId: string;
  clientSecret: string;
  statusConexao: 'Conectado' | 'Desconectado' | 'Erro';
  ultimoSincronismo?: string;
  webhookAtivo: boolean;
  aliasServidor: string;
}
