import { motion, useScroll, useTransform } from "framer-motion";
import { FileText, Brain, Shield } from "lucide-react";
import { useRef } from "react";
import featuresImage from "@/assets/features-ai-tech.jpg";

const features = [
  {
    icon: FileText,
    title: "Documentação Padronizada",
    description: "Protocolos fotográficos consistentes que garantem comparabilidade e rastreabilidade de resultados ao longo do tempo.",
  },
  {
    icon: Brain,
    title: "Análise Anatômica por IA",
    description: "Mapeamento facial automatizado com detecção de pontos de referência e cálculo de proporções estéticas.",
  },
  {
    icon: Shield,
    title: "Segurança e Precisão",
    description: "Reduza riscos com dosagens calculadas baseadas em anatomia individual e histórico do paciente.",
  },
];

export const FeaturesGrid = () => {
  const sectionRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });
  
  const imageY = useTransform(scrollYProgress, [0, 1], ["5%", "-5%"]);
  
  return (
    <section 
      ref={sectionRef}
      id="features" 
      className="py-24 bg-gradient-to-b from-background to-mist relative"
    >
      <motion.div 
        className="absolute inset-0 bg-grid-pattern opacity-[0.02]"
        style={{ y: useTransform(scrollYProgress, [0, 1], ["0%", "10%"]) }}
      />
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 relative z-10"
        >
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
            Tecnologia para Resultados Superiores
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">
            Eleve o padrão do seu atendimento com ferramentas desenhadas para profissionais exigentes.
          </p>
        </motion.div>

        {/* Featured image section with parallax */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <motion.div 
            className="relative aspect-video md:aspect-[21/9] rounded-2xl overflow-hidden border border-primary/20 shadow-xl group"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.4 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-accent/20 z-10 group-hover:opacity-60 transition-opacity" />
            
            {/* Animated glow effects */}
            <motion.div 
              className="absolute top-0 left-1/4 w-40 h-40 bg-accent/20 rounded-full blur-3xl"
              animate={{ 
                x: [0, 50, 0],
                opacity: [0.2, 0.4, 0.2]
              }}
              transition={{ 
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            <motion.img 
              src={featuresImage} 
              alt="Tecnologia de Análise Facial com IA"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              style={{ y: imageY }}
            />
            
            <motion.div 
              className="absolute inset-0 flex items-center justify-center z-20"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
            >
              <motion.div 
                className="bg-background/80 backdrop-blur-md rounded-2xl p-6 border border-primary/20 text-center max-w-md"
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  animate={{ 
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Brain className="h-12 w-12 text-primary mx-auto mb-3" />
                </motion.div>
                <p className="text-lg font-serif font-semibold text-foreground">Mapeamento Facial Avançado</p>
                <p className="text-sm text-muted-foreground">Precisão anatômica guiada por IA</p>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="feature-card"
              id={`feature-${index}`}
            >
              <motion.div 
                className="bg-card border border-primary/20 rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all h-full relative z-10 group"
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div 
                  className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6 shadow-sm group-hover:shadow-lg group-hover:scale-110 transition-all duration-300"
                  whileHover={{ rotate: 5 }}
                >
                  <feature.icon className="h-8 w-8 text-primary" />
                </motion.div>
                <h3 className="text-2xl font-serif font-semibold text-foreground mb-4 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed font-light">
                  {feature.description}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
