// lib/exportPDF.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// =====================================================
// CONFIGURATION DES COULEURS (unifiée)
// =====================================================

const COLORS = {
  // Fond et arrière-plans
  background: [10, 10, 11] as [number, number, number],     // Midnight
  cardBg: [30, 30, 35] as [number, number, number],        // Dark gray
  altRowBg: [40, 40, 45] as [number, number, number],       // Slightly lighter
  
  // Texte
  textPrimary: [245, 245, 240] as [number, number, number], // Ivory
  textSecondary: [150, 150, 160] as [number, number, number], // Gray
  textMuted: [100, 100, 100] as [number, number, number],   // Dark gray
  
  // Accents (Sovereign Gold)
  gold: [212, 175, 55] as [number, number, number],
  goldDark: [180, 150, 40] as [number, number, number],
  
  // Alertes
  success: [16, 185, 129] as [number, number, number],      // Emerald
  warning: [245, 158, 11] as [number, number, number],      // Amber
  error: [239, 68, 68] as [number, number, number],         // Red
  info: [59, 130, 246] as [number, number, number],         // Blue
};

// =====================================================
// FONCTIONS UTILITAIRES
// =====================================================

function formatCellValue(value: any, accessor: string): string {
  if (value === null || value === undefined) return "-";
  if (accessor === "due_date" || accessor === "date") {
    if (value) {
      const date = new Date(value);
      if (isNaN(date.getTime())) return String(value);
      return date.toLocaleDateString('fr-FR');
    }
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

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  // Fond d'en-tête
  doc.setFillColor(COLORS.background[0], COLORS.background[1], COLORS.background[2]);
  doc.rect(0, 0, 210, 45, "F");
  
  // Titre principal
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  doc.text(title, 20, 20);
  
  // Sous-titre
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.textSecondary[0], COLORS.textSecondary[1], COLORS.textSecondary[2]);
    doc.text(subtitle, 20, 30);
  }
  
  // Date d'export
  doc.setFontSize(8);
  doc.setTextColor(COLORS.textMuted[0], COLORS.textMuted[1], COLORS.textMuted[2]);
  doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 20, 40);
  
  // Ligne de séparation gold
  doc.setDrawColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  doc.line(20, 45, 190, 45);
}

function addFooter(doc: jsPDF, title: string) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(COLORS.textMuted[0], COLORS.textMuted[1], COLORS.textMuted[2]);
    doc.text(
      `SOVEREIGN - ${title} - Page ${i}/${pageCount}`,
      20,
      doc.internal.pageSize.getHeight() - 10
    );
  }
}

// =====================================================
// EXPORT PRINCIPAL
// =====================================================

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
  addHeader(doc, title, subtitle);
  
  let startY = 55;
  
  // Résumé
  if (summary && summary.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
    doc.text("RÉSUMÉ", 20, startY);
    startY += 6;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    summary.forEach((item, idx) => {
      doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2]);
      doc.text(`${item.label}:`, 25, startY + (idx * 5));
      doc.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
      doc.text(item.value, 70, startY + (idx * 5));
    });
    
    startY += (summary.length * 5) + 10;
  }
  
  // Tableau
  const headers = columns.map(col => col.header);
  const rows = data.map(row => 
    columns.map(col => formatCellValue(row[col.accessor], col.accessor))
  );
  
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: startY,
    theme: "striped",
    headStyles: {
      fillColor: COLORS.gold,
      textColor: COLORS.background,
      fontStyle: "bold",
      fontSize: 9,
      halign: "left",
      valign: "middle"
    },
    bodyStyles: {
      textColor: COLORS.textPrimary,
      fontSize: 8,
      lineColor: COLORS.cardBg,
      halign: "left",
      valign: "middle"
    },
    alternateRowStyles: {
      fillColor: COLORS.altRowBg
    },
    margin: { left: 20, right: 20 }
  });
  
  // Pied de page
  addFooter(doc, title);
  
  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// =====================================================
// FONCTIONS D'EXPORT SPÉCIFIQUES
// =====================================================

export function exportTasksToPDF(tasks: any[]) {
  const summary = [
    { label: "Total des tâches", value: tasks.length.toString() },
    { label: "Tâches terminées", value: tasks.filter(t => t.status === "done").length.toString() },
    { label: "Tâches en cours", value: tasks.filter(t => t.status === "in_progress").length.toString() },
    { label: "Tâches en retard", value: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length.toString() }
  ];
  
  exportToPDFStructured(
    "Rapport des tâches",
    tasks,
    [
      { header: "Titre", accessor: "title" },
      { header: "Statut", accessor: "status" },
      { header: "Priorité", accessor: "priority" },
      { header: "Projet", accessor: "project" },
      { header: "Échéance", accessor: "due_date" }
    ],
    "taches",
    "Liste complète des tâches",
    summary
  );
}

export function exportDocumentsToPDF(documents: any[]) {
  const summary = [
    { label: "Total des documents", value: documents.length.toString() },
    { label: "Brouillons", value: documents.filter(d => d.status === "draft").length.toString() },
    { label: "En relecture", value: documents.filter(d => d.status === "review").length.toString() },
    { label: "Approuvés", value: documents.filter(d => d.status === "approved").length.toString() }
  ];
  
  exportToPDFStructured(
    "Rapport des documents",
    documents,
    [
      { header: "Nom", accessor: "name" },
      { header: "Type", accessor: "type" },
      { header: "Statut", accessor: "status" },
      { header: "Échéance", accessor: "due_date" }
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
    { label: "Missions terminées", value: missions.filter(m => m.status === "complete").length.toString() },
    { label: "Priorité haute", value: missions.filter(m => m.priority === "high" || m.priority === "critical").length.toString() }
  ];
  
  exportToPDFStructured(
    "Rapport des missions",
    missions,
    [
      { header: "Nom", accessor: "name" },
      { header: "Catégorie", accessor: "category" },
      { header: "Statut", accessor: "status" },
      { header: "Priorité", accessor: "priority" },
      { header: "Échéance", accessor: "deadline" }
    ],
    "missions",
    "Liste des missions stratégiques",
    summary
  );
}

export function exportWinsToPDF(wins: any[]) {
  const summary = [
    { label: "Total des victoires", value: wins.length.toString() },
    { label: "Cette semaine", value: wins.filter(w => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(w.date) >= weekAgo;
    }).length.toString() }
  ];
  
  exportToPDFStructured(
    "Rapport des victoires",
    wins,
    [
      { header: "Victoire", accessor: "title" },
      { header: "Catégorie", accessor: "category" },
      { header: "Date", accessor: "date" }
    ],
    "victoires",
    "Célébrons chaque succès !",
    summary
  );
}

export function exportFinancialToPDF(spending: any[], revenue: any[]) {
  const totalSpending = spending.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalRevenue = revenue.reduce((sum, r) => sum + (r.amount || 0), 0);
  const balance = totalRevenue - totalSpending;
  
  const summary = [
    { label: "Total revenus", value: `${totalRevenue.toLocaleString()} CFA` },
    { label: "Total dépenses", value: `${totalSpending.toLocaleString()} CFA` },
    { label: "Solde", value: `${balance.toLocaleString()} CFA` }
  ];
  
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  
  // En-tête
  addHeader(doc, "Rapport financier");
  
  let startY = 55;
  
  // Résumé
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  doc.text("RÉSUMÉ FINANCIER", 20, startY);
  startY += 6;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  summary.forEach((item, idx) => {
    doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2]);
    doc.text(`${item.label}:`, 25, startY + (idx * 5));
    doc.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
    doc.text(item.value, 70, startY + (idx * 5));
  });
  startY += 25;
  
  // Dépenses
  if (spending.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
    doc.text("DÉPENSES", 20, startY);
    startY += 5;
    
    autoTable(doc, {
      head: [["Titre", "Montant", "Catégorie", "Projet"]],
      body: spending.map(s => [
        s.title,
        `${s.amount?.toLocaleString()} CFA`,
        s.category || "-",
        s.project || "-"
      ]),
      startY: startY,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.gold,
        textColor: COLORS.background,
        fontStyle: "bold"
      },
      bodyStyles: {
        textColor: COLORS.textPrimary
      },
      alternateRowStyles: {
        fillColor: COLORS.altRowBg
      }
    });
    startY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Revenus
  if (revenue.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
    doc.text("REVENUS", 20, startY);
    startY += 5;
    
    autoTable(doc, {
      head: [["Source", "Montant", "Projet"]],
      body: revenue.map(r => [
        r.source,
        `${r.amount?.toLocaleString()} CFA`,
        r.project || "-"
      ]),
      startY: startY,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.gold,
        textColor: COLORS.background,
        fontStyle: "bold"
      },
      bodyStyles: {
        textColor: COLORS.textPrimary
      },
      alternateRowStyles: {
        fillColor: COLORS.altRowBg
      }
    });
  }
  
  // Pied de page
  addFooter(doc, "Rapport financier");
  
  doc.save(`finances_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportFarmToPDF(infrastructure: any[], production: any[], spending: any[], team: any[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const totalSpent = spending.reduce((sum, s) => sum + (s.amount || 0), 0);
  
  // En-tête
  addHeader(doc, "Rapport Ifè Living Farm");
  
  let startY = 55;
  
  // Résumé
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  doc.text("SYNTHÈSE", 20, startY);
  startY += 6;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.textPrimary[0], COLORS.textPrimary[1], COLORS.textPrimary[2]);
  doc.text(`Investissement total: ${totalSpent.toLocaleString()} CFA`, 25, startY);
  doc.text(`Productions actives: ${production.filter(p => p.status === "active").length}`, 25, startY + 6);
  doc.text(`Infrastructures: ${infrastructure.filter(i => i.status === "complete").length}/${infrastructure.length}`, 25, startY + 12);
  doc.text(`Équipe: ${team.length} membres`, 25, startY + 18);
  startY += 30;
  
  // Infrastructures
  if (infrastructure.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
    doc.text("INFRASTRUCTURES", 20, startY);
    startY += 5;
    
    autoTable(doc, {
      head: [["Nom", "Type", "Statut", "Localisation"]],
      body: infrastructure.map(i => [i.name, i.type || "-", i.status || "-", i.location_on_site || "-"]),
      startY: startY,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.gold,
        textColor: COLORS.background,
        fontStyle: "bold"
      },
      bodyStyles: {
        textColor: COLORS.textPrimary
      },
      alternateRowStyles: {
        fillColor: COLORS.altRowBg
      }
    });
    startY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Production
  if (production.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
    doc.text("UNITÉS DE PRODUCTION", 20, startY);
    startY += 5;
    
    autoTable(doc, {
      head: [["Nom", "Catégorie", "Statut", "Capacité"]],
      body: production.map(p => [p.name, p.category || "-", p.status || "-", p.current_capacity || "-"]),
      startY: startY,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.gold,
        textColor: COLORS.background,
        fontStyle: "bold"
      },
      bodyStyles: {
        textColor: COLORS.textPrimary
      },
      alternateRowStyles: {
        fillColor: COLORS.altRowBg
      }
    });
    startY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Dépenses
  if (spending.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
    doc.text("DÉPENSES", 20, startY);
    startY += 5;
    
    autoTable(doc, {
      head: [["Titre", "Montant", "Catégorie", "Zone"]],
      body: spending.map(s => [s.title, `${s.amount?.toLocaleString()} CFA`, s.category || "-", s.project_area || "-"]),
      startY: startY,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.gold,
        textColor: COLORS.background,
        fontStyle: "bold"
      },
      bodyStyles: {
        textColor: COLORS.textPrimary
      },
      alternateRowStyles: {
        fillColor: COLORS.altRowBg
      }
    });
    startY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Équipe
  if (team.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
    doc.text("ÉQUIPE", 20, startY);
    startY += 5;
    
    autoTable(doc, {
      head: [["Nom", "Rôle", "Zone", "Statut"]],
      body: team.map(t => [t.name, t.role || "-", t.area || "-", t.status === "active" ? "Actif" : t.status === "occasional" ? "Occasionnel" : "En attente"]),
      startY: startY,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.gold,
        textColor: COLORS.background,
        fontStyle: "bold"
      },
      bodyStyles: {
        textColor: COLORS.textPrimary
      },
      alternateRowStyles: {
        fillColor: COLORS.altRowBg
      }
    });
  }
  
  // Pied de page
  addFooter(doc, "Rapport Ifè Living Farm");
  
  doc.save(`farm_${new Date().toISOString().split('T')[0]}.pdf`);
}

// =====================================================
// EXPORT GÉNÉRIQUE (capture d'écran)
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
      scale: 2.5,
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
