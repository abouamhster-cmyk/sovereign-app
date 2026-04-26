import jsPDF from "jspdf";
import { toPng } from "html-to-image";

export async function exportToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Élément non trouvé:", elementId);
    return;
  }

  try {
    const imgData = await toPng(element, {
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
