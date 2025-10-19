import { Lock, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface FeaturePreviewProps {
  title: string;
  description: string;
  features: string[];
  locked?: boolean;
}

const FeaturePreview = ({ title, description, features, locked = false }: FeaturePreviewProps) => {
  return (
    <div className="relative">
      <div className={`space-y-8 ${locked ? 'blur-sm' : ''}`}>
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        <Card className="p-8 shadow-card border-border/50">
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-4 rounded-lg bg-muted/30"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-foreground">{feature}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {locked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Card className="p-8 shadow-elegant border-primary/20 max-w-md text-center space-y-4 bg-card/95 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">Sign in to unlock</h3>
            <p className="text-muted-foreground">
              Create an account to access {title.toLowerCase()} and track your financial journey
            </p>
            <Link to="/auth">
              <Button size="lg" className="w-full">
                Get Started Free
              </Button>
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FeaturePreview;
