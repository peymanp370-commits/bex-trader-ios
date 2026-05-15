import { TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchPositions, Position } from "../utils/api";

interface LivePositionsProps {
  darkMode: boolean;
}

export function LivePositions({ darkMode }: LivePositionsProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);

  // Fetch positions from API
  useEffect(() => {
    const loadPositions = async () => {
      const data = await fetchPositions();
      if (data && data.positions) {
        setPositions(data.positions);
      } else {
        // If data is null or invalid, set empty array
        setPositions([]);
      }
      if (initialLoad) {
        setInitialLoad(false);
      }
    };

    loadPositions();
    // Refresh positions every 7 seconds
    const interval = setInterval(loadPositions, 7000);
    return () => clearInterval(interval);
  }, []);

  // Format timestamp to readable time
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Format date with time
  const formatDateTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  if (initialLoad) {
    return (
      <div className={`${darkMode ? 'bg-[#0f1623] border-gray-800/50' : 'bg-white border-gray-200'} rounded-2xl p-6 border`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <h3 className="text-yellow-400 font-bold text-sm tracking-widest">LIVE POSITIONS</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? 'bg-[#0f1623] border-gray-800/50' : 'bg-white border-gray-200'} rounded-2xl p-4 border`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <h3 className="text-yellow-400 font-bold text-xs tracking-widest">LIVE POSITIONS</h3>
        </div>
        <div className={`px-2 py-1 rounded-lg text-xs font-bold ${darkMode ? 'bg-[#1a2332]' : 'bg-gray-100'}`}>
          {positions.length} {positions.length === 1 ? 'Trade' : 'Trades'}
        </div>
      </div>

      {positions.length === 0 ? (
        <div className={`${darkMode ? 'bg-[#0a0e1a]' : 'bg-gray-50'} rounded-xl p-6 text-center`}>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No open positions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((position, index) => {
            const isProfit = position.profit >= 0;
            const isBuy = position.side === "BUY";
            
            return (
              <div
                key={index}
                className={`${
                  darkMode ? 'bg-[#1a2332] border-gray-700/50' : 'bg-gray-50 border-gray-200'
                } rounded-xl p-3 border hover:border-teal-500/50 transition-all`}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      isBuy 
                        ? 'bg-green-500/20' 
                        : 'bg-red-500/20'
                    }`}>
                      {isBuy ? (
                        <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{position.symbol}</h4>
                      <p className={`text-xs ${
                        isBuy ? 'text-green-400' : 'text-red-400'
                      } font-bold`}>
                        {position.side}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-bold text-sm ${
                      isProfit ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {isProfit ? '+' : ''}{position.profit.toFixed(2)} USD
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Vol: {position.volume}
                    </p>
                  </div>
                </div>

                {/* Price Information */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className={`${darkMode ? 'bg-[#0f1623]' : 'bg-white'} rounded-lg p-2`}>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Entry</p>
                    <p className="font-bold text-xs">{position.entry_price.toFixed(2)}</p>
                  </div>
                  <div className={`${darkMode ? 'bg-[#0f1623]' : 'bg-white'} rounded-lg p-2`}>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Current</p>
                    <p className="font-bold text-xs">{position.current_price.toFixed(2)}</p>
                  </div>
                </div>

                {/* Time and Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      position.status === "OPEN" ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                    }`}></div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {position.status}
                    </p>
                  </div>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {formatTime(position.open_time)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}