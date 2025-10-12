import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MarketIndex from '@/components/MarketIndex';
import Dashboard from '@/components/Dashboard';
import Goals from '@/components/Goals';
import Strategy from '@/components/Strategy';
import Journal from '@/components/Journal';

const UserDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-2xl font-semibold">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8">
        <div className="container mx-auto px-4 space-y-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
              Welcome back, {user.user_metadata?.full_name || 'Trader'}!
            </h1>
            <p className="text-muted-foreground">
              Here's your financial dashboard overview
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <MarketIndex />
          </div>

          <Dashboard />
          <Goals />
          <Strategy />
          <Journal />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserDashboard;
