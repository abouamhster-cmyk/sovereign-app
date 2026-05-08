// lib/exportPDF.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Configuration des couleurs Sovereign (tuples exacts)
const COLORS = {
  primary: [212, 175, 55] as [number, number, number],   // Gold
  secondary: [30, 30, 35] as [number, number, number],   // Dark gray
  text: [245, 245, 240] as [number, number, number],     // Ivory
  textDark: [100, 100, 100] as [number, number, number], // Gray
  border: [50, 50, 60] as [number, number, number]       // Border
};

// =====================================================
// FONCTION PRINCIPALE D'EXPORT STRUCTURÉ
// =====================================================

export function exportToPDFStructured(
  title: string,
  data: any[],
  columns: { header: string; accessor: string }[],
  filename: string,
  subtitle?: string,
  summary?: { label: string; value: string }[]
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  
  // ========== EN-TÊTE ==========
  doc.setFillColor(10, 10, 11);
  doc.rect(0, 0, 210, 50, "F");
  
  // Titre principal
  doc.setFontSize(22);
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text(title, 20, 20);
  
  // Sous-titre
  if (subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
    doc.text(subtitle, 20, 30);
  }
  
  // Date d'export
  doc.setFontSize(8);
  doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
  doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 20, 40);
  
  // Ligne de séparation
  doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.line(20, 45, 190, 45);
  
  let startY = 55;
  
  // ========== RÉSUMÉ (si fourni) ==========
  if (summary && summary.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("📊 RÉSUMÉ", 20, startY);
    startY += 6;
    
    summary.forEach((item, idx) => {
      doc.setFontSize(9);
      doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
      doc.text(`${item.label}:`, 25, startY + (idx * 5));
      doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      doc.text(item.value, 70, startY + (idx * 5));
    });
    
    startY += (summary.length * 5) + 10;
  }
  
  // ========== TABLEAU ==========
  if (data && data.length > 0) {
    autoTable(doc, {
      head: [columns.map(col => col.header)],
      body: data.map(row => columns.map(col => {
        let value = row[col.accessor];
        if (col.accessor === "due_date" && value) {
          value = new Date(value).toLocaleDateString('fr-FR');
        } else if (col.accessor === "amount" && typeof value === "number") {
          value = `${value.toLocaleString()} CFA`;
        } else if (col.accessor === "date" && value) {
          value = new Date(value).toLocaleDateString('fr-FR');
        }
        return value || "-";
      })),
      startY: startY,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.primary,
        textColor: [10, 10, 11],
        fontStyle: "bold",
        fontSize: 9
      },
      bodyStyles: {
        textColor: COLORS.text,
        fontSize: 8,
        lineColor: COLORS.border
      },
      alternateRowStyles: {
        fillColor: [40, 40, 45]
      },
      margin: { left: 20, right: 20 }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    startY = finalY;
  } else {
    // Message si pas de données
    doc.setFontSize(10);
    doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
    doc.text("Aucune donnée à afficher", 20, startY);
    startY += 10;
  }
  
  // ========== PIED DE PAGE ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
    doc.text(
      `SOVEREIGN - ${title} - Page ${i}/${pageCount}`,
      20,
      doc.internal.pageSize.getHeight() - 10
    );
    
    // Petit séparateur
    doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.line(20, doc.internal.pageSize.getHeight() - 15, 190, doc.internal.pageSize.getHeight() - 15);
  }
  
  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// =====================================================
// EXPORTS SPÉCIFIQUES
// =====================================================

export async function exportTasksToPDF(tasks: any[]) {
  const summary = [
    { label: "Total des tâches", value: tasks.length.toString() },
    { label: "Tâches terminées", value: tasks.filter(t => t.status === "done").length.toString() },
    { label: "Tâches en cours", value: tasks.filter(t => t.status === "in_progress").length.toString() },
    { label: "Tâches en retard", value: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length.toString() }
  ];
  
  exportToPDFStructured(
    "📋 Rapport des tâches",
    tasks,
    [
      { header: "Titre", accessor: "title" },
      { header: "Statut", accessor: "status" },
      { header: "Priorité", accessor: "priority" },
      { header: "Projet", accessor: "project" },
      { header: "Échéance", accessor: "due_date" },
      { header: "Notes", accessor: "notes" }
    ],
    "taches",
    "Liste complète des tâches",
    summary
  );
}

export async function exportDocumentsToPDF(documents: any[]) {
  const summary = [
    { label: "Total des documents", value: documents.length.toString() },
    { label: "Brouillons", value: documents.filter(d => d.status === "draft").length.toString() },
    { label: "En relecture", value: documents.filter(d => d.status === "review").length.toString() },
    { label: "Approuvés", value: documents.filter(d => d.status === "approved").length.toString() }
  ];
  
  exportToPDFStructured(
    "📄 Rapport des documents",
    documents,
    [
      { header: "Nom", accessor: "name" },
      { header: "Type", accessor: "type" },
      { header: "Statut", accessor: "status" },
      { header: "Échéance", accessor: "due_date" },
      { header: "Pièces manquantes", accessor: "missing_pieces" },
      { header: "Notes", accessor: "notes" }
    ],
    "documents",
    "Liste des documents et contrats",
    summary
  );
}

export async function exportMissionsToPDF(missions: any[]) {
  const summary = [
    { label: "Total des missions", value: missions.length.toString() },
    { label: "Missions actives", value: missions.filter(m => m.status === "active").length.toString() },
    { label: "Missions terminées", value: missions.filter(m => m.status === "complete").length.toString() },
    { label: "Priorité haute", value: missions.filter(m => m.priority === "high" || m.priority === "critical").length.toString() }
  ];
  
  exportToPDFStructured(
    "🎯 Rapport des missions",
    missions,
    [
      { header: "Nom", accessor: "name" },
      { header: "Catégorie", accessor: "category" },
      { header: "Statut", accessor: "status" },
      { header: "Priorité", accessor: "priority" },
      { header: "Échéance", accessor: "deadline" },
      { header: "Propriétaire", accessor: "owner" }
    ],
    "missions",
    "Liste des missions stratégiques",
    summary
  );
}

export async function exportWinsToPDF(wins: any[]) {
  const summary = [
    { label: "Total des victoires", value: wins.length.toString() },
    { label: "Cette semaine", value: wins.filter(w => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(w.date) >= weekAgo;
    }).length.toString() }
  ];
  
  exportToPDFStructured(
    "🏆 Rapport des victoires",
    wins,
    [
      { header: "Victoire", accessor: "title" },
      { header: "Catégorie", accessor: "category" },
      { header: "Date", accessor: "date" },
      { header: "Émoticône", accessor: "celebration_emoji" },
      { header: "Notes", accessor: "notes" }
    ],
    "victoires",
    "Célébrons chaque succès !",
    summary
  );
}

export async function exportFinancialToPDF(spending: any[], revenue: any[]) {
  const totalSpending = spending.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalRevenue = revenue.reduce((sum, r) => sum + (r.amount || 0), 0);
  const balance = totalRevenue - totalSpending;
  
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  
  // En-tête
  doc.setFillColor(10, 10, 11);
  doc.rect(0, 0, 210, 50, "F");
  
  doc.setFontSize(22);
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text("💰 Rapport financier", 20, 20);
  
  doc.setFontSize(8);
  doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
  doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')}`, 20, 40);
  
  doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.line(20, 45, 190, 45);
  
  let startY = 55;
  
  // Résumé
  doc.setFontSize(11);
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text("📊 SYNTHÈSE FINANCIÈRE", 20, startY);
  startY += 8;
  
  doc.setFontSize(9);
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(`Revenus totaux: ${totalRevenue.toLocaleString()} CFA`, 25, startY);
  doc.text(`Dépenses totales: ${totalSpending.toLocaleString()} CFA`, 25, startY + 6);
  doc.text(`Solde: ${balance.toLocaleString()} CFA`, 25, startY + 12);
  startY += 25;
  
  // Tableau des dépenses
  if (spending.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("📤 DÉPENSES", 20, startY);
    startY += 5;
    
    autoTable(doc, {
      head: [["Titre", "Montant", "Catégorie", "Projet", "Date"]],
      body: spending.map(s => [
        s.title,
        `${s.amount?.toLocaleString()} CFA`,
        s.category || "-",
        s.project || "-",
        s.date ? new Date(s.date).toLocaleDateString('fr-FR') : "-"
      ]),
      startY: startY,
      theme: "striped",
      headStyles: { fillColor: COLORS.primary, textColor: [10, 10, 11] },
      bodyStyles: { textColor: COLORS.text }
    });
    
    startY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Tableau des revenus
  if (revenue.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("📥 REVENUS", 20, startY);
    startY += 5;
    
    autoTable(doc, {
      head: [["Source", "Montant", "Projet", "Date"]],
      body: revenue.map(r => [
        r.source,
        `${r.amount?.toLocaleString()} CFA`,
        r.project || "-",
        r.date ? new Date(r.date).toLocaleDateString('fr-FR') : "-"
      ]),
      startY: startY,
      theme: "striped",
      headStyles: { fillColor: COLORS.primary, textColor: [10, 10, 11] },
      bodyStyles: { textColor: COLORS.text }
    });
  }
  
  doc.save(`finances_${new Date().toISOString().split('T')[0]}.pdf`);
}

export async function exportFarmToPDF(infrastructure: any[], production: any[], spending: any[], team: any[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const totalSpent = spending.reduce((sum, s) => sum + (s.amount || 0), 0);
  
  // En-tête
  doc.setFillColor(10, 10, 11);
  doc.rect(0, 0, 210, 50, "F");
  
  doc.setFontSize(22);
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text("🌾 Rapport Ifè Living Farm", 20, 20);
  
  doc.setFontSize(8);
  doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
  doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')}`, 20, 40);
  
  doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.line(20, 45, 190, 45);
  
  let startY = 55;
  
  // Résumé
  doc.setFontSize(11);
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text("📊 SYNTHÈSE", 20, startY);
  startY += 6;
  
  doc.setFontSize(9);
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(`Investissement total: ${totalSpent.toLocaleString()} CFA`, 25, startY);
  doc.text(`Productions actives: ${production.filter(p => p.status === "active").length}`, 25, startY + 6);
  doc.text(`Infrastructures: ${infrastructure.filter(i => i.status === "complete").length}/${infrastructure.length}`, 25, startY + 12);
  doc.text(`Équipe: ${team.length} membres`, 25, startY + 18);
  startY += 30;
  
  // Infrastructures
  if (infrastructure.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.text("🏗️ INFRASTRUCTURES", 20, startY);
    startY += 5;
    
    autoTable(doc, {
      head: [["Nom", "Type", "Statut", "Localisation"]],
      body: infrastructure.map(i => [i.name, i.type || "-", i.status || "-", i.location_on_site || "-"]),
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
    doc.text("🌱 UNITÉS DE PRODUCTION", 20, startY);
    startY += 5;
    
    autoTable(doc, {
      head: [["Nom", "Catégorie", "Statut", "Capacité"]],
      body: production.map(p => [p.name, p.category || "-", p.status || "-", p.current_capacity || "-"]),
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
    doc.text("💰 DÉPENSES", 20, startY);
    startY += 5;
    
    autoTable(doc, {
      head: [["Titre", "Montant", "Catégorie", "Zone"]],
      body: spending.map(s => [s.title, `${s.amount?.toLocaleString()} CFA`, s.category || "-", s.project_area || "-"]),
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
    doc.text("👥 ÉQUIPE", 20, startY);
    startY += 5;
    
    autoTable(doc, {
      head: [["Nom", "Rôle", "Zone", "Statut"]],
      body: team.map(t => [t.name, t.role || "-", t.area || "-", t.status === "active" ? "Actif" : t.status === "occasional" ? "Occasionnel" : "En attente"]),
      startY: startY,
      theme: "striped",
      headStyles: { fillColor: COLORS.primary, textColor: [10, 10, 11] },
      bodyStyles: { textColor: COLORS.text }
    });
  }
  
  doc.save(`farm_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Fonction générique pour exporter n'importe quelle page
export async function exportGenericPage(title: string, elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Élément non trouvé:", elementId);
    return;
  }
  
  try {
    const html2canvas = (await import("html2canvas")).default;
    const imgData = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#0A0A0B",
      logging: false
    });
    
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    
    const imgWidth = 190;
    const imgHeight = (element.clientHeight * imgWidth) / element.clientWidth;
    
    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
    pdf.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error("Erreur export PDF:", error);
  }
}

// Garder l'ancienne fonction pour la compatibilité
export async function exportToPDF(elementId: string, filename: string) {
  return exportGenericPage("", elementId, filename);
}
