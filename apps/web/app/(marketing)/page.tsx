import { HeroSection } from '@/components/marketing/HeroSection';
import { FeaturesSection } from '@/components/marketing/FeaturesSection';
import { HowItWorksSection } from '@/components/marketing/HowItWorksSection';
import { ThreatLevelsSection } from '@/components/marketing/ThreatLevelsSection';
import { PricingSection } from '@/components/marketing/PricingSection';
import { CtaSection } from '@/components/marketing/CtaSection';
import { MarketingNav } from '@/components/layout/MarketingNav';
import { Footer } from '@/components/layout/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-fort-bg">
      <MarketingNav />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ThreatLevelsSection />
      <PricingSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
