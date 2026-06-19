export interface ParsedTransaction {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
}

// Map months to double digit strings
const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

// Auto-suggest category based on merchant name or line items
export const suggestCategory = (desc: string, type: 'income' | 'expense'): string => {
  const lowerDesc = desc.toLowerCase();
  
  if (type === 'income') {
    if (/\b(salary|paycheck|payroll|wage|direct deposit)\b/i.test(lowerDesc)) return 'Salary';
    if (/\b(freelance|contract|consulting|upwork|fiverr|side hustle)\b/i.test(lowerDesc)) return 'Freelance';
    if (/\b(dividend|interest|yield|crypto|stocks|invest|portfolio)\b/i.test(lowerDesc)) return 'Investments';
    return 'Other In';
  }

  const categoryKeywords: Record<string, string[]> = {
    'Groceries': ['supermarket', 'grocer', 'food', 'mart', 'market', 'veg', 'meat', 'bakery', 'milk', 'shoprite', 'jumbo', 'winners', 'super u', 'provision', 'intermart', 'costco'],
    'Dining Out': ['restaurant', 'cafe', 'coffee', 'starbucks', 'bistro', 'pizza', 'kitchen', 'diner', 'burger', 'bar', 'sushi', 'grill', 'lounge', 'kfc', 'mcdonalds', 'food court', 'pub'],
    'Transport': ['fuel', 'gas', 'petrol', 'shell', 'total', 'engine', 'parking', 'taxi', 'uber', 'metro', 'car', 'bus', 'oil', 'filling station', 'railway', 'train', 'ticket'],
    'Utilities': ['telecom', 'ceb', 'cwa', 'myt', 'emtel', 'internet', 'electricity', 'water', 'insurance', 'subscription', 'netflix', 'spotify', 'recharge', 'mobile'],
    'Leisure': ['cinema', 'movie', 'game', 'play', 'bowling', 'hotel', 'resort', 'flight', 'travel', 'holiday', 'concert', 'ticket', 'booking', 'beach', 'fun'],
    'Rent & Housing': ['rent', 'home', 'furniture', 'hardware', 'construction', 'bricolage', 'appliance', 'mr bricolage', 'ikea', 'rent payment'],
  };
  
  for (const [catName, keywords] of Object.entries(categoryKeywords)) {
    const hasKeyword = keywords.some(keyword => lowerDesc.includes(keyword));
    if (hasKeyword) {
      return catName;
    }
  }
  
  return 'Other Out';
};

// Formats helper to ensure YYYY-MM-DD
const formatDate = (year: string, month: string, day: string): string => {
  const y = year.length === 2 ? `20${year}` : year;
  const m = month.padStart(2, '0');
  const d = day.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const parseReceiptText = (text: string): { description: string; amount: number; category: string } => {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  // Heuristic 1: Get description (Merchant Name)
  let merchantName = 'Receipt Transaction';
  const phoneRegex = /tel|phone|\d{3}-\d{4}/i;
  const webRegex = /www\.|\.com|\.mu/i;
  
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    if (
      line.length > 2 && 
      !phoneRegex.test(line) && 
      !webRegex.test(line) && 
      !/\b(total|receipt|tax|date|time|cashier|welcome|invoice|transaction|cash|change|slip)\b/i.test(line) &&
      !/^\d+$/.test(line)
    ) {
      merchantName = line;
      break;
    }
  }
  
  // Heuristic 2: Find total amount
  let amount = 0.0;
  let candidates: number[] = [];
  const totalKeywords = /\b(total|net|amount|due|sum|paid|amount due|card|visa|cash|mcbbill|pay|subtotal)\b/i;
  
  lines.forEach(line => {
    if (totalKeywords.test(line)) {
      const cleanLine = line.replace(/,/g, '');
      const matches = cleanLine.match(/\d+\.?\d*/g);
      if (matches) {
        matches.forEach(m => {
          const val = parseFloat(m);
          if (val > 0 && val < 500000) {
            candidates.push(val);
          }
        });
      }
    }
  });
  
  if (candidates.length > 0) {
    amount = Math.max(...candidates);
  } else {
    const allMatches = text.replace(/,/g, '').match(/\d+\.\d{2}/g);
    if (allMatches) {
      const numbers = allMatches.map(m => parseFloat(m)).filter(val => val > 0 && val < 100000);
      if (numbers.length > 0) {
        amount = Math.max(...numbers);
      }
    }
  }
  
  const category = suggestCategory(merchantName, 'expense');
  
  return {
    description: merchantName,
    amount,
    category
  };
};

export const parseOCRText = (
  text: string,
  mode: 'auto' | 'receipt' | 'statement' = 'auto'
): ParsedTransaction[] => {
  const todayStr = new Date().toISOString().split('T')[0];
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  const results: ParsedTransaction[] = [];
  
  // Regexes for detecting dates
  const regexDateSlashDotDash = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/; // 15/06/2026 or 15-06-26 or 15.06.26
  const regexDateIso = /\b(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})\b/; // 2026-06-15
  const regexDateTextual = /\b(\d{1,2})\s+([A-Za-z]{3,9})\s*(\d{2,4})?\b/i; // 15 Jun 2026 or 15 June 26 or 15 June
  const regexDateTextualReverse = /\b([A-Za-z]{3,9})\s+(\d{1,2})\b/i; // Jun 15
  
  // Helper to extract a date from a line
  const extractDateFromLine = (line: string): { dateStr: string; matchedText: string } | null => {
    let match = line.match(regexDateIso);
    if (match) {
      return { dateStr: formatDate(match[1], match[2], match[3]), matchedText: match[0] };
    }
    
    match = line.match(regexDateSlashDotDash);
    if (match) {
      // Guessing DD/MM vs MM/DD. We assume DD/MM as default unless month > 12
      let d = match[1];
      let m = match[2];
      let y = match[3];
      if (parseInt(m) > 12 && parseInt(d) <= 12) {
        // Swap
        d = match[2];
        m = match[1];
      }
      return { dateStr: formatDate(y, m, d), matchedText: match[0] };
    }
    
    match = line.match(regexDateTextual);
    if (match) {
      const day = match[1];
      const monthWord = match[2].toLowerCase().slice(0, 3);
      const month = MONTH_MAP[monthWord];
      if (month) {
        const year = match[3] || new Date().getFullYear().toString();
        return { dateStr: formatDate(year, month, day), matchedText: match[0] };
      }
    }
    
    match = line.match(regexDateTextualReverse);
    if (match) {
      const monthWord = match[1].toLowerCase().slice(0, 3);
      const month = MONTH_MAP[monthWord];
      if (month) {
        const day = match[2];
        const year = new Date().getFullYear().toString();
        return { dateStr: formatDate(year, month, day), matchedText: match[0] };
      }
    }
    
    return null;
  };
  
  // Standard parser for multi-line bank statement transaction rows
  if (mode === 'statement' || mode === 'auto') {
    let currentDate = todayStr;

    const getRelativeDateStr = (daysAgo: number): string => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // A. Check if line is just a date header
      if (line.toLowerCase() === 'today') {
        currentDate = todayStr;
        continue;
      }
      if (line.toLowerCase() === 'yesterday') {
        currentDate = getRelativeDateStr(1);
        continue;
      }

      // Check standalone calendar date
      const dateInfo = extractDateFromLine(line);
      if (dateInfo && line.replace(dateInfo.matchedText, '').trim().length < 3) {
        currentDate = dateInfo.dateStr;
        continue;
      }

      // B. Look for amount candidate on this line
      const cleanLine = line.replace(/,/g, '');
      // Match negative numbers, decimals, or standard integers
      const amountMatches = cleanLine.match(/-?\d+\.\d{2}\b/) || cleanLine.match(/\b\d{2,}\b/);
      
      if (amountMatches) {
        const amountStr = amountMatches[0];
        const parsedAmount = Math.abs(parseFloat(amountStr));
        if (isNaN(parsedAmount) || parsedAmount <= 1) continue;

        let description = line.replace(amountStr, '').trim();

        // Peek next line to check if it's the details/merchant line
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const nextLineHasAmount = nextLine.replace(/,/g, '').match(/\d+\.\d{2}\b/) || nextLine.match(/\b\d{2,}\b/);
          const nextLineIsDate = nextLine.toLowerCase() === 'today' || nextLine.toLowerCase() === 'yesterday' || extractDateFromLine(nextLine) !== null;

          if (!nextLineHasAmount && !nextLineIsDate && nextLine.trim().length > 1) {
            description += ' - ' + nextLine.trim();
            i++; // skip next line
          }
        }

        // Determine Type (income or expense)
        let type: 'income' | 'expense' = 'expense';
        if (amountStr.includes('-') || line.includes('-')) {
          type = 'expense';
        } else {
          const incomeKeywords = /\b(salary|credit|dep|deposit|interest|dividend|refund|cr|reversal|transfer\s+in|received)\b/i;
          const expenseKeywords = /\b(debit|dr|payment|purchase|charge|fee|pos|withdrawal|transfer\s+out|cash\s+out)\b/i;
          if (incomeKeywords.test(line) && !expenseKeywords.test(line)) {
            type = 'income';
          } else if (expenseKeywords.test(line) && !incomeKeywords.test(line)) {
            type = 'expense';
          } else {
            type = 'expense'; // default fallback
          }
        }

        // Clean description
        description = description
          .replace(/[\d,.]/g, '') // remove stray digits
          .replace(/\b(cr|dr|mur|rs|usd|eur|bal|balance)\b/gi, '') // remove currency/meta
          .replace(/[+\-*|/:_]/g, ' ') // remove symbols
          .replace(/\s+/g, ' ') // collapse whitespaces
          .trim();

        if (description.length < 2) {
          description = type === 'income' ? 'Deposit Transaction' : 'Purchase Transaction';
        }

        const category = suggestCategory(description, type);

        results.push({
          date: currentDate,
          description,
          amount: parsedAmount,
          type,
          category
        });
      }
    }
  }
  
  // If we wanted a single receipt, or statement parsing yielded nothing and mode was auto
  if (mode === 'receipt' || (results.length === 0 && mode === 'auto')) {
    const singleReceipt = parseReceiptText(text);
    if (singleReceipt.amount > 0) {
      // Extract a date from the receipt if possible
      let receiptDate = todayStr;
      const linesForDate = lines.slice(0, 15); // look in the first 15 lines
      for (const line of linesForDate) {
        const dInfo = extractDateFromLine(line);
        if (dInfo) {
          receiptDate = dInfo.dateStr;
          break;
        }
      }
      
      results.push({
        date: receiptDate,
        description: singleReceipt.description,
        amount: singleReceipt.amount,
        type: 'expense',
        category: singleReceipt.category
      });
    }
  }
  
  return results;
};

