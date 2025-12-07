import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, AlertCircle, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Condition } from "@/pages/StrategyBuilder";

interface PerformanceChartProps {
  isSimulating: boolean;
  conditions: Condition[];
}

const stockOptions = [
  { value: "all", label: "All Stocks (General)", baseReturn: 8 },
  { value: "aapl", label: "AAPL - Apple Inc.", baseReturn: 12 },
  { value: "googl", label: "GOOGL - Alphabet", baseReturn: 10 },
  { value: "msft", label: "MSFT - Microsoft", baseReturn: 11 },
  { value: "tsla", label: "TSLA - Tesla", baseReturn: 15 },
  { value: "amzn", label: "AMZN - Amazon", baseReturn: 9 },
  { value: "nvda", label: "NVDA - NVIDIA", baseReturn: 18 },
];

// Calculate strategy multiplier based on conditions
const calculateStrategyMultiplier = (conditions: Condition[]): number => {
  if (conditions.length === 0) return 1;
  
  let multiplier = 1;
  
  conditions.forEach(condition => {
    switch (condition.type) {
      case "moving_average":
        multiplier += 0.15;
        break;
      case "rsi":
        multiplier += 0.18;
        break;
      case "volume":
        multiplier += 0.12;
        break;
      case "macd":
        multiplier += 0.2;
        break;
      case "bollinger":
        multiplier += 0.22;
        break;
      case "fibonacci":
        multiplier += 0.25;
        break;
      case "price_action":
        multiplier += 0.1;
        break;
      case "momentum":
        multiplier += 0.16;
        break;
      case "support_resistance":
        multiplier += 0.14;
        break;
      default:
        multiplier += 0.1;
    }
  });
  
  // Diminishing returns for too many conditions
  if (conditions.length > 3) {
    multiplier *= 0.9;
  }
  
  return Math.min(multiplier, 2.5); // Cap at 2.5x
};

const generateChartData = (stockBaseReturn: number, strategyMultiplier: number) => {
  const data = [];
  const events = [
    { month: 3, label: "Fed Rate Decision", impact: -5 },
    { month: 7, label: "Earnings Season", impact: 8 },
    { month: 10, label: "Market Correction", impact: -12 },
  ];
  
  let marketValue = 100;
  let strategyValue = 100;
  
  // Adjust volatility based on stock
  const volatility = stockBaseReturn / 10;
  
  for (let i = 0; i < 12; i++) {
    const event = events.find(e => e.month === i);
    const randomFactor = (Math.random() - 0.48) * volatility;
    
    const marketChange = event ? event.impact : randomFactor;
    // Strategy performs better with higher multiplier
    const strategyChange = event 
      ? event.impact * (0.5 + strategyMultiplier * 0.2) 
      : randomFactor * strategyMultiplier;
    
    marketValue += marketChange;
    strategyValue += strategyChange;
    
    data.push({
      month: `Month ${i + 1}`,
      market: Math.round(marketValue * 10) / 10,
      strategy: Math.round(strategyValue * 10) / 10,
      event: event?.label,
    });
  }
  
  return data;
};

const chartConfig = {
  market: {
    label: "Market Index",
    color: "hsl(var(--muted-foreground))",
  },
  strategy: {
    label: "Your Strategy",
    color: "hsl(var(--primary))",
  },
};

const PerformanceChart = ({ isSimulating, conditions }: PerformanceChartProps) => {
  const [selectedStock, setSelectedStock] = useState("all");
  const [chartKey, setChartKey] = useState(0);
  
  const stock = stockOptions.find(s => s.value === selectedStock) || stockOptions[0];
  const strategyMultiplier = calculateStrategyMultiplier(conditions);
  
  // Regenerate chart when conditions or stock changes
  const chartData = useMemo(() => {
    return generateChartData(stock.baseReturn, strategyMultiplier);
  }, [stock.baseReturn, strategyMultiplier, chartKey]);
  
  // Trigger chart regeneration when conditions change
  useEffect(() => {
    if (conditions.length > 0) {
      setChartKey(prev => prev + 1);
    }
  }, [conditions.length]);
  
  const finalMarket = chartData[chartData.length - 1].market;
  const finalStrategy = chartData[chartData.length - 1].strategy;
  const outperformance = ((finalStrategy - finalMarket) / finalMarket * 100).toFixed(1);
  
  const hasConditions = conditions.length > 0;

  return (
    <Card className="shadow-card border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <TrendingUp className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl lg:text-3xl font-display">Performance Analysis</CardTitle>
              <CardDescription className="text-base">See how your strategy compares to the market</CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Stock Selector */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Apply to:</label>
              <Select value={selectedStock} onValueChange={setSelectedStock}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select a stock" />
                </SelectTrigger>
                <SelectContent>
                  {stockOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {hasConditions && parseFloat(outperformance) > 0 ? (
              <Badge className="bg-gradient-primary text-lg px-4 py-2 shadow-glow">
                <TrendingUp className="h-4 w-4 mr-2" />
                +{outperformance}% vs Market
              </Badge>
            ) : hasConditions ? (
              <Badge variant="outline" className="border-destructive text-destructive text-lg px-4 py-2">
                <TrendingUp className="h-4 w-4 mr-2 rotate-180" />
                {outperformance}% vs Market
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasConditions ? (
          <div className="h-[350px] flex items-center justify-center bg-muted/30 rounded-xl border-2 border-dashed border-primary/30">
            <div className="text-center p-8">
              <div className="w-20 h-20 rounded-full bg-gradient-primary/20 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-10 w-10 text-primary" />
              </div>
              <p className="text-xl font-semibold text-foreground">Add conditions to see performance</p>
              <p className="text-muted-foreground mt-2 max-w-md">
                Drag conditions from the library below or click them to build your strategy and see projected returns
              </p>
            </div>
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  
                  {/* Event markers */}
                  {chartData.map((point, index) => 
                    point.event ? (
                      <ReferenceLine
                        key={index}
                        x={point.month}
                        stroke="hsl(var(--accent))"
                        strokeDasharray="3 3"
                        label={{
                          value: point.event,
                          position: "top",
                          fill: "hsl(var(--accent))",
                          fontSize: 10,
                        }}
                      />
                    ) : null
                  )}
                  
                  <Line
                    type="monotone"
                    dataKey="market"
                    stroke={chartConfig.market.color}
                    strokeWidth={2}
                    dot={false}
                    opacity={0.6}
                  />
                  <Line
                    type="monotone"
                    dataKey="strategy"
                    stroke={chartConfig.strategy.color}
                    strokeWidth={4}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Key Metrics Row */}
            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Market Final Value</p>
                <p className="text-2xl font-bold text-foreground">${finalMarket}</p>
              </div>
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-xs text-muted-foreground">Strategy Final Value</p>
                <p className="text-2xl font-bold text-primary">${finalStrategy}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Active Conditions</p>
                <p className="text-2xl font-bold text-foreground">{conditions.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Strategy Multiplier</p>
                <p className="text-2xl font-bold text-foreground">{strategyMultiplier.toFixed(2)}x</p>
              </div>
            </div>
          </>
        )}

        {/* Event Legend */}
        {hasConditions && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Market Events:</span> Vertical dashed lines indicate major market events that impacted performance
              </div>
            </div>
          </div>
        )}

        {isSimulating && (
          <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 animate-pulse">
            <p className="text-sm text-primary font-medium text-center">
              Calculating performance metrics...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceChart;
