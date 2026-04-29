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
    theme: "dark",
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
    theme: "dark",
    headStyles: { fillColor: [212, 175, 55], textColor: [10, 10, 11] },
    bodyStyles: { textColor: [245, 245, 240] },
  });
  
  doc.save(`finances-${new Date().toISOString().split('T')[0]}.pdf`);
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
