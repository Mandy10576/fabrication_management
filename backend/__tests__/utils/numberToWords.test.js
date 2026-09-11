const { numberToWords } = require('../../src/utils/numberToWords');

describe('numberToWords', () => {
  it('handles zero', () => {
    expect(numberToWords(0)).toBe('Rupees Zero Only');
  });

  it('handles a plain single-digit amount', () => {
    expect(numberToWords(5)).toBe('Rupees Five Only');
  });

  it('handles a two-digit amount under 20 (irregular English forms)', () => {
    expect(numberToWords(13)).toBe('Rupees Thirteen Only');
  });

  it('handles a tens + units amount', () => {
    expect(numberToWords(47)).toBe('Rupees Forty Seven Only');
  });

  it('handles hundreds', () => {
    expect(numberToWords(233)).toBe('Rupees Two Hundred Thirty Three Only');
  });

  it('handles an exact hundred with no remainder', () => {
    expect(numberToWords(500)).toBe('Rupees Five Hundred Only');
  });

  it('handles thousands, matching the real Kiran Solanki invoice total from this session', () => {
    expect(numberToWords(5255)).toBe('Rupees Five Thousand Two Hundred Fifty Five Only');
  });

  it('handles lakhs', () => {
    expect(numberToWords(250000)).toBe('Rupees Two Lakh Fifty Thousand Only');
  });

  it('handles crores', () => {
    expect(numberToWords(12345678)).toBe('Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only');
  });

  it('rounds a fractional amount to the nearest rupee', () => {
    expect(numberToWords(4160.49)).toBe('Rupees Four Thousand One Hundred Sixty Only');
    expect(numberToWords(4160.5)).toBe('Rupees Four Thousand One Hundred Sixty One Only');
  });

  it('treats a negative amount the same as its magnitude', () => {
    expect(numberToWords(-100)).toBe('Rupees One Hundred Only');
  });

  it('falls back to "Zero" for non-numeric input', () => {
    expect(numberToWords(null)).toBe('Zero');
    expect(numberToWords(undefined)).toBe('Zero');
    expect(numberToWords(NaN)).toBe('Zero');
  });
});
