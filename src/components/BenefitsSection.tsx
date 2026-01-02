import { motion, useScroll, useTransform } from "framer-motion";
import { CheckCircle2, Shield, Clock, TrendingUp, FileText } from "lucide-react";
import { useRef } from "react";
import benefitsImage from "@/assets/benefits-clinic.jpg";

const benefits = [
  {
    icon: Shield,
    title: "Segurança Clínica",
    description: "Protocolos validados por especialistas, reduzindo riscos e aumentando a confiança.",
    position: "left",
  },
  {
    icon: Clock,
    title: "Economia de Tempo",
    description: "Análise instantânea que antes levaria minutos de avaliação manual.",
    position: "left",
  },
  {
    icon: TrendingUp,
    title: "Resultados Previsíveis",
    description: "Dosagens baseadas em dados anatômicos reais, não em estimativas visuais.",
    position: "right",
  },
  {
    icon: FileText,
    title: "Documentação Completa",
    description: "Registros fotográficos padronizados e laudos técnicos para cada procedimento.",
    position: "right",
  },
];

export const BenefitsSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });
  
  const imageScale = useTransform(scrollYProgress, [0, 0.5], [0.9, 1]);
  const imageRotate = useTransform(scrollYProgress, [0, 1], ["-2deg", "2deg"]);
  
  return (
    <section 
      ref={sectionRef}
      id="benefits" 
      className="py-24 bg-gradient-to-b from-background to-mist relative overflow-hidden"
    >
      <motion.div 
        className="absolute inset-0 bg-grid-pattern opacity-[0.02]"
        style={{ y: useTransform(scrollYProgress, [0, 1], ["0%", "15%"]) }}
      />
      
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">
              Benefícios Clínicos
            </h2>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 items-center">
            {/* Left side benefits */}
            <div className="space-y-6 lg:text-right order-2 lg:order-1">
              {benefits
                .filter((b) => b.position === "left")
                .map((benefit, index) => (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 * index }}
                    viewport={{ once: true }}
                    whileHover={{ x: -5 }}
                    className="group cursor-default"
                  >
                    <div className="flex items-start gap-4 lg:flex-row-reverse">
                      <motion.div 
                        className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg transition-all duration-300"
                        whileHover={{ rotate: 5 }}
                      >
                        <benefit.icon className="h-6 w-6 text-primary" />
                      </motion.div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2 font-serif group-hover:text-primary transition-colors">
                          {benefit.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed font-light">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>

            {/* Central image with parallax */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              style={{ scale: imageScale, rotate: imageRotate }}
              className="order-1 lg:order-2"
            >
              <motion.div 
                className="relative aspect-square rounded-2xl overflow-hidden border border-primary/20 shadow-xl max-w-sm mx-auto group"
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.4 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 z-10 group-hover:opacity-60 transition-opacity" />
                
                {/* Animated glow */}
                <motion.div 
                  className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl"
                  animate={{ 
                    scale: [1, 1.4, 1],
                    opacity: [0.3, 0.5, 0.3]
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                
                <img 
                  src={benefitsImage} 
                  alt="Clínica de Estética Premium"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                
                {/* Central overlay badge */}
                <motion.div 
                  className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur-md rounded-xl p-3 border border-primary/20 z-20"
                  whileHover={{ scale: 1.02, y: -2 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-background" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Ambiente Premium</p>
                      <p className="text-xs text-muted-foreground">Alto padrão clínico</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Right side benefits */}
            <div className="space-y-6 order-3">
              {benefits
                .filter((b) => b.position === "right")
                .map((benefit, index) => (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 * index }}
                    viewport={{ once: true }}
                    whileHover={{ x: 5 }}
                    className="group cursor-default"
                  >
                    <div className="flex items-start gap-4">
                      <motion.div 
                        className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg transition-all duration-300"
                        whileHover={{ rotate: -5 }}
                      >
                        <benefit.icon className="h-6 w-6 text-primary" />
                      </motion.div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2 font-serif group-hover:text-primary transition-colors">
                          {benefit.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed font-light">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
