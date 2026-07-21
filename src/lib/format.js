/**
 * NEMS Formatting Utilities
 * Enforces Ghubariya (Latin) numerals (1, 2, 3...) in ALL contexts.
 * Uses 'en-US' locale base + forced latn numberingSystem to guarantee
 * Latin/Ghubariya digits regardless of browser locale or OS settings.
 */

// Helper: Convert any number to Ghubariya (Latin) digits string
// This replaces Eastern Arabic digits ٠١٢٣٤٥٦٧٨٩ with 0123456789
function toGhubariya(str) {
  return String(str)
    .replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 0x0660)  // Eastern Arabic
    .replace(/[\u06F0-\u06F9]/g, d => d.charCodeAt(0) - 0x06F0); // Extended Arabic-Indic
}

// Core: Format any number with Latin digits, comma thousands separator
function formatLatin(num, decimals = 0) {
  if (num === undefined || num === null || isNaN(Number(num))) num = 0;
  const n = Number(num);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals > 0 ? decimals : 2,
  }).format(n);
  // Double-check: strip any Eastern Arabic digits that may have slipped through
  return toGhubariya(formatted);
}

export function getPreferredCurrency() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('nems-preferred-currency') || 'MRU';
  }
  return 'MRU';
}

export function setPreferredCurrency(currency) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nems-preferred-currency', currency);
    window.dispatchEvent(new Event('currency-change'));
  }
}

export function convertCurrency(amount, from = 'MRU', to = 'MRU') {
  if (amount === undefined || amount === null || isNaN(amount)) return 0;
  if (from === to) return amount;
  if (from === 'USD' && to === 'MRU') return amount * 39;
  if (from === 'MRU' && to === 'USD') return amount / 39;
  return amount;
}

export function formatCurrency(amount, originalCurrency = 'MRU') {
  if (amount === undefined || amount === null || isNaN(amount)) amount = 0;

  const preferred = getPreferredCurrency();
  const convertedAmount = convertCurrency(Number(amount), originalCurrency, preferred);

  return `${formatLatin(convertedAmount)} ${preferred}`;
}

// Format a plain number with Latin/Ghubariya digits
export function formatNumber(num) {
  return formatLatin(num);
}

// Format a date string/Date object and replace any Arabic digits in the output
export function formatDate(dateInput, options = {}) {
  if (!dateInput) return '';
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const defaultOpts = { year: 'numeric', month: '2-digit', day: '2-digit', ...options };
    // Use 'en-GB' for dd/mm/yyyy style, or pass options for custom formats
    const formatted = d.toLocaleDateString('en-GB', defaultOpts);
    return toGhubariya(formatted);
  } catch {
    return toGhubariya(String(dateInput));
  }
}

// Format a date with Arabic weekday/month names but Latin digits
export function formatDateArabic(dateInput, options = {}) {
  if (!dateInput) return '';
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const defaultOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', ...options };
    const formatted = d.toLocaleDateString('ar-SA', defaultOpts);
    // Replace Eastern Arabic digits with Ghubariya
    return toGhubariya(formatted);
  } catch {
    return toGhubariya(String(dateInput));
  }
}
