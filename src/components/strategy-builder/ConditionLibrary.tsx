import { TrendingUp, TrendingDown, DollarSign, Calendar, Shield, Target, Zap, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Condition } from "@/pages/StrategyBuilder";

interface ConditionLibraryProps {
  category: "beginner" | "intermediate" | "advanced";
  onDrop: (condition: Condition) => void;
}

const conditionsByCategory = {
  beginner: [
    { id: "buy-dip", type: "buy-dip", label: "Buy the Dip", icon: TrendingDown, description: "Buy when market drops" },
    { id: "take-profit", type: "take-profit", label: "Take Profit", icon: TrendingUp, description: "Sell at profit target" },
    { id: "dollar-cost", type: "dollar-cost", label: "Dollar Cost Average", icon: DollarSign, description: "Regular investing" },
    { id: "hold-period", type: "hold-period", label: "Hold Period", icon: Calendar, description: "Hold for duration" },
  ],
  intermediate: [
    { id: "stop-loss", type: "stop-loss", label: "Stop Loss", icon: Shield, description: "Limit downside risk" },
    { id: "trailing-stop", type: "trailing-stop", label: "Trailing Stop", icon: Target, description: "Dynamic protection" },
    { id: "rebalance", type: "rebalance", label: "Rebalance", icon: Zap, description: "Portfolio adjustment" },
    { id: "momentum", type: "momentum", label: "Momentum Signal", icon: TrendingUp, description: "Trend following" },
  ],
  advanced: [
    { id: "rsi-condition", type: "rsi-condition", label: "RSI Indicator", icon: Brain, description: "Relative strength" },
    { id: "macd-cross", type: "macd-cross", label: "MACD Crossover", icon: Zap, description: "Moving average conv." },
    { id: "volume-spike", type: "volume-spike", label: "Volume Spike", icon: TrendingUp, description: "Unusual volume" },
    { id: "custom-logic", type: "custom-logic", label: "Custom Logic", icon: Brain, description: "Your own rules" },
  ],
};

const ConditionLibrary = ({ category, onDrop }: ConditionLibraryProps) => {
  const conditions = conditionsByCategory[category];

  const handleDragStart = (e: React.DragEvent, condition: any) => {
    e.dataTransfer.setData("condition", JSON.stringify({ ...condition, category }));
  };

  return (
    <div className="space-y-3">
      {conditions.map((condition) => {
        const Icon = condition.icon;
        return (
          <div
            key={condition.id}
            draggable
            onDragStart={(e) => handleDragStart(e, condition)}
            className="group"
          >
            <Button
              variant="outline"
              className="w-full justify-start text-left h-auto p-4 hover:border-primary hover:bg-primary/5 transition-all cursor-move"
              onClick={() => onDrop({ ...condition, category })}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground">{condition.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{condition.description}</div>
                </div>
              </div>
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default ConditionLibrary;
