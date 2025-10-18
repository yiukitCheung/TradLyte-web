import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Send, Target, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import tradlyteMascot from '@/assets/tradlyte-mascot.png';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  milestones: Milestone[];
  progress: number;
}

interface Milestone {
  id: string;
  title: string;
  financialTarget: number;
  completed: boolean;
  description: string;
}

const Goals = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm Tradlyte, your financial goal companion! 🌟 Let's discover your dreams together. What do you aspire to achieve in life? It could be anything - buying a home, traveling the world, starting a business, or achieving financial freedom. Share your dreams with me!"
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      title: 'Buy Dream Home',
      description: 'Save for a down payment on a beautiful home',
      progress: 35,
      milestones: [
        {
          id: '1-1',
          title: 'Build Emergency Fund',
          financialTarget: 10000,
          completed: true,
          description: 'Save 6 months of expenses'
        },
        {
          id: '1-2',
          title: 'Improve Credit Score',
          financialTarget: 0,
          completed: true,
          description: 'Reach 750+ credit score'
        },
        {
          id: '1-3',
          title: 'Save for Down Payment',
          financialTarget: 50000,
          completed: false,
          description: '20% down payment target'
        },
        {
          id: '1-4',
          title: 'Secure Pre-Approval',
          financialTarget: 0,
          completed: false,
          description: 'Get mortgage pre-approval'
        }
      ]
    }
  ]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);

    // Placeholder AI response - will connect to ChatGPT API later
    setTimeout(() => {
      const aiResponse: Message = {
        role: 'assistant',
        content: "That's a wonderful goal! Let me help you break this down into actionable financial milestones. Based on your dream, here are some steps we can work on together..."
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);

    setInputMessage('');
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8">
        <div className="container mx-auto px-4 space-y-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-8 w-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                Life Goals Journey
              </h1>
            </div>
            <p className="text-muted-foreground">
              Let Tradlyte guide you to discover and achieve your dreams through smart financial planning
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
            {/* AI Chat Section */}
            <Card className="shadow-elegant">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <img 
                    src={tradlyteMascot} 
                    alt="Tradlyte Mascot" 
                    className="w-12 h-12 rounded-full shadow-glow"
                  />
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Chat with Tradlyte
                      <Sparkles className="h-5 w-5 text-accent" />
                    </CardTitle>
                    <CardDescription>Your AI goal discovery companion</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-[400px] overflow-y-auto space-y-4 p-4 bg-secondary/20 rounded-lg">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <img 
                          src={tradlyteMascot} 
                          alt="Tradlyte" 
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card border border-border'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Share your dreams and goals..."
                    className="min-h-[60px]"
                  />
                  <Button onClick={handleSendMessage} className="shadow-elegant">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Goals Roadmap Section */}
            <div className="space-y-6">
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle>Your Goals Roadmap</CardTitle>
                  <CardDescription>
                    Track your progress toward achieving your dreams
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {goals.map((goal) => (
                    <div key={goal.id} className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg text-foreground">
                            {goal.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {goal.description}
                          </p>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {goal.progress}%
                        </Badge>
                      </div>
                      <Progress value={goal.progress} className="h-2" />
                      
                      {/* Milestones */}
                      <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                        {goal.milestones.map((milestone, index) => (
                          <div
                            key={milestone.id}
                            className={`relative pl-6 pb-4 ${
                              index === goal.milestones.length - 1 ? 'pb-0' : ''
                            }`}
                          >
                            <div className="absolute left-0 top-1 -translate-x-1/2">
                              {milestone.completed ? (
                                <CheckCircle2 className="h-5 w-5 text-accent" />
                              ) : (
                                <Circle className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className={`font-medium text-sm ${
                                  milestone.completed 
                                    ? 'text-muted-foreground line-through' 
                                    : 'text-foreground'
                                }`}>
                                  {milestone.title}
                                </h4>
                                {milestone.financialTarget > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    ${milestone.financialTarget.toLocaleString()}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {milestone.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Button className="w-full shadow-elegant">
                <Target className="h-4 w-4 mr-2" />
                Add New Goal
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Goals;
