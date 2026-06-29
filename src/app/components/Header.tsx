import { Menu, Settings, User } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

export function Header() {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      <header className="bg-[#0f1623] border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500 rounded-xl p-2 w-12 h-12 flex items-center justify-center">
              <span className="font-bold text-black text-lg">BEX</span>
            </div>
            <div>
              <h1 className="font-bold text-white text-lg">BEX Trader</h1>
              <p className="text-xs text-gray-400">AI trading terminal</p>
              <p className="text-xs text-gray-500">Updated Mar 29 • 9:30 AM</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-400">XAUUSD</p>
              <p className="font-bold text-white">4513.20</p>
              <p className="text-xs text-red-400">-0.01%</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <div className="flex items-center gap-2 text-xs text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
            Live terminal
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button className="px-4 py-2 bg-[#1a2332] text-white rounded-full text-sm font-medium border border-gray-700">
            XAUUSD
          </button>
          <button className="px-4 py-2 bg-[#0a0e1a] text-gray-400 rounded-full text-sm border border-gray-800">
            XAGUSD
          </button>
        </div>
      </header>

      {showMenu && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowMenu(false)}>
          <div
            className="absolute left-0 top-0 bottom-0 w-80 bg-gradient-to-b from-purple-900 to-purple-800 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowMenu(false)}
              className="absolute top-4 right-4 text-white"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-8 text-yellow-400">
              <span className="text-2xl">👑</span>
              <span className="font-bold text-xl">VIP Signals</span>
            </div>

            <nav className="space-y-4">
              <Link to="/signal" className="block text-white py-2" onClick={() => setShowMenu(false)}>
                Sign in
              </Link>
              <Link to="/stats" className="block text-white py-2" onClick={() => setShowMenu(false)}>
                Analysis
              </Link>
              <div className="block text-white py-2">Economic Calendar</div>
              <div className="block text-white py-2">Risk Disclaimer</div>
              <div className="block text-white py-2">Contact Us</div>
              <div className="block text-white py-2">FAQ</div>
              <div className="block text-white py-2">How To Use</div>
              <div className="block text-white py-2">Top Broker</div>
              <div className="block text-white py-2">About us</div>
              <div className="block text-white py-2">Privacy & Policy</div>
              <div className="block text-white py-2">Terms & Condition</div>
            </nav>

            <button className="mt-8 w-full bg-gradient-to-r from-blue-500 to-teal-400 text-white py-3 rounded-full font-medium">
              Sign In
            </button>
          </div>
        </div>
      )}
    </>
  );
}
