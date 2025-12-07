import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Save, RotateCcw, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import ConditionLibrary from "@/components/strategy-builder/ConditionLibrary";
import StrategyCanvas from "@/components/strategy-builder/StrategyCanvas";
import PerformanceChart from "@/components/strategy-builder/PerformanceChart";
import { toast } from "sonner";

export interface Condition {
  id: string;
  type: string;
  label: string;
  category: "beginner" | "intermediate" | "advanced";
  parameters?: Record<string, any>;
}

const StrategyBuilder = () => {
  const [selectedConditions, setSelectedConditions] = useState<Condition[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleDrop = (condition: Condition) => {
    setSelectedConditions([...selectedConditions, { ...condition, id: `${condition.id}-${Date.now()}` }]);
    toast.success(`Added: ${condition.label}`);
  };

  const handleRemoveCondition = (id: string) => {
    setSelectedConditions(selectedConditions.filter(c => c.id !== id));
    toast.info("Condition removed");
  };

  const handleSimulate = () => {
    if (selectedConditions.length === 0) {
      toast.error("Add at least one condition to simulate");
      return;
    }
    setIsSimulating(true);
    toast.success("Running simulation...");
    setTimeout(() => {
      setIsSimulating(false);
      toast.success("Simulation complete!");
    }, 2000);
  };

  const handleReset = () => {
    setSelectedConditions([]);
    toast.info("Strategy reset");
  };

  const handleSave = () => {
    toast.success("Strategy saved!");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground">Strategy Builder</h1>
              <p className="text-muted-foreground text-sm lg:text-base">Design and test your investment strategies</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={handleSimulate} 
              disabled={isSimulating}
              className="bg-gradient-primary hover:opacity-90 transition-opacity"
            >
              <Play className="h-4 w-4 mr-2" />
              {isSimulating ? "Simulating..." : "Run Simulation"}
            </Button>
            <Button onClick={handleSave} variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={handleReset} variant="outline" size="icon">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content - Performance Chart as Hero */}
        <div className="space-y-6">
          {/* Performance Chart - Hero Section */}
          <div className="w-full">
            <PerformanceChart isSimulating={isSimulating} conditions={selectedConditions} />
          </div>

          {/* Building Tools - Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Condition Library */}
            <Card className="p-6 shadow-card">
              <h2 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-subtle flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                Condition Library
              </h2>
              <Tabs defaultValue="beginner" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="beginner" className="text-xs">Beginner</TabsTrigger>
                  <TabsTrigger value="intermediate" className="text-xs">Intermediate</TabsTrigger>
                  <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
                </TabsList>
                <TabsContent value="beginner">
                  <div className="grid grid-cols-2 gap-2">
                    <ConditionLibrary category="beginner" onDrop={handleDrop} />
                  </div>
                </TabsContent>
                <TabsContent value="intermediate">
                  <div className="grid grid-cols-2 gap-2">
                    <ConditionLibrary category="intermediate" onDrop={handleDrop} />
                  </div>
                </TabsContent>
                <TabsContent value="advanced">
                  <div className="grid grid-cols-2 gap-2">
                    <ConditionLibrary category="advanced" onDrop={handleDrop} />
                  </div>
                </TabsContent>
              </Tabs>
            </Card>

            {/* Strategy Canvas */}
            <StrategyCanvas 
              conditions={selectedConditions}
              onRemoveCondition={handleRemoveCondition}
              onAddCondition={(condition) => setSelectedConditions([...selectedConditions, condition])}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyBuilder;
