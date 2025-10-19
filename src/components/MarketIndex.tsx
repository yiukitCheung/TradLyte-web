import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { ChartContainer } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const MarketIndex = () => {
  const majorIndices = [
    { name: "S&P 500", value: "4,783.45", change: "+1.24%", isPositive: true },
    { name: "Dow Jones", value: "37,545.33", change: "+0.89%", isPositive: true },
    { name: "NASDAQ", value: "15,235.71", change: "-0.45%", isPositive: false },
    { name: "Bitcoin", value: "$52,340", change: "+3.21%", isPositive: true },
  ];

  const sectorIndices = [
    { name: "Technology", value: "3,245.67", change: "+1.85%", isPositive: true },
    { name: "Healthcare", value: "1,876.23", change: "+0.56%", isPositive: true },
    { name: "Financial", value: "2,134.89", change: "-0.32%", isPositive: false },
    { name: "Energy", value: "1,567.45", change: "+2.15%", isPositive: true },
    { name: "Consumer", value: "2,456.78", change: "+0.78%", isPositive: true },
    { name: "Industrial", value: "1,987.34", change: "+1.12%", isPositive: true },
    { name: "Materials", value: "1,345.67", change: "-0.67%", isPositive: false },
    { name: "Utilities", value: "987.23", change: "+0.34%", isPositive: true },
  ];

  const commodities = [
    { name: "Crude Oil", value: "$78.45", change: "+1.67%", isPositive: true },
    { name: "Gold", value: "$2,034.50", change: "+0.45%", isPositive: true },
    { name: "Silver", value: "$23.67", change: "-0.89%", isPositive: false },
    { name: "Natural Gas", value: "$2.87", change: "+2.34%", isPositive: true },
  ];

  // Composite index calculation (0-100 scale)
  const compositeValue = 68; // This would be calculated from real data
  const gaugeData = [
    { value: compositeValue, fill: "hsl(var(--primary))" },
    { value: 100 - compositeValue, fill: "hsl(var(--muted))" },
  ];

  return (
    <div className="space-y-6">
      {/* Composite Index Gauge */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-xl">TradLyte Composite Index</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-8">
            <div className="w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gaugeData}
                    cx="50%"
                    cy="50%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {gaugeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-foreground">{compositeValue}</div>
              <div className="text-sm text-muted-foreground mt-2">Market Sentiment</div>
              <div className="flex items-center justify-center gap-1 text-sm text-primary mt-1">
                <TrendingUp className="h-4 w-4" />
                <span>+2.4% Today</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Major Indices */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-xl">Major Indices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {majorIndices.map((index) => (
              <div key={index.name} className="space-y-1">
                <p className="text-sm text-muted-foreground">{index.name}</p>
                <p className="text-lg font-bold text-foreground">{index.value}</p>
                <div className={`flex items-center gap-1 text-sm ${index.isPositive ? 'text-primary' : 'text-destructive'}`}>
                  {index.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{index.change}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sector Indices */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-xl">Sector Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sectorIndices.map((sector) => (
              <div key={sector.name} className="space-y-1">
                <p className="text-sm text-muted-foreground">{sector.name}</p>
                <p className="text-lg font-bold text-foreground">{sector.value}</p>
                <div className={`flex items-center gap-1 text-sm ${sector.isPositive ? 'text-primary' : 'text-destructive'}`}>
                  {sector.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{sector.change}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Commodities */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-xl">Commodities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {commodities.map((commodity) => (
              <div key={commodity.name} className="space-y-1">
                <p className="text-sm text-muted-foreground">{commodity.name}</p>
                <p className="text-lg font-bold text-foreground">{commodity.value}</p>
                <div className={`flex items-center gap-1 text-sm ${commodity.isPositive ? 'text-primary' : 'text-destructive'}`}>
                  {commodity.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{commodity.change}</span>
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
