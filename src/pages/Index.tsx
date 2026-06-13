import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import TradlyteSelect from "@/components/TradlyteSelect";
import Pillars from "@/components/Pillars";
import PreviewBand from "@/components/PreviewBand";
import CTABand from "@/components/CTABand";

const Index = () => (
  <div className="flex min-h-screen flex-col bg-surface-primary">
    <Header />
    <main className="flex-1">
      <Hero />
      <HowItWorks />
      <Pillars />
      <TradlyteSelect />
      <PreviewBand />
      <CTABand />
    </main>
    <Footer />
  </div>
);

export default Index;
