import { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';

interface CurrencyConverterProps {
  rates: { [key: string]: number };
}

export function CurrencyConverter({ rates }: CurrencyConverterProps) {
  const [amount, setAmount] = useState('1000');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');

  const currencies = Object.keys(rates);

  const convertedAmount = () => {
    const value = parseFloat(amount) || 0;
    if (fromCurrency === toCurrency) return value;
    
    // Convert to USD first (base currency), then to target
    const inUSD = fromCurrency === 'USD' ? value : value / rates[fromCurrency];
    const result = toCurrency === 'USD' ? inUSD : inUSD * rates[toCurrency];
    return result;
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-yellow-600/20">
      <h3 className="font-bold text-xl mb-6 text-yellow-500 flex items-center gap-2">
        <span className="w-1 h-6 bg-yellow-500 rounded-full"></span>
        Currency Converter
      </h3>
      
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-white placeholder-gray-500"
            placeholder="Enter amount"
          />
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">From</label>
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-white"
            >
              {currencies.map(curr => (
                <option key={curr} value={curr}>{curr}</option>
              ))}
            </select>
          </div>

          <button
            onClick={swapCurrencies}
            className="mb-2 p-3 hover:bg-yellow-500/10 rounded-lg transition-colors border border-yellow-600/20"
          >
            <ArrowLeftRight className="w-5 h-5 text-yellow-500" />
          </button>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">To</label>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-white"
            >
              {currencies.map(curr => (
                <option key={curr} value={curr}>{curr}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 p-5 rounded-xl mt-4 border border-yellow-500/20">
          <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Converted Amount</div>
          <div className="text-4xl font-bold text-yellow-500 mb-2">
            {convertedAmount().toFixed(2)} <span className="text-2xl text-gray-300">{toCurrency}</span>
          </div>
          <div className="text-sm text-gray-400 mt-2">
            1 {fromCurrency} = {(convertedAmount() / (parseFloat(amount) || 1)).toFixed(4)} {toCurrency}
          </div>
        </div>
      </div>
    </div>
  );
}