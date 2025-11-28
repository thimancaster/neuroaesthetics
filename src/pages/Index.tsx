import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesGrid } from "@/components/FeaturesGrid";
import { PracticalitySection } from "@/components/PracticalitySection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { BenefitsSection } from "@/components/BenefitsSection";
import { usePhysicsEngine } from "@/hooks/usePhysicsEngine";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

const Index = () => {
  const [physicsActive, setPhysicsActive] = useState(false);

  usePhysicsEngine(physicsActive);

  const handlePhysicsToggle = () => {
    setPhysicsActive(!physicsActive);
  };

  const handleReset = () => {
    setPhysicsActive(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onPhysicsToggle={handlePhysicsToggle} physicsActive={physicsActive} />
      
      {/* Reset button - only visible when physics is active */}
      {physicsActive && (
        <Button
          onClick={handleReset}
          size="lg"
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 gap-2 shadow-2xl animate-fade-in bg-accent hover:bg-accent/90 text-background font-semibold"
        >
          <RotateCcw className="h-5 w-5" />
          Organizar Página
        </Button>
      )}
      
      <HeroSection />
      <PracticalitySection />
      <HowItWorksSection />
      <BenefitsSection />
      <FeaturesGrid />
    </div>
  );
};

export default Index;
