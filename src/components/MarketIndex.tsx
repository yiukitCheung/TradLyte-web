import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

const MarketIndex = () => {
  const indices = [
    { name: "S&P 500", value: "4,783.45", change: "+1.24%", isPositive: true },
    { name: "Dow Jones", value: "37,545.33", change: "+0.89%", isPositive: true },
    { name: "NASDAQ", value: "15,235.71", change: "-0.45%", isPositive: false },
    { name: "Bitcoin", value: "$52,340", change: "+3.21%", isPositive: true },
  ];

  return (
    <Card className="shadow-card border-border/50">
      <CardHeader>
        <CardTitle className="text-xl">Market Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {indices.map((index) => (
            <div key={index.name} className="space-y-1">
              <p className="text-sm text-muted-foreground">{index.name}</p>
              <p className="text-lg font-bold text-foreground">{index.value}</p>
              <div className={`flex items-center gap-1 text-sm ${index.isPositive ? 'text-green-600' : 'text-red-600'}`}>
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
  );
};

export default MarketIndex;
