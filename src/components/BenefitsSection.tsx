import { motion } from "framer-motion";
import { CheckCircle2, Shield, Clock, TrendingUp, FileText } from "lucide-react";

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
    <section className="py-24 bg-gradient-to-b from-background to-mist relative overflow-hidden">
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

          <div className="relative">
            {/* Central logo/icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
            >
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl border-8 border-background">
                <CheckCircle2 className="h-16 w-16 text-background" />
              </div>
            </motion.div>

            {/* Benefits grid */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-16">
              {/* Left side benefits */}
              <div className="space-y-6 md:text-right md:pr-24">
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
                      <div className="flex items-start gap-4 md:flex-row-reverse">
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

              {/* Right side benefits */}
              <div className="space-y-6 md:pl-24">
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
      </div>
    </section>
  );
};
