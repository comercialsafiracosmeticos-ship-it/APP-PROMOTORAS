import { useState } from 'react';
import { FileText, Download, Printer, X, Calendar, Filter, User, ShieldCheck, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { Atestado, Promotora } from '../types';
import { generateAtestadosRHPdf } from '../utils/atestadosPdfGenerator';

interface AtestadosRHExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  atestados: Atestado[];
  promotoras: Promotora[];
  activePromotora?: Promotora | null;
}

export default function AtestadosRHExportModal({
  isOpen,
  onClose,
  atestados,
  promotoras,
  activePromotora
}: AtestadosRHExportModalProps) {
  const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
  const [mesAno, setMesAno] = useState<string>(currentMonthStr);
  const [promotoraIdFiltro, setPromotoraIdFiltro] = useState<string>('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('TODOS');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  if (!isOpen) return null;

  const isAdmin = activePromotora?.role === 'Admin';

  // Filtered preview items
  const filteredItems = atestados.filter((item) => {
    if (promotoraIdFiltro && item.promotoraId !== promotoraIdFiltro) return false;
    if (tipoFiltro && tipoFiltro !== 'TODOS' && item.tipo !== tipoFiltro) return false;
    if (mesAno && item.dataEnvio) {
      if (item.dataEnvio.substring(0, 7) !== mesAno) return false;
    }
    return true;
  });

  const totalMedicos = filteredItems.filter(a => a.tipo === 'Médico').length;
  const totalJustificativas = filteredItems.filter(a => a.tipo === 'Justificativa').length;
  const totalRecibos = filteredItems.filter(a => a.tipo === 'Recibo').length;

  const handleDownloadPdf = () => {
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const pdf = generateAtestadosRHPdf({
          atestados,
          promotoras,
          mesAno,
          promotoraIdFiltro,
          tipoFiltro,
          solicitanteNome: activePromotora?.nome || 'RH Safira'
        });

        const filename = `relatorio-atestados-rh-${mesAno || 'geral'}.pdf`;
        pdf.save(filename);
      } catch (e) {
        console.error('Erro ao gerar PDF de atestados:', e);
        alert('Ocorreu um erro ao gerar o PDF. Verifique os dados e tente novamente.');
      } finally {
        setIsGenerating(false);
      }
    }, 150);
  };

  const handlePrintPreview = () => {
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const pdf = generateAtestadosRHPdf({
          atestados,
          promotoras,
          mesAno,
          promotoraIdFiltro,
          tipoFiltro,
          solicitanteNome: activePromotora?.nome || 'RH Safira'
        });

        const pdfBlobUrl = pdf.output('bloburl');
        window.open(pdfBlobUrl, '_blank');
      } catch (e) {
        console.error('Erro ao abrir visualização de impressão:', e);
      } finally {
        setIsGenerating(false);
      }
    }, 150);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Data Envio', 'Promotora', 'Tipo', 'Nome Arquivo', 'Tamanho', 'Observacoes'];
    const rows = filteredItems.map(item => [
      item.id,
      item.dataEnvio ? new Date(item.dataEnvio).toLocaleString('pt-BR') : '',
      `"${item.promotoraNome || ''}"`,
      `"${item.tipo || ''}"`,
      `"${item.nomeArquivo || ''}"`,
      `"${item.tamanhoArquivo || ''}"`,
      `"${(item.observacoes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio-atestados-rh-${mesAno || 'geral'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#18181B] border border-white/10 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
                Relatório Mensal de Atestados para o RH
                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded-full border border-amber-500/30">
                  Exportação PDF
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Gere e exporte relatórios consolidados de atestados médicos, recibos e justificativas para envio ao RH.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#222225] p-4 rounded-xl border border-white/5">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-400" />
              Mês / Ano de Referência
            </label>
            <input
              type="month"
              value={mesAno}
              onChange={(e) => setMesAno(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-[#161618] border border-white/10 text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <User className="w-3 h-3 text-amber-400" />
              Promotora
            </label>
            <select
              value={promotoraIdFiltro}
              onChange={(e) => setPromotoraIdFiltro(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-[#161618] border border-white/10 text-white focus:border-amber-500 focus:outline-none cursor-pointer"
            >
              <option value="">Todas as Promotoras</option>
              {promotoras.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.role || 'Promotora'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-amber-400" />
              Tipo de Documento
            </label>
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-[#161618] border border-white/10 text-white focus:border-amber-500 focus:outline-none cursor-pointer"
            >
              <option value="TODOS">Todos os Tipos</option>
              <option value="Médico">Atestado Médico / Licença</option>
              <option value="Justificativa">Justificativa de Falta/Atraso</option>
              <option value="Recibo">Recibo / Reembolso</option>
              <option value="Outro">Outros Documentos</option>
            </select>
          </div>
        </div>

        {/* Summary Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-[#222225] border border-white/5 p-3 rounded-xl">
            <span className="block text-[10px] font-bold text-gray-400 uppercase">Total Registros</span>
            <span className="text-lg font-black text-white">{filteredItems.length}</span>
          </div>
          <div className="bg-[#222225] border border-amber-500/20 p-3 rounded-xl">
            <span className="block text-[10px] font-bold text-amber-400 uppercase">Atestados Médicos</span>
            <span className="text-lg font-black text-amber-400">{totalMedicos}</span>
          </div>
          <div className="bg-[#222225] border border-white/5 p-3 rounded-xl">
            <span className="block text-[10px] font-bold text-gray-400 uppercase">Justificativas</span>
            <span className="text-lg font-black text-blue-400">{totalJustificativas}</span>
          </div>
          <div className="bg-[#222225] border border-white/5 p-3 rounded-xl">
            <span className="block text-[10px] font-bold text-gray-400 uppercase">Recibos</span>
            <span className="text-lg font-black text-emerald-400">{totalRecibos}</span>
          </div>
        </div>

        {/* Table Preview */}
        <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl bg-[#161618] custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs">
              Nenhum documento/atestado encontrado para os filtros selecionados.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#222225] border-b border-white/10 text-gray-400 font-bold uppercase text-[10px] sticky top-0 z-10">
                  <th className="p-3">Data Envio</th>
                  <th className="p-3">Promotora</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Arquivo</th>
                  <th className="p-3">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-mono text-[11px] whitespace-nowrap text-gray-400">
                      {item.dataEnvio ? new Date(item.dataEnvio).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="p-3 font-bold text-white">{item.promotoraNome}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        item.tipo === 'Médico'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}>
                        {item.tipo}
                      </span>
                    </td>
                    <td className="p-3 max-w-[140px] truncate text-gray-400 font-mono text-[11px]" title={item.nomeArquivo}>
                      {item.nomeArquivo}
                    </td>
                    <td className="p-3 text-gray-300 max-w-[200px] truncate" title={item.observacoes || ''}>
                      {item.observacoes || <span className="text-gray-600 italic">Sem obs</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Documento oficial formatado com padrão corporativo Safira Cosméticos.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredItems.length === 0}
              className="flex-1 sm:flex-initial bg-[#222225] hover:bg-white/10 disabled:opacity-40 text-gray-300 font-bold px-3.5 py-2 rounded-xl text-xs transition-all border border-white/10 cursor-pointer flex items-center justify-center gap-1.5"
              title="Exportar dados em formato de planilha CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPreview}
              disabled={filteredItems.length === 0 || isGenerating}
              className="flex-1 sm:flex-initial bg-[#222225] hover:bg-white/10 disabled:opacity-40 text-gray-300 font-bold px-3.5 py-2 rounded-xl text-xs transition-all border border-white/10 cursor-pointer flex items-center justify-center gap-1.5"
              title="Abrir prévia e impressão direta do PDF"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Imprimir / Prévia</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={filteredItems.length === 0 || isGenerating}
              className="flex-1 sm:flex-initial bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-gray-950 font-extrabold px-5 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Gerando PDF...' : 'Baixar Relatório PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
