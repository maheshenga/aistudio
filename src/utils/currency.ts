export type CurrencyCode = 'CNY' | 'USD' | 'EUR' | 'GBP' | 'JPY';

export interface ExchangeRateResponse {
  result: string;
  provider: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  time_eol_unix: number;
  base_code: string;
  rates: Record<string, number>;
}

class CurrencyConverterService {
  private rates: Record<string, number> = {
    CNY: 1,
    USD: 0.137,
    EUR: 0.126,
    GBP: 0.108,
    JPY: 21.05,
  };

  private symbols: Record<string, string> = {
    CNY: '¥',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
  };

  private currentCurrency: CurrencyCode = 'CNY';
  private subscribers: Set<(currency: CurrencyCode) => void> = new Set();
  private isFetching = false;

  constructor() {
    // Attempt to parse global preference from localStorage if any
    try {
      const stored = localStorage.getItem('globalCurrencyPref');
      if (stored && ['CNY', 'USD', 'EUR', 'GBP', 'JPY'].includes(stored)) {
        this.currentCurrency = stored as CurrencyCode;
      }
    } catch (e) {}
  }

  /**
   * Fetches real exchange rates from a valid public API (exchangerate-api.com).
   */
  async fetchRates() {
    if (this.isFetching) return;
    this.isFetching = true;
    try {
      // Using open.er-api.com which does not require API key for basic usage
      const response = await fetch('https://open.er-api.com/v6/latest/CNY');
      const data: ExchangeRateResponse = await response.json();
      
      if (data && data.rates) {
        this.rates = {
          CNY: 1,
          USD: data.rates.USD || this.rates.USD,
          EUR: data.rates.EUR || this.rates.EUR,
          GBP: data.rates.GBP || this.rates.GBP,
          JPY: data.rates.JPY || this.rates.JPY,
        };
      }
    } catch (error) {
      console.error("Failed to fetch exchange rates, using fallback values:", error);
    } finally {
      this.isFetching = false;
    }
  }

  setCurrency(currency: CurrencyCode) {
    this.currentCurrency = currency;
    try {
      localStorage.setItem('globalCurrencyPref', currency);
    } catch (e) {}
    this.notifySubscribers();
  }

  getCurrency(): CurrencyCode {
    return this.currentCurrency;
  }

  subscribe(callback: (currency: CurrencyCode) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.currentCurrency));
  }

  formatAmount(amountInCNY: number, forceCurrency?: CurrencyCode): string {
    const targetCurrency = forceCurrency || this.currentCurrency;
    const rate = this.rates[targetCurrency] || 1;
    const converted = amountInCNY * rate;
    
    return `${this.symbols[targetCurrency]} ${converted.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }

  // Parses a string like '¥ 124,500.00' to extract the CNY amount, then formats to global preference.
  formatString(amountStr: string): string {
    // If it's already formatting based on some other logic or missing amount, just return.
    // For safety, strip out all non-numeric (except dot and minus) 
    const isNegative = amountStr.includes('-');
    const numericPart = amountStr.replace(/[^0-9.]/g, '');
    if (!numericPart) return amountStr;

    const parsedBase = parseFloat(numericPart) * (isNegative ? -1 : 1);
    // Assuming the original string is always representing CNY base in the app's static data
    return this.formatAmount(parsedBase);
  }
}

export const CurrencyConverter = new CurrencyConverterService();

// Trigger a background fetch of real-time rates
CurrencyConverter.fetchRates();
