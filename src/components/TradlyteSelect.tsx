import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Sparkles, Pause, Play } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useState, useEffect, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";

interface Strategy {
  id: string;
  name: string;
  description: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  baseMultiplier: number;
}

const strategies: Strategy[] = [
  { id: 'momentum', name: 'Momentum Alpha', description: 'Trend-following strategy', riskLevel: 'Medium', baseMultiplier: 1.15 },
  { id: 'value', name: 'Value Hunter', description: 'Undervalued stock picker', riskLevel: 'Low', baseMultiplier: 1.08 },
  { id: 'growth', name: 'Growth Engine', description: 'High-growth opportunities', riskLevel: 'High', baseMultiplier: 1.22 },
  { id: 'dividend', name: 'Dividend Shield', description: 'Income-focused stability', riskLevel: 'Low', baseMultiplier: 1.05 },
  { id: 'tech', name: 'Tech Surge', description: 'Technology sector focus', riskLevel: 'High', baseMultiplier: 1.28 },
  { id: 'balanced', name: 'Balanced Core', description: 'Diversified approach', riskLevel: 'Medium', baseMultiplier: 1.12 },
];

const generateChartData = (strategyMultiplier: number, strategyName: string) => {
  const data = [];
  let sp500 = 100, strategy = 100;
  const startDate = new Date(2022, 0);
  
  const marketEvents = [
    { month: 3, sp500Impact: -0.08, strategyImpact: -0.05 * strategyMultiplier },
    { month: 6, sp500Impact: -0.12, strategyImpact: -0.07 * strategyMultiplier },
    { month: 9, sp500Impact: 0.06, strategyImpact: 0.08 * strategyMultiplier },
    { month: 14, sp500Impact: -0.06, strategyImpact: -0.03 * strategyMultiplier },
    { month: 18, sp500Impact: -0.10, strategyImpact: -0.06 * strategyMultiplier },
    { month: 22, sp500Impact: 0.08, strategyImpact: 0.10 * strategyMultiplier },
    { month: 28, sp500Impact: -0.04, strategyImpact: -0.02 * strategyMultiplier },
    { month: 32, sp500Impact: 0.05, strategyImpact: 0.07 * strategyMultiplier },
  ];
  
  for (let i = 0; i < 36; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    
    if (i > 0) {
      const baseVolatility = 0.04;
      const sp500Change = (Math.random() - 0.45) * baseVolatility;
      const strategyChange = (Math.random() - 0.40) * baseVolatility * strategyMultiplier;
      
      const event = marketEvents.find(e => e.month === i);
      if (event) {
        sp500 *= 1 + event.sp500Impact + (Math.random() * 0.02 - 0.01);
        strategy *= 1 + event.strategyImpact + (Math.random() * 0.02 - 0.01);
      } else {
        sp500 *= 1 + sp500Change;
        strategy *= 1 + strategyChange;
      }
      
      sp500 *= 1 + (Math.random() * 0.02 - 0.01);
      strategy *= 1 + (Math.random() * 0.015 - 0.005);
    }
    
    data.push({
      month: label,
      'S&P 500': parseFloat(sp500.toFixed(2)),
      [strategyName]: parseFloat(strategy.toFixed(2)),
    });
  }
  return data;
};

const TradlyteSelect = () => {
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>(strategies[0]);
  const [isPaused, setIsPaused] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  const chartData = useMemo(() => 
    generateChartData(selectedStrategy.baseMultiplier, selectedStrategy.name),
    [selectedStrategy.id]
  );

  const strategyReturn = ((chartData[chartData.length - 1][selectedStrategy.name] - 100)).toFixed(1);
  const sp500Return = ((chartData[chartData.length - 1]['S&P 500'] - 100)).toFixed(1);
  const outperformance = (parseFloat(strategyReturn) - parseFloat(sp500Return)).toFixed(1);

  // Auto-scroll animation
  useEffect(() => {
    if (!scrollRef.current || isPaused) return;

    const scrollContainer = scrollRef.current;
    const scrollWidth = scrollContainer.scrollWidth / 2; // Divided by 2 since we duplicate content
    
    const animate = () => {
      setScrollPosition(prev => {
        const newPos = prev + 0.5;
        if (newPos >= scrollWidth) return 0;
        return newPos;
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollPosition;
    }
  }, [scrollPosition]);

  const handleStrategyHover = (strategy: Strategy) => {
    setIsPaused(true);
    setSelectedStrategy(strategy);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const riskColors = {
    Low: 'bg-green-500/10 text-green-600 border-green-500/20',
    Medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    High: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  // Duplicate strategies for infinite scroll effect
  const duplicatedStrategies = [...strategies, ...strategies];

  return (
    <div className="space-y-8">
      {/* Strategy Tiles Carousel */}
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {isPaused ? (
              <>
                <Pause className="w-4 h-4" />
                Paused - Viewing {selectedStrategy.name}
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Hover to pause and view details
              </>
            )}
          </p>
        </div>
        
        <div 
          ref={scrollRef}
          className="overflow-hidden"
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex gap-4" style={{ width: 'max-content' }}>
            {duplicatedStrategies.map((strategy, index) => (
              <Card
                key={`${strategy.id}-${index}`}
                className={`min-w-[220px] cursor-pointer transition-all duration-300 border-2 ${
                  selectedStrategy.id === strategy.id && isPaused
                    ? 'border-primary shadow-lg scale-105'
                    : 'border-border/50 hover:border-primary/50'
                }`}
                onMouseEnter={() => handleStrategyHover(strategy)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <Badge variant="outline" className={`text-xs ${riskColors[strategy.riskLevel]}`}>
                      {strategy.riskLevel}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{strategy.name}</h3>
                  <p className="text-xs text-muted-foreground">{strategy.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <Card className="shadow-card border-border/50 animate-fade-in">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-xl font-display flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {selectedStrategy.name} vs Market
              </CardTitle>
              <p className="text-muted-foreground text-sm mt-1">3-year performance comparison</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary" className="text-sm py-1.5 px-3">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Strategy: <span className="text-primary font-semibold ml-1">+{strategyReturn}%</span>
              </Badge>
              <Badge variant="outline" className="text-sm py-1.5 px-3 border-primary/30 bg-primary/5">
                <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-primary" />
                +{outperformance}% vs S&P
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  interval={5}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  domain={[90, 'auto']}
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    color: 'hsl(var(--foreground))',
                    boxShadow: '0 4px 12px hsl(var(--foreground) / 0.1)'
                  }}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(2)}%`,
                    name
                  ]}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="S&P 500"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  strokeOpacity={0.6}
                />
                <Line
                  type="monotone"
                  dataKey={selectedStrategy.name}
                  stroke="hsl(var(--primary))"
                  strokeWidth={4}
                  dot={false}
                  activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-center gap-8 mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 rounded-full bg-muted-foreground opacity-60" />
              <span className="text-sm text-muted-foreground">S&P 500</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 rounded-full bg-primary" />
              <span className="text-sm font-semibold text-foreground">{selectedStrategy.name}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradlyteSelect;
