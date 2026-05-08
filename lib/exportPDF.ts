// lib/exportPDF.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Supprimer les accents pour jsPDF
function removeAccents(str: string): string {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Formater une valeur pour l'affichage
function formatValue(value: any, accessor: string): string {
  if (value === null || value === undefined) return "-";
  if (accessor === "due_date" || accessor === "date") {
    if (value) return new Date(value).toLocaleDateString('fr-FR');
    return "-";
  }
  if (accessor === "amount" && typeof value === "number") {
    return `${value.toLocaleString()} CFA`;
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return String(value);
}

// Configuration des couleurs
const COLORS = {
  primary: [212, 175, 55] as [number, number, number],   // Gold
  secondary: [30, 30, 35] as [number, number, number],   // Dark gray
  text: [15, 15, 20] as [number, number, number],        // Dark text for body
  textLight: [245, 245, 240] as [number, number, number], // Light text for headers
  textDark: [100, 100, 100] as [number, number, number]
};

export function exportToPDFStructured(
  title: string,
  data: any[],
  columns: { header: string; accessor: string }[],
  filename: string,
  subtitle?: string,
  summary?: { label: string; value: string }[]
) {
  if (!data || data.length === 0) {
    console.warn("⚠️ Aucune donnée à exporter");
    return;
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  
  // En-tête
  doc.setFillColor(10, 10, 11);
  doc.rect(0, 0, 210, 45, "F");
  
  doc.setFontSize(20);
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text(removeAccents(title), 20, 20);
  
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
    doc.text(removeAccents(subtitle), 20, 30);
  }
  
  doc.setFontSize(8);
  doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
  doc.text(`Exporte le ${new Date().toLocaleDateString('fr-FR')}`, 20, 40);
  
  doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.line(20, 45, 190, 45);
  
  let startY = 55;
  
  // Résumé
  if (summary && summary.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("RESUME", 20, startY);
    startY += 6;
    
    summary.forEach((item, idx) => {
      doc.setFontSize(9);
      doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
      doc.text(removeAccents(item.label), 25, startY + (idx * 5));
      doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      doc.text(removeAccents(item.value), 70, startY + (idx * 5));
    });
    
    startY += (summary.length * 5) + 10;
  }
  
  // Tableau
  const headers = columns.map(col => removeAccents(col.header));
  const rows = data.map(row => 
    columns.map(col => removeAccents(formatValue(row[col.accessor], col.accessor)))
  );
  
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: startY,
    theme: "striped",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [10, 10, 11],
      fontStyle: "bold",
      fontSize: 9,
      halign: "left"
    },
    bodyStyles: {
      textColor: COLORS.text,
      fontSize: 8,
      lineColor: COLORS.secondary,
      halign: "left"
    },
    alternateRowStyles: {
      fillColor: [40, 40, 45]
    },
    margin: { left: 20, right: 20 }
  });
  
  // Pied de page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
    doc.text(
      `SOVEREIGN - Page ${i}/${pageCount}`,
      20,
      doc.internal.pageSize.getHeight() - 10
    );
  }
  
  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// =====================================================
// FONCTIONS D'EXPORT SPÉCIFIQUES
// =====================================================

export function exportTasksToPDF(tasks: any[]) {
  const summary = [
    { label: "Total des taches", value: tasks.length.toString() },
    { label: "Taches terminees", value: tasks.filter(t => t.status === "done").length.toString() },
    { label: "Taches en cours", value: tasks.filter(t => t.status === "in_progress").length.toString() },
    { label: "Taches en retard", value: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length.toString() }
  ];
  
  exportToPDFStructured(
    "Rapport des taches",
    tasks,
    [
      { header: "Titre", accessor: "title" },
      { header: "Statut", accessor: "status" },
      { header: "Priorite", accessor: "priority" },
      { header: "Projet", accessor: "project" },
      { header: "Echeance", accessor: "due_date" }
    ],
    "taches",
    "Liste complete des taches",
    summary
  );
}

export function exportDocumentsToPDF(documents: any[]) {
  const summary = [
    { label: "Total des documents", value: documents.length.toString() },
    { label: "Brouillons", value: documents.filter(d => d.status === "draft").length.toString() },
    { label: "En relecture", value: documents.filter(d => d.status === "review").length.toString() },
    { label: "Approuves", value: documents.filter(d => d.status === "approved").length.toString() }
  ];
  
  exportToPDFStructured(
    "Rapport des documents",
    documents,
    [
      { header: "Nom", accessor: "name" },
      { header: "Type", accessor: "type" },
      { header: "Statut", accessor: "status" },
      { header: "Echeance", accessor: "due_date" }
    ],
    "documents",
    "Liste des documents et contrats",
    summary
  );
}

export function exportMissionsToPDF(missions: any[]) {
  const summary = [
    { label: "Total des missions", value: missions.length.toString() },
    { label: "Missions actives", value: missions.filter(m => m.status === "active").length.toString() },
    { label: "Missions terminees", value: missions.filter(m => m.status === "complete").length.toString() },
    { label: "Priorite haute", value: missions.filter(m => m.priority === "high" || m.priority === "critical").length.toString() }
  ];
  
  exportToPDFStructured(
    "Rapport des missions",
    missions,
    [
      { header: "Nom", accessor: "name" },
      { header: "Categorie", accessor: "category" },
      { header: "Statut", accessor: "status" },
      { header: "Priorite", accessor: "priority" },
      { header: "Echeance", accessor: "deadline" }
    ],
    "missions",
    "Liste des missions strategiques",
    summary
  );
}

export function exportWinsToPDF(wins: any[]) {
  const summary = [
    { label: "Total des victoires", value: wins.length.toString() }
  ];
  
  exportToPDFStructured(
    "Rapport des victoires",
    wins,
    [
      { header: "Victoire", accessor: "title" },
      { header: "Categorie", accessor: "category" },
      { header: "Date", accessor: "date" }
    ],
    "victoires",
    "Celebrons chaque succes !",
    summary
  );
}

export function exportFinancialToPDF(spending: any[], revenue: any[]) {
  const totalSpending = spending.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalRevenue = revenue.reduce((sum, r) => sum + (r.amount || 0), 0);
  const balance = totalRevenue - totalSpending;
  
  const summary = [
    { label: "Total revenus", value: `${totalRevenue.toLocaleString()} CFA` },
    { label: "Total depenses", value: `${totalSpending.toLocaleString()} CFA` },
    { label: "Solde", value: `${balance.toLocaleString()} CFA` }
  ];
  
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  
  // En-tête
  doc.setFillColor(10, 10, 11);
  doc.rect(0, 0, 210, 45, "F");
  doc.setFontSize(20);
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text("Rapport financier", 20, 20);
  doc.setFontSize(8);
  doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
  doc.text(`Exporte le ${new Date().toLocaleDateString('fr-FR')}`, 20, 40);
  doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.line(20, 45, 190, 45);
  
  let startY = 55;
  
  // Résumé
  doc.setFontSize(10);
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text("RESUME FINANCIER", 20, startY);
  startY += 6;
  
  summary.forEach((item, idx) => {
    doc.setFontSize(9);
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.text(removeAccents(item.label), 25, startY + (idx * 5));
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text(removeAccents(item.value), 70, startY + (idx * 5));
  });
  startY += 25;
  
  // Dépenses
  if (spending.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("DEPENSES", 20, startY);
    startY += 5;
    
    autoTable(doc, {
      head: [["Titre", "Montant", "Categorie", "Projet"]],
      body: spending.map(s => [
        removeAccents(s.title),
        `${s.amount?.toLocaleString()} CFA`,
        removeAccents(s.category || "-"),
        removeAccents(s.project || "-")
      ]),
      startY: startY,
      theme: "striped",
      headStyles: { fillColor: COLORS.primary, textColor: [10, 10, 11] },
      bodyStyles: { textColor: COLORS.text }
    });
    startY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Revenus
  if (revenue.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("REVENUS", 20, startY);
    startY += 5;
    
    autoTable(doc, {
      head: [["Source", "Montant", "Projet"]],
      body: revenue.map(r => [
        removeAccents(r.source),
        `${r.amount?.toLocaleString()} CFA`,
        removeAccents(r.project || "-")
      ]),
      startY: startY,
      theme: "striped",
      headStyles: { fillColor: COLORS.primary, textColor: [10, 10, 11] },
      bodyStyles: { textColor: COLORS.text }
    });
  }
  
  doc.save(`finances_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportFarmToPDF(infrastructure: any[], production: any[], spending: any[], team: any[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const totalSpent = spending.reduce((sum, s) => sum + (s.amount || 0), 0);
  
  // En-tête
  doc.setFillColor(10, 10, 11);
  doc.rect(0, 0, 210, 45, "F");
  doc.setFontSize(20);
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text("Rapport Ife Living Farm", 20, 20);
  doc.setFontSize(8);
  doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
  doc.text(`Exporte le ${new Date().toLocaleDateString('fr-FR')}`, 20, 40);
  doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.line(20, 45, 190, 45);
  
  let startY = 55;
  
  // Résumé
  doc.setFontSize(10);
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text("SYNTHESE", 20, startY);
  startY += 6;
  
  doc.setFontSize(9);
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(`Investissement total: ${totalSpent.toLocaleString()} CFA`, 25, startY);
  doc.text(`Productions actives: ${production.filter(p => p.status === "active").length}`, 25, startY + 6);
  doc.text(`Infrastructures: ${infrastructure.filter(i => i.status === "complete").length}/${infrastructure.length}`, 25, startY + 12);
  doc.text(`Equipe: ${team.length} membres`, 25, startY + 18);
  startY += 30;
  
  // Infrastructures
  if (infrastructure.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("INFRASTRUCTURES", 20, startY);
    startY += 5;
    
    autoTable(doc, {
      head: [["Nom", "Type", "Statut", "Localisation"]],
      body: infrastructure.map(i => [
        removeAccents(i.name),
        removeAccents(i.type || "-"),
        removeAccents(i.status || "-"),
        removeAccents(i.location_on_site || "-")
      ]),
      startY: startY,
      theme: "striped",
      headStyles: { fillColor: COLORS.primary, textColor: [10, 10, 11] },
      bodyStyles: { textColor: COLORS.text }
    });
    startY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Production
  if (production.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("UNITES DE PRODUCTION", 20, startY);
    startY += 5;
    
    autoTable(doc, {
      head: [["Nom", "Categorie", "Statut", "Capacite"]],
      body: production.map(p => [
        removeAccents(p.name),
        removeAccents(p.category || "-"),
        removeAccents(p.status || "-"),
        removeAccents(p.current_capacity || "-")
      ]),
      startY: startY,
      theme: "striped",
      headStyles: { fillColor: COLORS.primary, textColor: [10, 10, 11] },
      bodyStyles: { textColor: COLORS.text }
    });
    startY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Dépenses
  if (spending.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("DEPENSES", 20, startY);
    startY += 5;
    
    autoTable(doc, {
      head: [["Titre", "Montant", "Categorie", "Zone"]],
      body: spending.map(s => [
        removeAccents(s.title),
        `${s.amount?.toLocaleString()} CFA`,
        removeAccents(s.category || "-"),
        removeAccents(s.project_area || "-")
      ]),
      startY: startY,
      theme: "striped",
      headStyles: { fillColor: COLORS.primary, textColor: [10, 10, 11] },
      bodyStyles: { textColor: COLORS.text }
    });
    startY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Équipe
  if (team.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("EQUIPE", 20, startY);
    startY += 5;
    
    autoTable(doc, {
      head: [["Nom", "Role", "Zone", "Statut"]],
      body: team.map(t => [
        removeAccents(t.name),
        removeAccents(t.role || "-"),
        removeAccents(t.area || "-"),
        t.status === "active" ? "Actif" : t.status === "occasional" ? "Occasionnel" : "En attente"
      ]),
      startY: startY,
      theme: "striped",
      headStyles: { fillColor: COLORS.primary, textColor: [10, 10, 11] },
      bodyStyles: { textColor: COLORS.text }
    });
  }
  
  doc.save(`farm_${new Date().toISOString().split('T')[0]}.pdf`);
}

// =====================================================
// EXPORT GÉNÉRIQUE (pour compatibilité avec brief, content)
// =====================================================

export async function exportToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("❌ Élément non trouvé:", elementId);
    return;
  }

  try {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#0A0A0B",
      logging: false,
      useCORS: true
    });
    
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    
    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 10;
    
    pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
    heightLeft -= (pdf.internal.pageSize.getHeight() - 20);
    
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= (pdf.internal.pageSize.getHeight() - 20);
    }
    
    pdf.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error("❌ Erreur export PDF:", error);
  }
}
