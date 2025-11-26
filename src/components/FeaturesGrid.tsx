import { motion } from "framer-motion";
import { FileText, Brain, Shield } from "lucide-react";

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
  return (
    <section id="features" className="py-24 bg-gradient-to-b from-background to-mist relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
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
              <div className="bg-card border border-primary/20 rounded-2xl p-8 shadow-md hover:shadow-xl transition-all h-full relative z-10">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6 shadow-sm">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-serif font-semibold text-foreground mb-4">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed font-light">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
