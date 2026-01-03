import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { InjectionPoint } from "@/components/Face3DViewer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PatientData {
  name: string;
  age?: string | number | null;
  gender?: string;
  observations?: string;
}

interface DosageTotals {
  procerus: number;
  corrugator: number;
  frontalis?: number;
  orbicularis_oculi?: number;
  total: number;
}

interface ExportData {
  patient: PatientData;
  injectionPoints: InjectionPoint[];
  totalDosage: DosageTotals;
  clinicalNotes: string;
  confidence: number;
  photoUrl?: string | null;
  clinicName?: string;
  doctorName?: string;
  productName?: string;
  includeTCLE?: boolean;
}

const MUSCLE_LABELS: Record<string, string> = {
  procerus: "Prócero",
  corrugator_left: "Corrugador Esquerdo",
  corrugator_right: "Corrugador Direito",
  frontalis: "Frontal",
  orbicularis_oculi_left: "Orbicular Olho Esq.",
  orbicularis_oculi_right: "Orbicular Olho Dir.",
  nasalis: "Nasal",
  levator_labii: "Levantador do Lábio",
  zygomaticus_major: "Zigomático Maior",
  zygomaticus_minor: "Zigomático Menor",
  orbicularis_oris: "Orbicular da Boca",
  depressor_anguli: "Depressor do Ângulo",
  mentalis: "Mentual",
  masseter: "Masseter",
};

// TCLE content based on CFM Resolution 2.217/2018 and 1.974/2011
function generateTCLEPage(pdf: jsPDF, data: ExportData) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  
  pdf.addPage();
  let y = margin;

  const primaryColor: [number, number, number] = [184, 140, 80];
  const textColor: [number, number, number] = [40, 40, 40];

  // Header
  pdf.setFillColor(...primaryColor);
  pdf.rect(0, 0, pageWidth, 20, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text("TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO", pageWidth / 2, 13, { align: "center" });
  
  y = 30;

  pdf.setTextColor(...textColor);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("APLICAÇÃO DE TOXINA BOTULÍNICA PARA FINS ESTÉTICOS", pageWidth / 2, y, { align: "center" });
  y += 10;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  // Patient identification
  pdf.setFont("helvetica", "bold");
  pdf.text("IDENTIFICAÇÃO DO PACIENTE:", margin, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.text(`Nome: ${data.patient.name}`, margin, y);
  y += 5;
  if (data.patient.age) {
    pdf.text(`Idade: ${data.patient.age} anos`, margin, y);
    y += 5;
  }
  pdf.text(`Data: ${format(new Date(), "dd/MM/yyyy")}`, margin, y);
  y += 10;

  // TCLE Text based on CFM guidelines
  const tcleContent = [
    "Declaro, para os devidos fins, que:",
    "",
    "1. Fui informado(a) de que a toxina botulínica é uma substância que age nos músculos, provocando relaxamento temporário da musculatura tratada, com objetivo de suavizar linhas de expressão e rugas dinâmicas.",
    "",
    "2. Compreendi que o procedimento consiste na aplicação de pequenas quantidades de toxina botulínica através de agulhas finas em pontos específicos da face, conforme planejamento individualizado.",
    "",
    "3. Fui esclarecido(a) sobre os possíveis efeitos colaterais, que podem incluir:",
    "   • Dor, vermelhidão ou edema no local da aplicação (temporários)",
    "   • Hematomas (equimoses) nos pontos de aplicação",
    "   • Cefaleia (dor de cabeça) nas primeiras 24-48 horas",
    "   • Ptose palpebral (queda temporária da pálpebra) - raro",
    "   • Assimetria facial temporária",
    "   • Resultados insatisfatórios que podem necessitar de retoques",
    "",
    "4. Entendo que o efeito da toxina botulínica é TEMPORÁRIO, com duração média de 3 a 6 meses, podendo variar conforme características individuais, e que serão necessárias novas aplicações para manutenção dos resultados.",
    "",
    "5. Fui orientado(a) sobre os cuidados pós-procedimento:",
    "   • Não deitar nas primeiras 4 horas após a aplicação",
    "   • Evitar manipular a região tratada por 24 horas",
    "   • Evitar exercícios físicos intensos por 24 horas",
    "   • Não realizar procedimentos faciais por 7 dias",
    "",
    "6. Informei ao médico sobre todas as condições de saúde, medicamentos em uso, alergias conhecidas, gestação ou amamentação, e doenças neuromusculares.",
    "",
    "7. Estou ciente de que este procedimento é realizado em conformidade com as Resoluções CFM nº 2.217/2018 (Código de Ética Médica) e nº 1.974/2011 (publicidade médica).",
  ];

  tcleContent.forEach((line) => {
    if (y > pageHeight - 50) {
      pdf.addPage();
      y = margin;
    }
    
    const splitLine = pdf.splitTextToSize(line, contentWidth);
    pdf.text(splitLine, margin, y);
    y += splitLine.length * 4;
  });

  y += 5;

  // Product information
  if (data.productName) {
    pdf.setFont("helvetica", "bold");
    pdf.text("PRODUTO UTILIZADO:", margin, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.text(data.productName, margin, y);
    y += 8;
  }

  // Dosage summary
  pdf.setFont("helvetica", "bold");
  pdf.text("DOSAGEM TOTAL APLICADA:", margin, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.text(`${data.totalDosage.total} Unidades`, margin, y);
  y += 15;

  // Consent declaration
  if (y > pageHeight - 60) {
    pdf.addPage();
    y = margin;
  }

  pdf.setFont("helvetica", "bold");
  pdf.text("DECLARAÇÃO DE CONSENTIMENTO:", margin, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  
  const declaration = "Declaro que li, compreendi e concordo com todas as informações contidas neste documento. Tive a oportunidade de esclarecer minhas dúvidas e autorizo a realização do procedimento descrito acima de forma livre e esclarecida.";
  const splitDeclaration = pdf.splitTextToSize(declaration, contentWidth);
  pdf.text(splitDeclaration, margin, y);
  y += splitDeclaration.length * 4 + 15;

  // Signature lines
  const signatureY = Math.min(y + 10, pageHeight - 45);
  
  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.3);

  // Patient signature
  pdf.line(margin, signatureY, margin + 70, signatureY);
  pdf.setFontSize(8);
  pdf.text("Assinatura do Paciente", margin, signatureY + 5);
  pdf.text(`Nome: ${data.patient.name}`, margin, signatureY + 10);

  // Doctor signature
  pdf.line(pageWidth - margin - 70, signatureY, pageWidth - margin, signatureY);
  pdf.text("Assinatura do Médico", pageWidth - margin - 70, signatureY + 5);
  if (data.doctorName) {
    pdf.text(`Dr(a). ${data.doctorName}`, pageWidth - margin - 70, signatureY + 10);
  }

  // Footer
  const footerY = pageHeight - 10;
  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text("Documento gerado eletronicamente por NeuroAesthetics em conformidade com as resoluções do CFM.", pageWidth / 2, footerY, { align: "center" });
}

export async function exportAnalysisPdf(data: ExportData): Promise<void> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Cores do tema
  const primaryColor: [number, number, number] = [184, 140, 80];
  const textColor: [number, number, number] = [60, 55, 50];
  const mutedColor: [number, number, number] = [120, 115, 110];

  // Header com branding
  pdf.setFillColor(...primaryColor);
  pdf.rect(0, 0, pageWidth, 25, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(255, 255, 255);
  pdf.text("NeuroAesthetics", margin, 15);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("Análise de Toxina Botulínica", margin, 21);

  // Data no canto direito
  pdf.setFontSize(9);
  const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  pdf.text(dateStr, pageWidth - margin - pdf.getTextWidth(dateStr), 15);

  y = 35;

  // Informações do Paciente
  pdf.setTextColor(...textColor);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Dados do Paciente", margin, y);
  y += 7;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Nome: ${data.patient.name}`, margin, y);
  y += 5;

  if (data.patient.age) {
    pdf.text(`Idade: ${data.patient.age} anos`, margin, y);
    y += 5;
  }

  if (data.patient.gender) {
    pdf.text(`Sexo: ${data.patient.gender === 'masculino' ? 'Masculino' : 'Feminino'}`, margin, y);
    y += 5;
  }

  if (data.productName) {
    pdf.text(`Produto: ${data.productName}`, margin, y);
    y += 5;
  }

  if (data.patient.observations) {
    pdf.text(`Observações: ${data.patient.observations}`, margin, y);
    y += 5;
  }

  // Linha divisória
  y += 3;
  pdf.setDrawColor(...primaryColor);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Resumo de Dosagem
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Resumo de Dosagem", margin, y);
  y += 8;

  // Caixas de dosagem
  const boxWidth = (contentWidth - 10) / 3;
  const boxHeight = 18;

  // Prócero
  pdf.setFillColor(255, 243, 224);
  pdf.roundedRect(margin, y, boxWidth, boxHeight, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(...primaryColor);
  pdf.text(`${data.totalDosage.procerus}U`, margin + boxWidth / 2, y + 10, { align: "center" });
  pdf.setFontSize(8);
  pdf.setTextColor(...mutedColor);
  pdf.text("Prócero", margin + boxWidth / 2, y + 15, { align: "center" });

  // Corrugadores
  pdf.setFillColor(237, 233, 254);
  pdf.roundedRect(margin + boxWidth + 5, y, boxWidth, boxHeight, 2, 2, "F");
  pdf.setTextColor(139, 92, 246);
  pdf.setFontSize(14);
  pdf.text(`${data.totalDosage.corrugator}U`, margin + boxWidth + 5 + boxWidth / 2, y + 10, { align: "center" });
  pdf.setFontSize(8);
  pdf.setTextColor(...mutedColor);
  pdf.text("Corrugadores", margin + boxWidth + 5 + boxWidth / 2, y + 15, { align: "center" });

  // Total
  pdf.setFillColor(...primaryColor);
  pdf.roundedRect(margin + (boxWidth + 5) * 2, y, boxWidth, boxHeight, 2, 2, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.text(`${data.totalDosage.total}U`, margin + (boxWidth + 5) * 2 + boxWidth / 2, y + 10, { align: "center" });
  pdf.setFontSize(8);
  pdf.text("TOTAL", margin + (boxWidth + 5) * 2 + boxWidth / 2, y + 15, { align: "center" });

  y += boxHeight + 10;

  // Pontos de Aplicação
  pdf.setTextColor(...textColor);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Pontos de Aplicação", margin, y);
  y += 7;

  // Tabela de pontos
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  const colWidths = [60, 35, 35, 50];
  pdf.text("Músculo", margin, y);
  pdf.text("Dosagem", margin + colWidths[0], y);
  pdf.text("Profundidade", margin + colWidths[0] + colWidths[1], y);
  pdf.text("Observação", margin + colWidths[0] + colWidths[1] + colWidths[2], y);
  y += 2;

  pdf.setDrawColor(...mutedColor);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 4;

  pdf.setFont("helvetica", "normal");
  data.injectionPoints.forEach((point) => {
    if (y > 270) {
      pdf.addPage();
      y = margin;
    }

    const muscleLabel = MUSCLE_LABELS[point.muscle] || point.muscle;
    const depthLabel = point.depth === "deep" ? "Profundo" : "Superficial";

    pdf.setTextColor(...textColor);
    pdf.text(muscleLabel, margin, y);
    pdf.text(`${point.dosage}U`, margin + colWidths[0], y);
    pdf.text(depthLabel, margin + colWidths[0] + colWidths[1], y);
    
    if (point.notes) {
      const truncatedNotes = point.notes.length > 30 ? point.notes.substring(0, 27) + "..." : point.notes;
      pdf.setTextColor(...mutedColor);
      pdf.text(truncatedNotes, margin + colWidths[0] + colWidths[1] + colWidths[2], y);
    }

    y += 5;
  });

  y += 5;

  // Observações Clínicas
  if (data.clinicalNotes) {
    if (y > 250) {
      pdf.addPage();
      y = margin;
    }

    pdf.setTextColor(...textColor);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Observações Clínicas", margin, y);
    y += 7;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const splitNotes = pdf.splitTextToSize(data.clinicalNotes, contentWidth);
    pdf.text(splitNotes, margin, y);
    y += splitNotes.length * 5 + 5;
  }

  // Confiança da IA
  pdf.setTextColor(...mutedColor);
  pdf.setFontSize(9);
  pdf.text(`Confiança da análise de IA: ${Math.round(data.confidence * 100)}%`, margin, y);

  // Footer
  const footerY = pdf.internal.pageSize.getHeight() - 10;
  pdf.setDrawColor(...primaryColor);
  pdf.setLineWidth(0.3);
  pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  pdf.setFontSize(8);
  pdf.setTextColor(...mutedColor);
  
  if (data.doctorName || data.clinicName) {
    const footerText = [data.doctorName, data.clinicName].filter(Boolean).join(" • ");
    pdf.text(footerText, margin, footerY);
  }

  pdf.text("Gerado por NeuroAesthetics", pageWidth - margin - pdf.getTextWidth("Gerado por NeuroAesthetics"), footerY);

  // Add TCLE page if requested (default true)
  if (data.includeTCLE !== false) {
    generateTCLEPage(pdf, data);
  }

  // Salvar PDF
  const fileName = `analise-${data.patient.name.replace(/\s+/g, "-").toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  pdf.save(fileName);
}

// Função para exportar elemento HTML como imagem no PDF (para o mapa 3D)
export async function exportWithMapPdf(
  data: ExportData,
  mapElement: HTMLElement
): Promise<void> {
  // Primeiro captura o mapa como imagem
  const canvas = await html2canvas(mapElement, {
    backgroundColor: "#ffffff",
    scale: 2,
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;

  // Header
  pdf.setFillColor(184, 140, 80);
  pdf.rect(0, 0, pageWidth, 20, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(255, 255, 255);
  pdf.text("NeuroAesthetics - Mapa de Aplicação", margin, 13);

  let y = 30;

  // Info do paciente
  pdf.setTextColor(60, 55, 50);
  pdf.setFontSize(11);
  pdf.text(`Paciente: ${data.patient.name}`, margin, y);
  y += 6;

  pdf.setFontSize(9);
  pdf.setTextColor(120, 115, 110);
  pdf.text(`Data: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, margin, y);
  y += 10;

  // Imagem do mapa
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const maxImgHeight = 120;
  const finalHeight = Math.min(imgHeight, maxImgHeight);

  pdf.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    margin,
    y,
    imgWidth,
    finalHeight
  );

  y += finalHeight + 10;

  // Exportar resto usando a função principal
  await exportAnalysisPdf(data);
}
