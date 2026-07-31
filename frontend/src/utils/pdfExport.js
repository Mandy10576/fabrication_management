import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const downloadPDF = async (elementId, filename = 'invoice.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element #${elementId} not found`);
    return;
  }

  try {
    // Render element into canvas with exact pixel scale & zero scroll offset
    const canvas = await html2canvas(element, {
      scale: 3, // High DPI clarity
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth || 1024,
      onclone: (clonedDoc) => {
        const clonedEl = clonedDoc.getElementById(elementId);
        if (clonedEl) {
          clonedEl.style.maxHeight = 'none';
          clonedEl.style.overflow = 'visible';
          clonedEl.style.transform = 'none';
          clonedEl.style.margin = '0 auto';
          let parent = clonedEl.parentElement;
          while (parent) {
            parent.scrollTop = 0;
            parent.scrollLeft = 0;
            if (parent.style) {
              parent.style.maxHeight = 'none';
              parent.style.overflow = 'visible';
            }
            parent = parent.parentElement;
          }
        }
      }
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Fit precisely onto single A4 page without top/bottom clipping
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, 297), undefined, 'FAST');
    pdf.save(filename);
  } catch (error) {
    console.error('Failed to generate PDF via canvas, falling back to print:', error);
    window.print();
  }
};

export const printElement = (elementId) => {
  window.print();
};
