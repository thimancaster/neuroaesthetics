import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { Scan, Grid3x3, Syringe, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import heroImage from "@/assets/hero-facial-analysis.jpg";

const floatingCards = [
  {
    icon: Scan,
    title: "Mapeamento",
    description: "Análise facial precisa",
    delay: 0.2,
  },
  {
    icon: Grid3x3,
    title: "Simetria",
    description: "Proporções áureas",
    delay: 0.4,
  },
  {
    icon: Syringe,
    title: "Dosagem",
    description: "Protocolo personalizado",
    delay: 0.6,
  },
];

export const HeroSection = () => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  });
  
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);
  
  return (
    <section 
      ref={sectionRef}
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-mist via-background to-fog pt-20"
    >
      {/* Background decoration with parallax */}
      <motion.div 
        className="absolute inset-0 bg-grid-pattern opacity-[0.03]"
        style={{ y: useTransform(scrollYProgress, [0, 1], ["0%", "30%"]) }}
      />
      <motion.div 
        className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
        style={{ y: useTransform(scrollYProgress, [0, 1], ["0%", "40%"]) }}
      />
      <motion.div 
        className="absolute bottom-20 left-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl"
        style={{ y: useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]) }}
      />
      
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center relative">
            {/* Left side - Text content with parallax */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              style={{ y: textY }}
              className="lg:text-left text-center"
            >
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                id="hero-title"
              >
                <h1 className="text-5xl md:text-7xl lg:text-6xl xl:text-7xl font-serif font-bold text-foreground mb-6 leading-tight">
                  A Ciência da Precisão na
                  <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mt-2">
                    Harmonização Facial
                  </span>
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-lg md:text-xl text-muted-foreground mb-10 font-light"
                id="hero-subtitle"
              >
                Padronização fotográfica e análise anatômica guiada por IA para injetores de elite.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                id="hero-cta"
                className="flex flex-col sm:flex-row gap-4 lg:justify-start justify-center items-center"
              >
                <Button 
                  size="lg" 
                  onClick={() => navigate("/login")}
                  className="text-base px-10 py-7 gap-3 bg-primary hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:scale-105 font-medium group"
                >
                  Começar Análise
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  Disponível no Brasil
                </p>
              </motion.div>
            </motion.div>

            {/* Right side - Professional image with parallax */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <motion.div 
                className="relative aspect-square lg:aspect-[3/4] rounded-2xl overflow-hidden border border-primary/30 shadow-2xl max-w-md mx-auto lg:max-w-none group"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.4 }}
              >
                {/* Golden light effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-transparent to-primary/30 mix-blend-overlay z-10 group-hover:opacity-70 transition-opacity" />
                <motion.div 
                  className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.2, 0.3, 0.2]
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                
                {/* Hero image with parallax */}
                <motion.img 
                  src={heroImage} 
                  alt="Análise Facial Profissional com IA"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  style={{ y: imageY, scale: imageScale }}
                />
                
                {/* Overlay decorative elements */}
                <motion.div 
                  className="absolute bottom-6 left-6 right-6 bg-background/90 backdrop-blur-md rounded-xl p-4 border border-primary/20 z-20"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Scan className="h-5 w-5 text-background" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Análise em Tempo Real</p>
                      <p className="text-xs text-muted-foreground">Precisão de 99.2%</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>

          {/* Floating Cards with enhanced hover */}
          <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto">
            {floatingCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: card.delay }}
                className="floating-card"
                id={`floating-card-${index}`}
              >
                <motion.div 
                  className="relative group cursor-pointer"
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-accent/15 rounded-2xl blur-xl group-hover:blur-2xl group-hover:scale-110 transition-all duration-500" />
                  <div className="relative bg-card/80 backdrop-blur-xl border border-primary/20 rounded-2xl p-6 shadow-md group-hover:shadow-2xl group-hover:border-primary/40 transition-all duration-300">
                    <motion.div 
                      className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 mx-auto shadow-md"
                      whileHover={{ rotate: 5, scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <card.icon className="h-7 w-7 text-primary-foreground" />
                    </motion.div>
                    <h3 className="text-lg font-semibold text-foreground mb-2 font-serif">
                      {card.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
