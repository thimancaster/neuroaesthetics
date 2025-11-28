import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export const HowItWorksSection = () => {
  return (
    <section className="py-24 bg-mist relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
      
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">
              Como Funciona
            </h2>
            
            <p className="text-lg text-muted-foreground leading-relaxed font-light mb-8 max-w-3xl mx-auto">
              O NeuroAesthetics AI revoluciona o planejamento de procedimentos estéticos ao combinar 
              padronização fotográfica com análise anatômica inteligente. Nossa plataforma guia você 
              desde a captura das imagens até a definição precisa do protocolo de aplicação.
            </p>

            {/* Decorative icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="inline-flex"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg">
                <Sparkles className="h-8 w-8 text-background" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
