// Official GST state codes (CBIC jurisdiction list), mirroring
// frontend/src/utils/indianStates.js so the generated PDF shows the same
// "State - Code" text as the on-screen invoice/quotation preview. Andhra
// Pradesh uses 37 (current code for GSTIN allotment since the 2019
// renumbering); Dadra & Nagar Haveli and Daman & Diu share one code (26)
// since their 2020 merger into a single UT.
const GST_STATE_CODES = {
  'Jammu and Kashmir': '01',
  'Himachal Pradesh': '02',
  'Punjab': '03',
  'Chandigarh': '04',
  'Uttarakhand': '05',
  'Haryana': '06',
  'Delhi': '07',
  'Rajasthan': '08',
  'Uttar Pradesh': '09',
  'Bihar': '10',
  'Sikkim': '11',
  'Arunachal Pradesh': '12',
  'Nagaland': '13',
  'Manipur': '14',
  'Mizoram': '15',
  'Tripura': '16',
  'Meghalaya': '17',
  'Assam': '18',
  'West Bengal': '19',
  'Jharkhand': '20',
  'Odisha': '21',
  'Chhattisgarh': '22',
  'Madhya Pradesh': '23',
  'Gujarat': '24',
  'Dadra and Nagar Haveli and Daman and Diu': '26',
  'Maharashtra': '27',
  'Karnataka': '29',
  'Goa': '30',
  'Lakshadweep': '31',
  'Kerala': '32',
  'Tamil Nadu': '33',
  'Puducherry': '34',
  'Andaman and Nicobar Islands': '35',
  'Telangana': '36',
  'Andhra Pradesh': '37',
  'Ladakh': '38',
};

/** Case-insensitive lookup; returns null for states not in the official
 *  list (e.g. a custom value typed into the state picker). */
const getStateCode = (name) => {
  if (!name) return null;
  const match = Object.keys(GST_STATE_CODES).find((s) => s.toLowerCase() === String(name).trim().toLowerCase());
  return match ? GST_STATE_CODES[match] : null;
};

/** "Gujarat" -> "Gujarat - 24"; unrecognized names pass through unchanged
 *  so a custom-typed state never shows a wrong or made-up code. */
const formatStateWithCode = (name) => {
  const code = getStateCode(name);
  return code ? `${name} - ${code}` : (name || '');
};

module.exports = { GST_STATE_CODES, getStateCode, formatStateWithCode };
