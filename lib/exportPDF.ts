// lib/exportPDF.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Version simplifiée : export en CSV (le plus simple)
export function exportToCSV(data: any[], filename: string, columns: { header: string; accessor: string }[]) {
  // Créer l'en-tête
  const headers = columns.map(col => col.header).join(",");
  
  // Créer les lignes
  const rows = data.map(row => 
    columns.map(col => {
      let value = row[col.accessor];
      if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(",")
  );
  
  const csvContent = [headers, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export PDF avec données structurées
export function exportToPDFStructured(
  title: string,
  data: any[],
  columns: { header: string; accessor: string }[],
  filename: string,
  subtitle?: string
) {
  const doc = new jsPDF();
  
  // Titre
  doc.setFontSize(18);
  doc.setTextColor(212, 175, 55); // gold
  doc.text(title, 14, 20);
  
  // Sous-titre
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(subtitle, 14, 30);
  }
  
  // Date d'export
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 14, 40);
  
  // Tableau
  autoTable(doc, {
    head: [columns.map(col => col.header)],
    body: data.map(row => columns.map(col => row[col.accessor] || "")),
    startY: 50,
    theme: "striped",
    headStyles: {
      fillColor: [212, 175, 55],
      textColor: [10, 10, 11],
      fontStyle: "bold",
    },
    bodyStyles: {
      textColor: [245, 245, 240],
      lineColor: [50, 50, 60],
    },
    alternateRowStyles: {
      fillColor: [30, 30, 35],
    },
    margin: { left: 14, right: 14 },
  });
  
  doc.save(`${filename}.pdf`);
}

// Export des tâches
export async function exportTasksToPDF(tasks: any[]) {
  exportToPDFStructured(
    "📋 Rapport des tâches",
    tasks,
    [
      { header: "Titre", accessor: "title" },
      { header: "Statut", accessor: "status" },
      { header: "Priorité", accessor: "priority" },
      { header: "Projet", accessor: "project" },
      { header: "Échéance", accessor: "due_date" },
    ],
    `taches-${new Date().toISOString().split('T')[0]}`,
    `Total : ${tasks.length} tâches`
  );
}

export async function exportDocumentsToPDF(documents: any[]) {
  exportToPDFStructured(
    "📄 Rapport des documents",
    documents,
    [
      { header: "Nom", accessor: "name" },
      { header: "Type", accessor: "type" },
      { header: "Statut", accessor: "status" },
      { header: "Échéance", accessor: "due_date" },
      { header: "Notes", accessor: "notes" },
    ],
    `documents-${new Date().toISOString().split('T')[0]}`,
    `Total : ${documents.length} documents`
  );
}

// Export des missions
export async function exportMissionsToPDF(missions: any[]) {
  exportToPDFStructured(
    "🎯 Rapport des missions",
    missions,
    [
      { header: "Nom", accessor: "name" },
      { header: "Catégorie", accessor: "category" },
      { header: "Statut", accessor: "status" },
      { header: "Priorité", accessor: "priority" },
      { header: "Échéance", accessor: "deadline" },
    ],
    `missions-${new Date().toISOString().split('T')[0]}`,
    `Total : ${missions.length} missions actives`
  );
}

// Export des finances
export async function exportFinancialToPDF(spending: any[], revenue: any[]) {
  const doc = new jsPDF();
  
  // Titre
  doc.setFontSize(18);
  doc.setTextColor(212, 175, 55);
  doc.text("💰 Rapport financier", 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);
  
  // Résumé
  const totalSpending = spending.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalRevenue = revenue.reduce((sum, r) => sum + (r.amount || 0), 0);
  const balance = totalRevenue - totalSpending;
  
  doc.setFontSize(12);
  doc.setTextColor(212, 175, 55);
  doc.text("📊 Synthèse financière", 14, 45);
  
  doc.setFontSize(10);
  doc.setTextColor(245, 245, 240);
  doc.text(`Total revenus : ${totalRevenue.toLocaleString()} CFA`, 14, 55);
  doc.text(`Total dépenses : ${totalSpending.toLocaleString()} CFA`, 14, 62);
  doc.text(`Solde : ${balance.toLocaleString()} CFA`, 14, 69);
  
  // Tableau des dépenses
  autoTable(doc, {
    head: [["Dépense", "Montant", "Catégorie", "Projet", "Date"]],
    body: spending.map(s => [
      s.title,
      `${s.amount?.toLocaleString()} CFA`,
      s.category || "-",
      s.project || "-",
      s.date ? new Date(s.date).toLocaleDateString('fr-FR') : "-",
    ]),
    startY: 80,
    theme: "striped",
    headStyles: { fillColor: [212, 175, 55], textColor: [10, 10, 11] },
    bodyStyles: { textColor: [245, 245, 240] },
  });
  
  doc.save(`finances-${new Date().toISOString().split('T')[0]}.pdf`);
}

// Export des victoires
export async function exportWinsToPDF(wins: any[]) {
  exportToPDFStructured(
    "🏆 Rapport des victoires",
    wins,
    [
      { header: "Victoire", accessor: "title" },
      { header: "Catégorie", accessor: "category" },
      { header: "Date", accessor: "date" },
      { header: "Notes", accessor: "notes" },
    ],
    `victoires-${new Date().toISOString().split('T')[0]}`,
    `Total : ${wins.length} victoires célébrées`
  );
}

// Garder l'ancienne fonction pour la compatibilité (export image)
export async function exportToPDF(elementId: string, filename: string) {
  // Fallback : export image pour les pages qui n'ont pas encore migré
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Élément non trouvé:", elementId);
    return;
  }

  try {
    const html2canvas = (await import("html2canvas")).default;
    const imgData = await html2canvas(element, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: "#0A0A0B"
    });
    
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    
    const imgWidth = 210;
    const imgHeight = (element.clientHeight * imgWidth) / element.clientWidth;
    
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error("Erreur export PDF:", error);
  }
}

// Export de la ferme (version structurée)
export async function exportFarmToPDF(
  infrastructure: any[],
  production: any[],
  spending: any[],
  team: any[]
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  
  const doc = new jsPDF();
  
  // Titre
  doc.setFontSize(18);
  doc.setTextColor(212, 175, 55);
  doc.text("🌾 Rapport Ifè Living Farm", 14, 20);
  
  // Date d'export
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 14, 30);
  
  let yPos = 45;
  
  // RÉSUMÉ DES STATS
  const totalSpent = spending.reduce((sum, s) => sum + (s.amount || 0), 0);
  const activeProduction = production.filter(p => p.status === "active" || p.status === "setup").length;
  const completedInfra = infrastructure.filter(i => i.status === "complete").length;
  
  doc.setFontSize(12);
  doc.setTextColor(212, 175, 55);
  doc.text("📊 Synthèse", 14, yPos);
  yPos += 7;
  
  doc.setFontSize(10);
  doc.setTextColor(245, 245, 240);
  doc.text(`Investissement total : ${totalSpent.toLocaleString()} CFA`, 20, yPos);
  yPos += 6;
  doc.text(`Productions actives : ${activeProduction}`, 20, yPos);
  yPos += 6;
  doc.text(`Infrastructures complétées : ${completedInfra}/${infrastructure.length}`, 20, yPos);
  yPos += 6;
  doc.text(`Équipe : ${team.length} membre(s)`, 20, yPos);
  yPos += 15;
  
  // INFRASTRUCTURES
  if (infrastructure.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(212, 175, 55);
    doc.text("🏗️ Infrastructures", 14, yPos);
    yPos += 5;
    
    autoTable(doc, {
      head: [["Nom", "Type", "Statut", "Localisation"]],
      body: infrastructure.map(i => [
        i.name,
        i.type || "-",
        i.status || "-",
        i.location_on_site || "-"
      ]),
      startY: yPos,
      theme: "striped",
      headStyles: { fillColor: [212, 175, 55], textColor: [10, 10, 11] },
      bodyStyles: { textColor: [245, 245, 240] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // UNITÉS DE PRODUCTION
  if (production.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(212, 175, 55);
    doc.text("🌱 Unités de production", 14, yPos);
    yPos += 5;
    
    autoTable(doc, {
      head: [["Nom", "Catégorie", "Statut", "Capacité"]],
      body: production.map(p => [
        p.name,
        p.category || "-",
        p.status || "-",
        p.current_capacity || "-"
      ]),
      startY: yPos,
      theme: "striped",
      headStyles: { fillColor: [212, 175, 55], textColor: [10, 10, 11] },
      bodyStyles: { textColor: [245, 245, 240] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // DÉPENSES
  if (spending.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(212, 175, 55);
    doc.text("💰 Dépenses", 14, yPos);
    yPos += 5;
    
    autoTable(doc, {
      head: [["Titre", "Montant", "Catégorie", "Zone", "Vérifié"]],
      body: spending.map(s => [
        s.title,
        `${s.amount?.toLocaleString()} CFA`,
        s.category || "-",
        s.project_area || "-",
        s.verified ? "✓ Oui" : "⏳ Non"
      ]),
      startY: yPos,
      theme: "striped",
      headStyles: { fillColor: [212, 175, 55], textColor: [10, 10, 11] },
      bodyStyles: { textColor: [245, 245, 240] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // ÉQUIPE
  if (team.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(212, 175, 55);
    doc.text("👥 Équipe", 14, yPos);
    yPos += 5;
    
    autoTable(doc, {
      head: [["Nom", "Rôle", "Zone", "Statut", "Téléphone"]],
      body: team.map(t => [
        t.name,
        t.role || "-",
        t.area || "-",
        t.status === "active" ? "Actif" : t.status === "occasional" ? "Occasionnel" : "En attente",
        t.phone || "-"
      ]),
      startY: yPos,
      theme: "striped",
      headStyles: { fillColor: [212, 175, 55], textColor: [10, 10, 11] },
      bodyStyles: { textColor: [245, 245, 240] },
    });
  }
  
  doc.save(`farm-${new Date().toISOString().split('T')[0]}.pdf`);
}
