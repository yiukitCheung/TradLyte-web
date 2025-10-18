import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PerformanceChartProps {
  isSimulating: boolean;
}

// Placeholder data for market comparison
const generateChartData = () => {
  const data = [];
  const events = [
    { month: 3, label: "Fed Rate Decision", impact: -5 },
    { month: 7, label: "Earnings Season", impact: 8 },
    { month: 10, label: "Market Correction", impact: -12 },
  ];
  
  let marketValue = 100;
  let strategyValue = 100;
  
  for (let i = 0; i < 12; i++) {
    const event = events.find(e => e.month === i);
    const marketChange = event ? event.impact : (Math.random() - 0.48) * 5;
    const strategyChange = event ? event.impact * 0.7 : (Math.random() - 0.45) * 4;
    
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

const chartData = generateChartData();

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

const PerformanceChart = ({ isSimulating }: PerformanceChartProps) => {
  const finalMarket = chartData[chartData.length - 1].market;
  const finalStrategy = chartData[chartData.length - 1].strategy;
  const outperformance = ((finalStrategy - finalMarket) / finalMarket * 100).toFixed(1);

  return (
    <Card className="shadow-card sticky top-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Performance Analysis</CardTitle>
            <CardDescription>Strategy vs Market Index (12 months)</CardDescription>
          </div>
          {parseFloat(outperformance) > 0 ? (
            <Badge className="bg-gradient-primary">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{outperformance}%
            </Badge>
          ) : (
            <Badge variant="outline" className="border-destructive text-destructive">
              <TrendingUp className="h-3 w-3 mr-1 rotate-180" />
              {outperformance}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Key Metrics */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Final Value (Market)</p>
            <p className="text-lg font-bold text-foreground">${finalMarket}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Final Value (Strategy)</p>
            <p className="text-lg font-bold text-primary">${finalStrategy}</p>
          </div>
        </div>

        {/* Event Legend */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Market Events:</span> Vertical dashed lines indicate major market events that impacted performance
            </div>
          </div>
        </div>

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
