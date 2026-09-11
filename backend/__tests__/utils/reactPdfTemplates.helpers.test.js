// Only formatCurrency/parseAddress are exercised here — requiring this
// module pulls in @react-pdf/renderer, but these two helpers are plain
// string/number formatting with no PDF rendering involved.
const { formatCurrency, parseAddress } = require('../../src/utils/reactPdfTemplates');

describe('formatCurrency', () => {
  it('formats a whole number with two decimal places and Indian digit grouping', () => {
    expect(formatCurrency(5255)).toBe('Rs. 5,255.00');
  });

  it('formats a value with existing decimals', () => {
    expect(formatCurrency(4160.5)).toBe('Rs. 4,160.50');
  });

  it('groups large amounts using the Indian numbering system (lakh/crore commas)', () => {
    expect(formatCurrency(1234567)).toBe('Rs. 12,34,567.00');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('Rs. 0.00');
  });

  it('falls back to Rs. 0.00 for missing or invalid input', () => {
    expect(formatCurrency(null)).toBe('Rs. 0.00');
    expect(formatCurrency(undefined)).toBe('Rs. 0.00');
    expect(formatCurrency(NaN)).toBe('Rs. 0.00');
  });
});

describe('parseAddress', () => {
  it('returns empty lines for a missing address', () => {
    expect(parseAddress(null)).toEqual({ lines: [], stateLine: null });
    expect(parseAddress('')).toEqual({ lines: [], stateLine: null });
  });

  it('splits a multi-line address into trimmed lines', () => {
    const result = parseAddress('Plot 44, Sachin GIDC\nNear Bus Depot\nSurat 394230');
    expect(result.lines).toEqual(['Plot 44, Sachin GIDC', 'Near Bus Depot', 'Surat 394230']);
    expect(result.stateLine).toBeNull();
  });

  it('extracts a "State:" line separately and strips it from the regular lines', () => {
    const result = parseAddress('Shop-11, Meet Darshan Apartment\nState: Gujarat\nSurat');
    expect(result.lines).toEqual(['Shop-11, Meet Darshan Apartment', 'Surat']);
    expect(result.stateLine).toBe('Gujarat');
  });

  it('matches "State:" case-insensitively', () => {
    const result = parseAddress('Line one\nSTATE: Maharashtra');
    expect(result.stateLine).toBe('Maharashtra');
  });

  it('drops blank lines', () => {
    const result = parseAddress('Line one\n\n\nLine two');
    expect(result.lines).toEqual(['Line one', 'Line two']);
  });

  it('handles a literal backslash-n (as stored, rather than an actual newline)', () => {
    const result = parseAddress('Line one\\nLine two');
    expect(result.lines).toEqual(['Line one', 'Line two']);
  });
});
