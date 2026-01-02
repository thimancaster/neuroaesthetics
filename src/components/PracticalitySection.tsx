import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useRef } from "react";
import practicalityImage from "@/assets/practicality-facial-mapping.jpg";

export const PracticalitySection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });
  
  const imageY = useTransform(scrollYProgress, [0, 1], ["10%", "-10%"]);
  const textX = useTransform(scrollYProgress, [0, 0.5, 1], ["30px", "0px", "-30px"]);
  
  return (
    <section 
      ref={sectionRef}
      className="py-24 bg-gradient-to-b from-background to-mist relative overflow-hidden"
    >
      <motion.div 
        className="absolute inset-0 bg-grid-pattern opacity-[0.02]"
        style={{ y: useTransform(scrollYProgress, [0, 1], ["0%", "20%"]) }}
      />
      
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Image side with parallax */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="relative"
          >
            <motion.div 
              className="aspect-[4/5] rounded-2xl overflow-hidden border border-primary/20 shadow-xl relative group"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.4 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 z-10 group-hover:opacity-60 transition-opacity" />
              
              {/* Animated glow effect */}
              <motion.div 
                className="absolute -top-10 -right-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl z-0"
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.2, 0.4, 0.2]
                }}
                transition={{ 
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              <motion.img 
                src={practicalityImage} 
                alt="Mapeamento Anatômico Facial com IA"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                style={{ y: imageY }}
              />
              
              {/* Floating overlay elements */}
              <motion.div 
                className="absolute top-4 right-4 bg-background/80 backdrop-blur-md rounded-lg px-3 py-2 border border-primary/20 z-20"
                initial={{ opacity: 0, y: -10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-xs font-medium text-foreground">IA Ativa</span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Text side with parallax */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            viewport={{ once: true }}
            style={{ x: textX }}
          >
            <motion.div 
              className="flex items-center gap-2 mb-4"
              whileHover={{ x: 5 }}
              transition={{ duration: 0.2 }}
            >
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium text-accent uppercase tracking-wider">
                Tecnologia Avançada
              </span>
            </motion.div>
            
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
            
            {/* Feature pills */}
            <div className="flex flex-wrap gap-3 mt-8">
              {["Precisão 99%", "Tempo Real", "Protocolos CFM"].map((pill, i) => (
                <motion.span
                  key={pill}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20 cursor-default"
                >
                  {pill}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
