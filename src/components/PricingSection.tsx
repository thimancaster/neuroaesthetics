import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "Básico",
    price: "R$ 197",
    period: "/mês",
    description: "Ideal para profissionais iniciantes",
    features: [
      "Até 30 análises/mês",
      "Guias de enquadramento",
      "Dosagem sugerida",
      "Suporte por email",
    ],
    popular: false,
  },
  {
    name: "Profissional",
    price: "R$ 397",
    period: "/mês",
    description: "Para clínicas em crescimento",
    features: [
      "Análises ilimitadas",
      "Histórico completo",
      "Relatórios personalizados",
      "Suporte prioritário",
      "Multi-usuários (até 3)",
    ],
    popular: true,
  },
  {
    name: "Clínica",
    price: "R$ 797",
    period: "/mês",
    description: "Para grandes operações",
    features: [
      "Tudo do Profissional",
      "Usuários ilimitados",
      "API de integração",
      "Treinamento dedicado",
      "Gerente de conta",
    ],
    popular: false,
  },
];

export const PricingSection = () => {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-mist to-background relative overflow-hidden">
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
              Planos e Preços
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Escolha o plano ideal para sua prática clínica
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`relative group ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="flex items-center gap-1 bg-gradient-to-r from-primary to-accent text-primary-foreground px-4 py-1 rounded-full text-sm font-medium shadow-lg">
                      <Star className="h-4 w-4" />
                      Mais Popular
                    </div>
                  </div>
                )}

                <div
                  className={`relative h-full bg-card/80 backdrop-blur-xl border rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all ${
                    plan.popular
                      ? "border-primary/50 ring-2 ring-primary/20"
                      : "border-primary/20"
                  }`}
                >
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-serif font-bold text-foreground mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {plan.description}
                    </p>
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-foreground">
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground ml-1">
                        {plan.period}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-muted-foreground text-sm">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => navigate("/login")}
                    className={`w-full ${
                      plan.popular
                        ? "bg-primary hover:bg-primary/90"
                        : "bg-primary/10 hover:bg-primary/20 text-primary"
                    }`}
                  >
                    Começar Agora
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
