function numberToWords(num) {
  if (num === null || num === undefined || isNaN(num)) return 'Zero';
  
  const val = Math.round(Math.abs(num));
  if (val === 0) return 'Rupees Zero Only';

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertLessThanThousand(n) {
    let str = '';
    if (n >= 100) {
      str += single[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += single[n] + ' ';
    }
    return str;
  }

  let result = '';
  let crore = Math.floor(val / 10000000);
  let lakh = Math.floor((val % 10000000) / 100000);
  let thousand = Math.floor((val % 100000) / 1000);
  let remaining = val % 1000;

  if (crore > 0) {
    result += convertLessThanThousand(crore) + 'Crore ';
  }
  if (lakh > 0) {
    result += convertLessThanThousand(lakh) + 'Lakh ';
  }
  if (thousand > 0) {
    result += convertLessThanThousand(thousand) + 'Thousand ';
  }
  if (remaining > 0) {
    result += convertLessThanThousand(remaining);
  }

  return `Rupees ${result.trim()} Only`;
}

module.exports = { numberToWords };
