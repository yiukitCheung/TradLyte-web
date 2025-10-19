import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
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
      { value: 100 - value, fill: "hsl(var(--muted))" },
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
      <Card className="shadow-card border-border/50 hover-scale">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <div className="w-40 h-40 animate-scale-in">
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
                  >
                    {gaugeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center space-y-1 animate-fade-in">
              <div className="text-4xl font-bold text-foreground">{value}</div>
              <div className={`text-sm font-semibold ${sentiment.color}`}>{sentiment.text}</div>
              <div className="text-xs text-muted-foreground">{subtitle}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

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

      {/* Major Indices */}
      <Card className="shadow-card border-border/50 animate-fade-in">
        <CardHeader>
          <CardTitle className="text-xl">Major Indices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {majorIndices.map((index, i) => (
              <div 
                key={index.name} 
                className="space-y-1 p-3 rounded-lg bg-muted/30 hover-scale transition-all"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <p className="text-sm text-muted-foreground">{index.name}</p>
                <p className="text-lg font-bold text-foreground">{index.value}</p>
                <div className={`flex items-center gap-1 text-sm ${index.isPositive ? 'text-primary' : 'text-destructive'}`}>
                  {index.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span className="font-medium">{index.change}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sector Indices */}
      <Card className="shadow-card border-border/50 animate-fade-in">
        <CardHeader>
          <CardTitle className="text-xl">Sector Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sectorIndices.map((sector, i) => (
              <div 
                key={sector.name} 
                className="space-y-1 p-3 rounded-lg bg-muted/30 hover-scale transition-all"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <p className="text-sm text-muted-foreground">{sector.name}</p>
                <p className="text-lg font-bold text-foreground">{sector.value}</p>
                <div className={`flex items-center gap-1 text-sm ${sector.isPositive ? 'text-primary' : 'text-destructive'}`}>
                  {sector.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span className="font-medium">{sector.change}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Commodities */}
      <Card className="shadow-card border-border/50 animate-fade-in">
        <CardHeader>
          <CardTitle className="text-xl">Commodities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {commodities.map((commodity, i) => (
              <div 
                key={commodity.name} 
                className="space-y-1 p-3 rounded-lg bg-muted/30 hover-scale transition-all"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <p className="text-sm text-muted-foreground">{commodity.name}</p>
                <p className="text-lg font-bold text-foreground">{commodity.value}</p>
                <div className={`flex items-center gap-1 text-sm ${commodity.isPositive ? 'text-primary' : 'text-destructive'}`}>
                  {commodity.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span className="font-medium">{commodity.change}</span>
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
