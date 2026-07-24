import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Atestado, Promotora } from '../types';

export interface ExportAtestadosPdfOptions {
  atestados: Atestado[];
  promotoras: Promotora[];
  mesAno?: string;
  dataInicio?: string;
  dataFim?: string;
  promotoraIdFiltro?: string;
  tipoFiltro?: string;
  solicitanteNome?: string;
}

export function generateAtestadosRHPdf(options: ExportAtestadosPdfOptions): jsPDF {
  const {
    atestados,
    promotoras,
    mesAno,
    dataInicio,
    dataFim,
    promotoraIdFiltro,
    tipoFiltro,
    solicitanteNome = 'Gestão RH Safira'
  } = options;

  // Filter list
  let filtered = [...atestados];

  if (promotoraIdFiltro) {
    filtered = filtered.filter(a => a.promotoraId === promotoraIdFiltro);
  }

  if (tipoFiltro && tipoFiltro !== 'TODOS') {
    filtered = filtered.filter(a => a.tipo === tipoFiltro);
  }

  if (mesAno) {
    filtered = filtered.filter(a => {
      if (!a.dataEnvio) return false;
      const dateStr = a.dataEnvio.substring(0, 7); // YYYY-MM
      return dateStr === mesAno;
    });
  } else if (dataInicio || dataFim) {
    filtered = filtered.filter(a => {
      if (!a.dataEnvio) return false;
      const dateStr = a.dataEnvio.substring(0, 10);
      if (dataInicio && dateStr < dataInicio) return false;
      if (dataFim && dateStr > dataFim) return false;
      return true;
    });
  }

  // Sort by date desc
  filtered.sort((a, b) => new Date(b.dataEnvio).getTime() - new Date(a.dataEnvio).getTime());

  // Metrics
  const totalDocs = filtered.length;
  const totalMedicos = filtered.filter(a => a.tipo === 'Médico').length;
  const totalJustificativas = filtered.filter(a => a.tipo === 'Justificativa').length;
  const totalRecibos = filtered.filter(a => a.tipo === 'Recibo').length;
  const totalOutros = filtered.filter(a => a.tipo === 'Outro').length;

  const uniquePromotoras = new Set(filtered.map(a => a.promotoraId)).size;

  // Create PDF Document (A4 portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Color Palette
  const primaryColor = [24, 24, 27]; // #18181B dark gray
  const accentColor = [217, 119, 6]; // #D97706 amber
  const lightBg = [248, 250, 252]; // #F8FAFC light gray
  const borderGray = [226, 232, 240];

  // --- Header Banner ---
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent Line
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Title text
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('SAFIRA COSMÉTICOS - DEPARTAMENTO DE RH', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(251, 191, 36); // Amber text
  doc.text('RELATÓRIO MENSAL DE ATESTADOS E JUSTIFICATIVAS MÉDICAS', 14, 19);

  // Date emission right aligned
  doc.setTextColor(203, 213, 225);
  doc.setFontSize(8);
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Gerado em: ${dateStr}`, pageWidth - 14, 12, { align: 'right' });
  doc.text(`Emissor: ${solicitanteNome}`, pageWidth - 14, 18, { align: 'right' });

  // --- Summary Box ---
  let startY = 36;

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(14, startY, pageWidth - 28, 26, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  
  const periodLabel = mesAno 
    ? `Mês de Referência: ${mesAno.split('-').reverse().join('/')}`
    : (dataInicio && dataFim ? `Período: ${dataInicio} a ${dataFim}` : 'Período: Todos os Registros');

  const promotoraText = promotoraIdFiltro 
    ? `Promotora: ${promotoras.find(p => p.id === promotoraIdFiltro)?.nome || 'Selecionada'}`
    : 'Promotoras: Todas da Equipe';

  doc.text(periodLabel, 18, startY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(promotoraText, 18, startY + 13);
  doc.text(`Tipo de Filtro: ${tipoFiltro || 'Todos os tipos'}`, 18, startY + 19);

  // Metrics Columns inside Box
  const metricColX = 120;
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Documentos: ${totalDocs}`, metricColX, startY + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Atestados Médicos: ${totalMedicos}   |   Justificativas: ${totalJustificativas}`, metricColX, startY + 13);
  doc.text(`Recibos: ${totalRecibos}   |   Promotoras Envolvidas: ${uniquePromotoras}`, metricColX, startY + 19);

  // --- Table of Documents ---
  startY += 32;

  const tableRows = filtered.map((item, index) => {
    const dataFormatted = item.dataEnvio ? new Date(item.dataEnvio).toLocaleDateString('pt-BR') : '-';
    const horaFormatted = item.dataEnvio ? new Date(item.dataEnvio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    
    return [
      (index + 1).toString(),
      `${dataFormatted}\n${horaFormatted}`,
      item.promotoraNome || 'N/I',
      item.tipo || 'Outro',
      item.nomeArquivo || 'Arquivo',
      item.tamanhoArquivo || '-',
      item.observacoes || 'Sem observações'
    ];
  });

  autoTable(doc, {
    startY: startY,
    head: [['#', 'Data/Hora', 'Promotora', 'Tipo', 'Arquivo', 'Tam.', 'Observações / Motivo']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 22 },
      2: { cellWidth: 35, fontStyle: 'bold' },
      3: { cellWidth: 22 },
      4: { cellWidth: 35 },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 'auto' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14, bottom: 35 },
    didDrawPage: (data) => {
      // Footer page numbering
      const totalPages = (doc as any).internal.getNumberOfPages();
      const currentPage = data.pageNumber;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Portal de Promotoras Safira Cosméticos - Documento para uso exclusivo do RH`,
        14,
        doc.internal.pageSize.getHeight() - 10
      );
      doc.text(
        `Página ${currentPage} de ${totalPages}`,
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      );
    }
  });

  // --- Signatures Section on last page ---
  const finalY = (doc as any).lastAutoTable?.finalY || 150;
  const pageHeight = doc.internal.pageSize.getHeight();
  
  let signatureY = finalY + 25;
  // If signature exceeds page, add new page
  if (signatureY + 30 > pageHeight - 15) {
    doc.addPage();
    signatureY = 40;
  }

  doc.setLineWidth(0.3);
  doc.setDrawColor(148, 163, 184);

  // Left signature line
  doc.line(20, signatureY, 90, signatureY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Departamento de Recursos Humanos', 55, signatureY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Safira Cosméticos', 55, signatureY + 8, { align: 'center' });

  // Right signature line
  doc.line(120, signatureY, 190, signatureY);
  doc.setFont('helvetica', 'bold');
  doc.text('Gestão / Supervisão de Promotoras', 155, signatureY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Visto e Conferência', 155, signatureY + 8, { align: 'center' });

  return doc;
}
