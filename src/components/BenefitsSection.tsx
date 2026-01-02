import { motion } from "framer-motion";
import { CheckCircle2, Shield, Clock, TrendingUp, FileText } from "lucide-react";
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
  return (
    <section id="benefits" className="py-24 bg-gradient-to-b from-background to-mist relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
      
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
                    className="group"
                  >
                    <div className="flex items-start gap-4 lg:flex-row-reverse">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <benefit.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2 font-serif">
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

            {/* Central image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden border border-primary/20 shadow-xl max-w-sm mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 z-10" />
                <img 
                  src={benefitsImage} 
                  alt="Clínica de Estética Premium"
                  className="w-full h-full object-cover"
                />
                {/* Central overlay badge */}
                <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur-md rounded-xl p-3 border border-primary/20 z-20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-background" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Ambiente Premium</p>
                      <p className="text-xs text-muted-foreground">Alto padrão clínico</p>
                    </div>
                  </div>
                </div>
              </div>
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
                    className="group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <benefit.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2 font-serif">
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
