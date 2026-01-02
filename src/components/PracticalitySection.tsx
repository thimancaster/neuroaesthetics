import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import practicalityImage from "@/assets/practicality-facial-mapping.jpg";

export const PracticalitySection = () => {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-mist relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
      
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Image side */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-primary/20 shadow-xl relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 z-10" />
              <img 
                src={practicalityImage} 
                alt="Mapeamento Anatômico Facial com IA"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          {/* Text side */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium text-accent uppercase tracking-wider">
                Tecnologia Avançada
              </span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6 leading-tight">
              Descubra a Praticidade
            </h2>
            
            <p className="text-lg text-muted-foreground leading-relaxed mb-6 font-light">
              Nossa plataforma utiliza inteligência artificial avançada para analisar a anatomia facial 
              com precisão cirúrgica. Em poucos segundos, você obtém um mapeamento completo dos músculos 
              faciais, proporções áureas e recomendações de dosagem personalizadas.
            </p>
            
            <p className="text-lg text-muted-foreground leading-relaxed font-light">
              Padronização fotográfica, análise anatômica automatizada e protocolos de segurança integrados 
              em uma única ferramenta. Tudo pensado para elevar a qualidade dos seus procedimentos de 
              harmonização facial.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
