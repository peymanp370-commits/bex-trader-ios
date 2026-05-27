import { Menu, Settings, TrendingUp, TrendingDown, Calendar, Sun, Moon, Globe } from "lucide-react";
import { Link } from "react-router";
import { useState, useEffect, useRef } from "react";
import { SideMenu } from "../components/SideMenu";
import { BottomNav } from "../components/BottomNav";
import { LivePositions } from "../components/LivePositions";
import logoImage from "../../assets/bex-brand-logo.png";
import { fetchTradeHistory, fetchTradeStats, ClosedTrade, TradeStats } from "../utils/api";

interface SessionSummary {
  session: 'NEW_YORK' | 'LONDON' | 'ASIA';
  totalTrades: number;
  buyCount: number;
  sellCount: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnL: number;
  bestTrade: number;
  worstTrade: number;
}

interface DaySummary {
  date: string;
  totalTrades: number;
  wins: number;
  losses: number;
  totalPnL: number;
  buyCount: number;
  sellCount: number;
}

export function Results() {
  const [showMenu, setShowMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });
  const [trades, setTrades] = useState<ClosedTrade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  // Track loaded trade IDs to prevent duplicates
  const loadedTradeIds = useRef<Set<string>>(new Set());

  // Listen for theme changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('darkMode');
      setDarkMode(saved ? JSON.parse(saved) : true);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('themeChange', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themeChange', handleStorageChange);
    };
  }, []);

  // Generate unique trade ID
  const getTradeId = (trade: ClosedTrade): string => {
    return `${trade.symbol}_${trade.close_time}_${trade.entry_price}_${trade.exit_price}`;
  };

  // Fetch trade history with incremental append
  useEffect(() => {
    const loadTrades = async () => {
      // Fetch more trades to build comprehensive history
      const data = await fetchTradeHistory(100);
      if (data && data.trades) {
        setTrades(prevTrades => {
          const newTrades: ClosedTrade[] = [];
          
          data.trades.forEach(trade => {
            const tradeId = getTradeId(trade);
            if (!loadedTradeIds.current.has(tradeId)) {
              loadedTradeIds.current.add(tradeId);
              newTrades.push(trade);
            }
          });

          // Append new trades and sort by close_time descending
          const combined = [...prevTrades, ...newTrades];
          return combined.sort((a, b) => b.close_time - a.close_time);
        });
      }
      if (initialLoad) {
        setInitialLoad(false);
      }
    };

    loadTrades();
    // Refresh every 12 seconds
    const interval = setInterval(loadTrades, 12000);
    return () => clearInterval(interval);
  }, [initialLoad]);

  // Fetch statistics
  useEffect(() => {
    const loadStats = async () => {
      setSummaryLoading(true);
      const data = await fetchTradeStats();
      if (data && data.stats) {
        setStats(data.stats);
      }
      setSummaryLoading(false);
    };

    loadStats();
    // Refresh every 12 seconds
    const interval = setInterval(loadStats, 12000);
    return () => clearInterval(interval);
  }, []);

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  // Format date only
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Group trades by day
  const groupTradesByDay = () => {
    const grouped: { [key: string]: ClosedTrade[] } = {};
    trades.forEach(trade => {
      const dateKey = formatDate(trade.close_time);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(trade);
    });
    return grouped;
  };

  // Calculate daily summary
  const calculateDaySummary = (dayTrades: ClosedTrade[]) => {
    const totalPnL = dayTrades.reduce((sum, trade) => sum + trade.profit, 0);
    const wins = dayTrades.filter(t => t.profit > 0).length;
    const losses = dayTrades.filter(t => t.profit < 0).length;
    const totalTrades = dayTrades.length;
    const buyCount = dayTrades.filter(t => t.side === 'BUY').length;
    const sellCount = dayTrades.filter(t => t.side === 'SELL').length;
    return { totalPnL, wins, losses, totalTrades, buyCount, sellCount };
  };

  // Determine session based on UTC hour (simplified)
  const getSession = (timestamp: number): 'NEW_YORK' | 'LONDON' | 'ASIA' => {
    const date = new Date(timestamp);
    const hour = date.getUTCHours();
    
    // ASIA: 00:00 - 08:00 UTC
    if (hour >= 0 && hour < 8) return 'ASIA';
    // LONDON: 08:00 - 16:00 UTC
    if (hour >= 8 && hour < 16) return 'LONDON';
    // NEW_YORK: 16:00 - 24:00 UTC
    return 'NEW_YORK';
  };

  // Calculate session summaries
  const calculateSessionSummaries = (): SessionSummary[] => {
    const sessions: Record<string, ClosedTrade[]> = {
      NEW_YORK: [],
      LONDON: [],
      ASIA: [],
    };

    trades.forEach(trade => {
      const session = getSession(trade.close_time);
      sessions[session].push(trade);
    });

    return (['NEW_YORK', 'LONDON', 'ASIA'] as const).map(session => {
      const sessionTrades = sessions[session];
      const totalTrades = sessionTrades.length;
      const buyCount = sessionTrades.filter(t => t.side === 'BUY').length;
      const sellCount = sessionTrades.filter(t => t.side === 'SELL').length;
      const wins = sessionTrades.filter(t => t.profit > 0).length;
      const losses = sessionTrades.filter(t => t.profit < 0).length;
      const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
      const totalPnL = sessionTrades.reduce((sum, t) => sum + t.profit, 0);
      const bestTrade = sessionTrades.length > 0 ? Math.max(...sessionTrades.map(t => t.profit)) : 0;
      const worstTrade = sessionTrades.length > 0 ? Math.min(...sessionTrades.map(t => t.profit)) : 0;

      return {
        session,
        totalTrades,
        buyCount,
        sellCount,
        wins,
        losses,
        winRate,
        totalPnL,
        bestTrade,
        worstTrade,
      };
    });
  };

  // Calculate last 7 days summary
  const calculateLast7DaysSummary = (): DaySummary[] => {
    const result: DaySummary[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const dateStr = formatDate(targetDate.getTime());

      const dayTrades = trades.filter(trade => {
        const tradeDate = formatDate(trade.close_time);
        return tradeDate === dateStr;
      });

      const totalTrades = dayTrades.length;
      const wins = dayTrades.filter(t => t.profit > 0).length;
      const losses = dayTrades.filter(t => t.profit < 0).length;
      const totalPnL = dayTrades.reduce((sum, t) => sum + t.profit, 0);
      const buyCount = dayTrades.filter(t => t.side === 'BUY').length;
      const sellCount = dayTrades.filter(t => t.side === 'SELL').length;

      result.push({
        date: dateStr,
        totalTrades,
        wins,
        losses,
        totalPnL,
        buyCount,
        sellCount,
      });
    }

    return result;
  };

  const sessionSummaries = calculateSessionSummaries();
  const last7Days = calculateLast7DaysSummary();
  const groupedTrades = groupTradesByDay();

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#050812] text-white' : 'bg-[#f6f4ee] text-gray-950'} pb-24`}>
      <SideMenu isOpen={showMenu} onClose={() => setShowMenu(false)} />

      <header className={`${darkMode ? 'bg-gradient-to-br from-[#0f1728]/95 via-[#0b1220]/95 to-[#050812]/95 border-yellow-500/20 shadow-[0_0_35px_rgba(234,179,8,0.08)]' : 'bg-white border-gray-200'} p-4 border-b`}>
        <div className="flex items-center justify-between">
          <button onClick={() => setShowMenu(true)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-[#111a2a]' : 'hover:bg-gray-100'}`}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="BEX AI" className="h-[58px] w-[130px] object-contain object-center md:h-[72px] md:w-[160px]" />
            <div>
              <h1 className="font-bold text-lg md:text-xl leading-tight">BEX AI</h1>
              <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} leading-tight`}>GOLD TRADER</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
              (localStorage.getItem('userPlan') || 'PRO') === 'VIP' 
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black'
                : (localStorage.getItem('userPlan') || 'PRO') === 'PRO'
                ? 'bg-gradient-to-r from-teal-500 to-blue-500 text-white'
                : 'bg-gray-500 text-white'
            }`}>
              {localStorage.getItem('userPlan') || 'PRO'}
            </div>
            <Link to="/app/settings">
              <button className={`p-2 rounded-lg ${darkMode ? 'hover:bg-[#111a2a]' : 'hover:bg-gray-100'}`}>
                <Settings className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        <section className="relative overflow-hidden rounded-[1.65rem] border border-yellow-500/20 bg-gradient-to-br from-[#111a2a]/95 via-[#08101c]/95 to-[#050812]/95 p-5 shadow-[0_0_45px_rgba(234,179,8,0.08)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(59,130,246,0.12),transparent_28%)]" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400" /> BEX AI DESK</span>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">BEX Results</h1>
            <p className="mt-1 text-sm text-gray-400">Outcome tracking with a luxury trading dashboard</p>
          </div>
        </section>
      </div>


      <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
        {/* Live Positions */}
        <LivePositions darkMode={darkMode} />

        {/* Summary Stats */}
        <div className={`${darkMode ? 'bg-gradient-to-br from-[#0f1623] to-[#0a0e1a] border-yellow-500/20' : 'bg-white border-yellow-500/30'} rounded-[1.35rem] p-5 border backdrop-blur-md`}>
          <h2 className="text-yellow-400 text-xs font-bold tracking-widest mb-4">📊 SUMMARY</h2>
          {initialLoad || !stats ? (
            <div className="text-center py-8">
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading stats...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className={`${darkMode ? 'bg-[#111a2a]/50 border-yellow-500/20' : 'bg-gray-50 border-gray-200'} rounded-2xl p-4 border`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Total Trades</p>
                <p className="text-2xl font-bold">{stats.total_trades || 0}</p>
              </div>
              <div className={`${darkMode ? 'bg-[#111a2a]/50 border-yellow-500/20' : 'bg-gray-50 border-gray-200'} rounded-2xl p-4 border`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Wins</p>
                <p className="text-2xl font-bold text-green-400">{stats.wins || 0}</p>
              </div>
              <div className={`${darkMode ? 'bg-[#111a2a]/50 border-yellow-500/20' : 'bg-gray-50 border-gray-200'} rounded-2xl p-4 border`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Losses</p>
                <p className="text-2xl font-bold text-red-400">{stats.losses || 0}</p>
              </div>
              <div className={`${darkMode ? 'bg-[#111a2a]/50 border-yellow-500/20' : 'bg-gray-50 border-gray-200'} rounded-2xl p-4 border`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Avg PnL</p>
                <p className={`text-2xl font-bold ${(stats.average_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(stats.average_pnl || 0).toFixed(2)}
                </p>
              </div>
              <div className={`${darkMode ? 'bg-[#111a2a]/50 border-yellow-500/20' : 'bg-gray-50 border-gray-200'} rounded-2xl p-4 border col-span-2`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Total PnL</p>
                <p className={`text-3xl font-bold ${(stats.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(stats.total_pnl || 0) >= 0 ? '+' : ''}{(stats.total_pnl || 0).toFixed(2)} USD
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Session Summaries */}
        {!initialLoad && trades.length > 0 && (
          <div>
            <h3 className="text-yellow-400 text-xs font-bold tracking-widest mb-3">🌍 SESSION SUMMARY</h3>
            <div className="space-y-3">
              {sessionSummaries.map((session) => {
                const icon = session.session === 'NEW_YORK' ? Sun : session.session === 'LONDON' ? Globe : Moon;
                const IconComponent = icon;
                
                return (
                  <div
                    key={session.session}
                    className={`${darkMode ? 'bg-gradient-to-br from-[#0f1728]/95 via-[#0b1220]/95 to-[#050812]/95 border-yellow-500/20 shadow-[0_0_35px_rgba(234,179,8,0.08)]' : 'bg-white border-gray-200'} rounded-2xl p-4 border`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <IconComponent className="w-5 h-5 text-yellow-400" />
                        <div>
                          <h4 className="font-bold text-base">{session.session.replace('_', ' ')}</h4>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {session.totalTrades} trades • {session.winRate.toFixed(0)}% WR
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${session.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {session.totalPnL >= 0 ? '+' : ''}{session.totalPnL.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className={`${darkMode ? 'bg-[#111a2a]/50 border-yellow-500/20' : 'bg-gray-50 border-gray-200'} rounded-lg p-2 border text-center`}>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>BUY</p>
                        <p className="text-sm font-bold">{session.buyCount}</p>
                      </div>
                      <div className={`${darkMode ? 'bg-[#111a2a]/50 border-yellow-500/20' : 'bg-gray-50 border-gray-200'} rounded-lg p-2 border text-center`}>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>SELL</p>
                        <p className="text-sm font-bold">{session.sellCount}</p>
                      </div>
                      <div className={`${darkMode ? 'bg-[#111a2a]/50 border-yellow-500/20' : 'bg-gray-50 border-gray-200'} rounded-lg p-2 border text-center`}>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>WINS</p>
                        <p className="text-sm font-bold text-green-400">{session.wins}</p>
                      </div>
                      <div className={`${darkMode ? 'bg-[#111a2a]/50 border-yellow-500/20' : 'bg-gray-50 border-gray-200'} rounded-lg p-2 border text-center`}>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>LOSS</p>
                        <p className="text-sm font-bold text-red-400">{session.losses}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className={`${darkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-300'} rounded-lg p-2 border`}>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Best Trade</p>
                        <p className="text-sm font-bold text-green-400">+{session.bestTrade.toFixed(2)}</p>
                      </div>
                      <div className={`${darkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-300'} rounded-lg p-2 border`}>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Worst Trade</p>
                        <p className="text-sm font-bold text-red-400">{session.worstTrade.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Last 7 Days Result */}
        {!initialLoad && last7Days.length > 0 && (
          <div>
            <h3 className="text-yellow-400 text-xs font-bold tracking-widest mb-3">📅 LAST 7 DAYS RESULT</h3>
            <div className="space-y-2">
              {last7Days.map((day, index) => (
                <div
                  key={day.date}
                  className={`${darkMode ? 'bg-gradient-to-br from-[#0f1728]/95 via-[#0b1220]/95 to-[#050812]/95 border-yellow-500/20 shadow-[0_0_35px_rgba(234,179,8,0.08)]' : 'bg-white border-gray-200'} rounded-xl p-3 border`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Calendar className={`w-4 h-4 ${day.totalPnL > 0 ? 'text-green-400' : day.totalPnL < 0 ? 'text-red-400' : 'text-gray-400'}`} />
                      <div>
                        <h4 className="font-bold text-sm">{day.date}</h4>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{day.totalTrades} trades</p>
                      </div>
                    </div>
                    <p className={`font-bold text-base ${day.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {day.totalPnL >= 0 ? '+' : ''}{day.totalPnL.toFixed(2)}
                    </p>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className={`${darkMode ? 'bg-[#111a2a]/30' : 'bg-gray-50'} rounded px-2 py-1 text-center`}>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>BUY</p>
                      <p className="text-xs font-bold">{day.buyCount}</p>
                    </div>
                    <div className={`${darkMode ? 'bg-[#111a2a]/30' : 'bg-gray-50'} rounded px-2 py-1 text-center`}>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>SELL</p>
                      <p className="text-xs font-bold">{day.sellCount}</p>
                    </div>
                    <div className={`${darkMode ? 'bg-[#111a2a]/30' : 'bg-gray-50'} rounded px-2 py-1 text-center`}>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>W</p>
                      <p className="text-xs font-bold text-green-400">{day.wins}</p>
                    </div>
                    <div className={`${darkMode ? 'bg-[#111a2a]/30' : 'bg-gray-50'} rounded px-2 py-1 text-center`}>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>L</p>
                      <p className="text-xs font-bold text-red-400">{day.losses}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last 7 Closed Trades */}
        <div>
          <h3 className="text-yellow-400 text-xs font-bold tracking-widest mb-3">📋 LAST 7 CLOSED TRADES</h3>
          {initialLoad ? (
            <div className={`${darkMode ? 'bg-[#0b1220]' : 'bg-white'} rounded-2xl p-8 text-center`}>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading trades...</p>
            </div>
          ) : trades.length === 0 ? (
            <div className={`${darkMode ? 'bg-[#0b1220]' : 'bg-white'} rounded-2xl p-8 text-center border ${darkMode ? 'border-yellow-500/20' : 'border-gray-200'}`}>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No recent results</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.keys(groupedTrades).map((dateKey) => {
                const dayTrades = groupedTrades[dateKey];
                const daySummary = calculateDaySummary(dayTrades);
                
                return (
                  <div
                    key={dateKey}
                    className={`${darkMode ? 'bg-[#0b1220]' : 'bg-white'} rounded-2xl p-4 border ${
                      daySummary.totalPnL > 0
                        ? darkMode ? "border-green-500/30" : "border-green-300"
                        : daySummary.totalPnL < 0
                        ? darkMode ? "border-red-500/30" : "border-red-300"
                        : darkMode ? "border-gray-700" : "border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {daySummary.totalPnL > 0 ? (
                          <TrendingUp className="w-5 h-5 text-green-400" />
                        ) : daySummary.totalPnL < 0 ? (
                          <TrendingDown className="w-5 h-5 text-red-400" />
                        ) : (
                          <Calendar className="w-5 h-5 text-gray-400" />
                        )}
                        <div>
                          <h3 className="font-bold text-base">{dateKey}</h3>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {daySummary.totalTrades} trades
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`px-3 py-1 rounded-lg font-bold text-xs mb-1 ${
                            daySummary.totalPnL > 0
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {daySummary.totalPnL > 0 ? 'WIN' : daySummary.totalPnL < 0 ? 'LOSS' : 'BREAKEVEN'}
                        </div>
                        <p
                          className={`font-bold text-base ${
                            daySummary.totalPnL > 0
                              ? "text-green-400"
                              : daySummary.totalPnL < 0
                              ? "text-red-400"
                              : "text-gray-400"
                          }`}
                        >
                          {daySummary.totalPnL >= 0 ? '+' : ''}{daySummary.totalPnL.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className={`${darkMode ? 'bg-[#111a2a]/50 border-yellow-500/20' : 'bg-gray-50 border-gray-200'} rounded-lg p-2 border`}>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Wins</p>
                        <p className="text-sm font-bold">{daySummary.wins}</p>
                      </div>
                      <div className={`${darkMode ? 'bg-[#111a2a]/50 border-yellow-500/20' : 'bg-gray-50 border-gray-200'} rounded-lg p-2 border`}>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Losses</p>
                        <p className="text-sm font-bold">{daySummary.losses}</p>
                      </div>
                      <div className={`${darkMode ? 'bg-[#111a2a]/50 border-yellow-500/20' : 'bg-gray-50 border-gray-200'} rounded-lg p-2 border`}>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Trades</p>
                        <p className="text-sm font-bold">{daySummary.totalTrades}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}