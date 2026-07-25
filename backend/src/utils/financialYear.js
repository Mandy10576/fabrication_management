function getFinancialYearForDate(dateObj = new Date()) {
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed: 0 = Jan, 3 = Apr

  let startYear, endYear;
  if (month >= 3) {
    // April or later
    startYear = year;
    endYear = year + 1;
  } else {
    // Jan - Mar
    startYear = year - 1;
    endYear = year;
  }

  const shortEnd = String(endYear).slice(-2);
  return `${startYear}-${shortEnd}`; // e.g. "2026-27"
}

module.exports = { getFinancialYearForDate };
