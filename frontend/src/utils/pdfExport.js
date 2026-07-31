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

    const pageWidth = 210;
    const pageHeight = 297;
    let renderWidth = pageWidth;
    let renderHeight = (canvas.height * renderWidth) / canvas.width;
    let xPos = 0;
    let yPos = 0;

    if (renderHeight > pageHeight) {
      const scale = pageHeight / renderHeight;
      renderWidth = pageWidth * scale;
      renderHeight = pageHeight;
      xPos = (pageWidth - renderWidth) / 2;
    }

    // Fit precisely onto A4 page without clipping top or bottom content
    pdf.addImage(imgData, 'PNG', xPos, yPos, renderWidth, renderHeight, undefined, 'FAST');
    pdf.save(filename);
  } catch (error) {
    console.error('Failed to generate PDF via canvas, falling back to print:', error);
    window.print();
  }
};

export const printElement = (elementId) => {
  window.print();
};
