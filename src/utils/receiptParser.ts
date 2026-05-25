interface ParsedReceipt {
  description: string;
  amount: number;
  category: string;
}

export const parseReceiptText = (text: string): ParsedReceipt => {
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
    // If we have total keyword candidates, take the maximum or the last one
    amount = Math.max(...candidates);
  } else {
    // Fallback: search for any floating point numbers in the text and get the largest one
    const allMatches = text.replace(/,/g, '').match(/\d+\.\d{2}/g);
    if (allMatches) {
      const numbers = allMatches.map(m => parseFloat(m)).filter(val => val > 0 && val < 100000);
      if (numbers.length > 0) {
        amount = Math.max(...numbers);
      }
    }
  }
  
  // Heuristic 3: Auto-suggest category based on merchant name or line items
  let category = 'Shopping & Leisure'; // default
  const lowerText = text.toLowerCase();
  
  const categoryKeywords: Record<string, string[]> = {
    'Groceries': ['supermarket', 'grocer', 'food', 'mart', 'market', 'veg', 'meat', 'bakery', 'milk', 'shoprite', 'jumbo', 'winners', 'super u', 'provision', 'intermart'],
    'Dining & Café': ['restaurant', 'cafe', 'coffee', 'starbucks', 'bistro', 'pizza', 'kitchen', 'diner', 'burger', 'bar', 'sushi', 'grill', 'lounge', 'kfc', 'mcdonalds'],
    'Transport & Auto': ['fuel', 'gas', 'petrol', 'shell', 'total', 'engine', 'parking', 'taxi', 'uber', 'metro', 'car', 'bus', 'oil', 'filling station'],
    'Bills & Utilities': ['telecom', 'ceb', 'cwa', 'myt', 'emtel', 'internet', 'electricity', 'water', 'insurance', 'subscription', 'netflix', 'spotify', 'recharge'],
    'Health & Wellness': ['pharmacy', 'clinic', 'dentist', 'medical', 'hospital', 'doctor', 'drugstore', 'gym', 'health', 'fitness', 'spa'],
    'Education': ['book', 'school', 'university', 'college', 'course', 'tuition', 'class', 'stationery', 'library'],
    'Rent & Housing': ['rent', 'home', 'furniture', 'hardware', 'construction', 'bricolage', 'appliance', 'mr bricolage'],
  };
  
  for (const [catName, keywords] of Object.entries(categoryKeywords)) {
    const hasKeyword = keywords.some(keyword => lowerText.includes(keyword));
    if (hasKeyword) {
      category = catName;
      break;
    }
  }
  
  return {
    description: merchantName,
    amount,
    category
  };
};
