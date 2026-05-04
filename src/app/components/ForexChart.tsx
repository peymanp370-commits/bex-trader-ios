import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface ForexChartProps {
  data: Array<{ time: string; rate: number }>;
  currencyPair: string;
}

export function ForexChart({ data, currencyPair }: ForexChartProps) {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-yellow-600/20">
      <h3 className="font-bold text-xl mb-6 text-yellow-500 flex items-center gap-2">
        <span className="w-1 h-6 bg-yellow-500 rounded-full"></span>
        {currencyPair} Exchange Rate
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="time" 
            stroke="#9ca3af"
            style={{ fontSize: '11px' }}
            tick={{ fill: '#9ca3af' }}
          />
          <YAxis 
            stroke="#9ca3af"
            style={{ fontSize: '11px' }}
            domain={['auto', 'auto']}
            tick={{ fill: '#9ca3af' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1f2937', 
              border: '1px solid #ca8a04',
              borderRadius: '12px',
              color: '#fff'
            }}
            labelStyle={{ color: '#eab308' }}
          />
          <Area 
            type="monotone" 
            dataKey="rate" 
            stroke="#eab308" 
            strokeWidth={3}
            fill="url(#colorRate)"
            name="Exchange Rate"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}