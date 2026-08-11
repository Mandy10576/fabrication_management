import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { InvoiceTemplate } from '../components/InvoiceTemplate';
import { QuotationTemplate } from '../components/QuotationTemplate';

/**
 * Renders the PDF from the very same React component the app shows on screen,
 * rather than from a parallel PDF-only template. The component is mounted
 * off-screen, painted to a canvas, and placed onto an A4 page — so the file is
 * the invoice design itself, and any change to InvoiceTemplate/QuotationTemplate
 * shows up in the PDF with no second template to keep in sync.
 */

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/** A page that overflows by a hair (sub-pixel rounding, a 297.02mm measurement)
 *  must not spill onto a second sheet, so overflow under this is treated as
 *  fitting. Well below a real line of text, which can never hide a row. */
const PAGE_OVERFLOW_TOLERANCE_MM = 2;

/** Higher scale = sharper text in the PDF, at the cost of a bigger file. */
const CAPTURE_SCALE = 3;

/**
 * A document slightly taller than A4 is shrunk to fit one sheet rather than
 * spilling a few rows onto a second one. The scale is uniform, so nothing
 * reflows or moves relative to anything else — the same page, rendered a
 * little smaller, exactly as a printer's "fit to page" would.
 *
 * Below this ratio the type would get too small to read, so a genuinely long
 * document paginates instead of being crushed onto one sheet.
 */
const MIN_FIT_TO_PAGE_SCALE = 0.6;

/** The design is authored against a 16px root, and the app's own print
 *  stylesheet pins the same value — without this the output would change with
 *  whatever window width the export happened to be triggered from, because the
 *  responsive root-font steps also apply to rem-based type in the template. */
const BASE_FONT_SIZE_PX = '16px';

/** Waits for webfonts and any images (e.g. the company logo) so the capture
 *  never races a half-loaded document. */
const waitForAssets = async (node) => {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      /* fonts API unavailable — fall through, the capture is still valid */
    }
  }

  const images = Array.from(node.querySelectorAll('img'));
  await Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
          })
    )
  );

  // Let layout and font swap settle before painting.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
};

/**
 * Mounts `element` off-screen at true A4 width, hands the live node to
 * `capture`, then unmounts. Kept off-viewport rather than hidden, because
 * display:none / visibility:hidden nodes have no layout for html2canvas to read.
 */
const withOffscreenRender = async (element, capture) => {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = [
    'position:fixed',
    'left:-20000px',
    'top:0',
    'width:210mm',
    'background:#ffffff',
    'pointer-events:none',
    'z-index:-1',
    `font-size:${BASE_FONT_SIZE_PX}`,
  ].join(';');
  document.body.appendChild(host);

  const root = createRoot(host);
  try {
    await new Promise((resolve) => {
      root.render(element);
      // createRoot renders asynchronously; wait a frame for commit.
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    const target = host.firstElementChild;
    if (!target) throw new Error('Document template rendered nothing to capture');

    // The drop shadow, rounded corners and hairline border belong to the
    // on-screen preview card, not to the document — the app's own print
    // stylesheet drops the same three for exactly this reason. Everything
    // inside the page is left untouched.
    target.style.boxShadow = 'none';
    target.style.borderRadius = '0';
    target.style.border = 'none';
    target.style.margin = '0';

    await waitForAssets(target);
    return await capture(target);
  } finally {
    root.unmount();
    host.remove();
  }
};

/** Paints the node and lays the result onto one or more A4 pages. */
const canvasToPdfBlob = async (node) => {
  const canvas = await html2canvas(node, {
    scale: CAPTURE_SCALE,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    // The node sits off-screen, so tell html2canvas to capture it at its own
    // position rather than at the current scroll offset.
    scrollX: 0,
    scrollY: 0,
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  // Width is pinned to the sheet, so height follows the captured aspect ratio.
  const renderedHeightMM = (canvas.height * A4_WIDTH_MM) / canvas.width;

  if (renderedHeightMM <= A4_HEIGHT_MM + PAGE_OVERFLOW_TOLERANCE_MM) {
    // Fits a single sheet at true size — the usual case, since the template's
    // min-height is exactly one A4 page.
    pdf.addImage(
      canvas.toDataURL('image/jpeg', 0.98),
      'JPEG',
      0,
      0,
      A4_WIDTH_MM,
      Math.min(renderedHeightMM, A4_HEIGHT_MM),
      undefined,
      'FAST'
    );
    return pdf.output('blob');
  }

  const fitScale = A4_HEIGHT_MM / renderedHeightMM;
  if (fitScale >= MIN_FIT_TO_PAGE_SCALE) {
    // Slightly over: shrink the whole page to fit one sheet instead of
    // pushing a few rows onto a second one. Centred, since scaling the
    // height down narrows the width by the same proportion.
    const width = A4_WIDTH_MM * fitScale;
    pdf.addImage(
      canvas.toDataURL('image/jpeg', 0.98),
      'JPEG',
      (A4_WIDTH_MM - width) / 2,
      0,
      width,
      A4_HEIGHT_MM,
      undefined,
      'FAST'
    );
    return pdf.output('blob');
  }

  // Taller than one sheet: slice the canvas into bands so a long item list
  // continues onto further pages instead of being squashed. The band height
  // is the content evenly divided across the minimum number of A4 pages it
  // needs, rather than a fixed 297mm cut - slicing at a fixed height leaves
  // a near-blank trailing page whenever the last band is short (e.g. content
  // 2.1 pages tall would otherwise spill a nearly empty 3rd sheet).
  const pagesNeeded = Math.max(1, Math.ceil(renderedHeightMM / A4_HEIGHT_MM));
  const pageHeightPx = Math.ceil(canvas.height / pagesNeeded);
  let offsetPx = 0;
  let firstPage = true;

  while (offsetPx < canvas.height) {
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - offsetPx);

    // Ignore a final hairline slice left by rounding.
    const sliceHeightMM = (sliceHeightPx * A4_WIDTH_MM) / canvas.width;
    if (!firstPage && sliceHeightMM < PAGE_OVERFLOW_TOLERANCE_MM) break;

    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = sliceHeightPx;
    const ctx = slice.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, offsetPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

    if (!firstPage) pdf.addPage();
    pdf.addImage(
      slice.toDataURL('image/jpeg', 0.98),
      'JPEG',
      0,
      0,
      A4_WIDTH_MM,
      sliceHeightMM,
      undefined,
      'FAST'
    );

    firstPage = false;
    offsetPx += sliceHeightPx;
  }

  return pdf.output('blob');
};

// Distinct ids: the on-screen preview already owns printable-invoice /
// printable-quotation, and duplicating them would break those selectors.
const INVOICE_CAPTURE_ID = 'pdf-capture-invoice';
const QUOTATION_CAPTURE_ID = 'pdf-capture-quotation';

/** Builds an invoice PDF from the on-screen InvoiceTemplate. */
export const renderInvoicePdfBlob = async (invoice, company) =>
  withOffscreenRender(
    React.createElement(InvoiceTemplate, {
      invoice,
      company: company || invoice?.company,
      id: INVOICE_CAPTURE_ID,
    }),
    canvasToPdfBlob
  );

/** Builds a quotation PDF from the on-screen QuotationTemplate. */
export const renderQuotationPdfBlob = async (quotation, company) =>
  withOffscreenRender(
    React.createElement(QuotationTemplate, {
      quotation,
      company: company || quotation?.company,
      id: QUOTATION_CAPTURE_ID,
    }),
    canvasToPdfBlob
  );
