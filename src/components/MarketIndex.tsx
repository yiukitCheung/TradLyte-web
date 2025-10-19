import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

const MarketIndex = () => {
  // Generate mock time series data (last 7 days)
  const generateTimeSeriesData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      day,
      'S&P 500': Math.random() * 100 + 4700,
      'Dow Jones': Math.random() * 1000 + 37000,
      'NASDAQ': Math.random() * 500 + 15000,
      'Bitcoin': Math.random() * 2000 + 51000,
      'Technology': Math.random() * 200 + 3100,
      'Healthcare': Math.random() * 100 + 1800,
      'Financial': Math.random() * 150 + 2000,
      'Energy': Math.random() * 100 + 1500,
      'Consumer': Math.random() * 150 + 2400,
      'Industrial': Math.random() * 100 + 1900,
      'Materials': Math.random() * 80 + 1300,
      'Utilities': Math.random() * 50 + 950,
      'Crude Oil': Math.random() * 5 + 76,
      'Gold': Math.random() * 50 + 2010,
      'Silver': Math.random() * 2 + 22,
      'Natural Gas': Math.random() * 0.5 + 2.5,
    }));
  };

  const [chartData] = useState(generateTimeSeriesData());
  
  const allIndices = [
    { id: 'S&P 500', name: 'S&P 500', category: 'Major', color: 'hsl(var(--chart-1))' },
    { id: 'Dow Jones', name: 'Dow Jones', category: 'Major', color: 'hsl(var(--chart-2))' },
    { id: 'NASDAQ', name: 'NASDAQ', category: 'Major', color: 'hsl(var(--chart-3))' },
    { id: 'Bitcoin', name: 'Bitcoin', category: 'Major', color: 'hsl(var(--chart-4))' },
    { id: 'Technology', name: 'Technology', category: 'Sector', color: 'hsl(var(--chart-5))' },
    { id: 'Healthcare', name: 'Healthcare', category: 'Sector', color: 'hsl(var(--chart-1))' },
    { id: 'Financial', name: 'Financial', category: 'Sector', color: 'hsl(var(--chart-2))' },
    { id: 'Energy', name: 'Energy', category: 'Sector', color: 'hsl(var(--chart-3))' },
    { id: 'Consumer', name: 'Consumer', category: 'Sector', color: 'hsl(var(--chart-4))' },
    { id: 'Industrial', name: 'Industrial', category: 'Sector', color: 'hsl(var(--chart-5))' },
    { id: 'Materials', name: 'Materials', category: 'Sector', color: 'hsl(var(--chart-1))' },
    { id: 'Utilities', name: 'Utilities', category: 'Sector', color: 'hsl(var(--chart-2))' },
    { id: 'Crude Oil', name: 'Crude Oil', category: 'Commodity', color: 'hsl(var(--chart-3))' },
    { id: 'Gold', name: 'Gold', category: 'Commodity', color: 'hsl(var(--chart-4))' },
    { id: 'Silver', name: 'Silver', category: 'Commodity', color: 'hsl(var(--chart-5))' },
    { id: 'Natural Gas', name: 'Natural Gas', category: 'Commodity', color: 'hsl(var(--chart-1))' },
  ];

  const [selectedIndices, setSelectedIndices] = useState<string[]>(['S&P 500', 'NASDAQ', 'Technology']);

  // Sentiment indices (0-100 scale)
  const fearIndex = 32; // Low = Greedy, High = Fearful
  const sectorSentiment = 68; // Market sector health
  const chaosIndex = 45; // Commodity volatility

  const GaugeCard = ({ 
    title, 
    value, 
    subtitle, 
    color 
  }: { 
    title: string; 
    value: number; 
    subtitle: string; 
    color: string;
  }) => {
    const gaugeData = [
      { value: value, fill: color },
      { value: 100 - value, fill: "hsl(var(--muted) / 0.2)" },
    ];

    const getSentiment = (val: number) => {
      if (title === "Fear Index") {
        if (val < 30) return { text: "Extreme Greed", color: "text-primary" };
        if (val < 50) return { text: "Greed", color: "text-primary" };
        if (val < 70) return { text: "Fear", color: "text-destructive" };
        return { text: "Extreme Fear", color: "text-destructive" };
      } else if (title === "Chaos Index") {
        if (val < 40) return { text: "Stable", color: "text-primary" };
        if (val < 60) return { text: "Moderate", color: "text-foreground" };
        return { text: "Volatile", color: "text-destructive" };
      } else {
        if (val < 40) return { text: "Bearish", color: "text-destructive" };
        if (val < 60) return { text: "Neutral", color: "text-foreground" };
        return { text: "Bullish", color: "text-primary" };
      }
    };

    const sentiment = getSentiment(value);

    return (
      <Card className="shadow-card border-border/50 hover-scale bg-gradient-to-br from-card to-card/50">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <div className="w-40 h-40 animate-scale-in relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gaugeData}
                    cx="50%"
                    cy="50%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={50}
                    outerRadius={70}
                    dataKey="value"
                    animationDuration={800}
                    strokeWidth={0}
                  >
                    {gaugeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-3xl font-bold text-foreground">{value}</div>
              </div>
            </div>
            <div className="text-center space-y-1 animate-fade-in">
              <div className={`text-lg font-semibold ${sentiment.color}`}>{sentiment.text}</div>
              <div className="text-xs text-muted-foreground">{subtitle}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const toggleIndex = (indexId: string) => {
    setSelectedIndices(prev => 
      prev.includes(indexId) 
        ? prev.filter(id => id !== indexId)
        : [...prev, indexId]
    );
  };

  const categories = ['Major', 'Sector', 'Commodity'];

  return (
    <div className="space-y-6">
      {/* Sentiment Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GaugeCard
          title="Fear Index"
          value={fearIndex}
          subtitle="Market Fear & Greed"
          color="hsl(var(--chart-1))"
        />
        <GaugeCard
          title="Sector Sentiment"
          value={sectorSentiment}
          subtitle="Industry Health Score"
          color="hsl(var(--chart-2))"
        />
        <GaugeCard
          title="Chaos Index"
          value={chaosIndex}
          subtitle="Commodity Volatility"
          color="hsl(var(--chart-3))"
        />
      </div>

      {/* Composite Line Chart */}
      <Card className="shadow-card border-border/50 animate-fade-in">
        <CardHeader>
          <CardTitle className="text-xl">Market Overview - 7 Day Trend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Chart */}
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="day" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Legend />
                {allIndices
                  .filter(index => selectedIndices.includes(index.id))
                  .map(index => (
                    <Line
                      key={index.id}
                      type="monotone"
                      dataKey={index.id}
                      stroke={index.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      animationDuration={800}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Index Selection Checkboxes */}
          <div className="space-y-4">
            {categories.map(category => (
              <div key={category} className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">{category} Indices</h3>
                <div className="flex flex-wrap gap-4">
                  {allIndices
                    .filter(index => index.category === category)
                    .map(index => (
                      <div key={index.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={index.id}
                          checked={selectedIndices.includes(index.id)}
                          onCheckedChange={() => toggleIndex(index.id)}
                        />
                        <label
                          htmlFor={index.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                        >
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: index.color }}
                          />
                          {index.name}
                        </label>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketIndex;
