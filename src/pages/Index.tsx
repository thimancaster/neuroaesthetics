import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesGrid } from "@/components/FeaturesGrid";
import { PracticalitySection } from "@/components/PracticalitySection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { BenefitsSection } from "@/components/BenefitsSection";
import { PricingSection } from "@/components/PricingSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <PracticalitySection />
      <HowItWorksSection />
      <BenefitsSection />
      <PricingSection />
      <FeaturesGrid />
    </div>
  );
};

export default Index;
