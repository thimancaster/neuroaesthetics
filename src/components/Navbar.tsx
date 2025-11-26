import { Button } from "@/components/ui/button";
import { LogIn, Atom } from "lucide-react";
import { motion } from "framer-motion";

interface NavbarProps {
  onPhysicsToggle: () => void;
  physicsActive: boolean;
}

export const Navbar = ({ onPhysicsToggle, physicsActive }: NavbarProps) => {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-primary/20"
      id="navbar"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-xl font-serif">N</span>
            </div>
            <span className="text-xl font-semibold text-foreground font-serif">
              NeuroAesthetics AI
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              Recursos
            </a>
            <a href="#benefits" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              Benefícios
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              Planos
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPhysicsToggle}
              className={`relative ${physicsActive ? 'text-accent' : 'text-muted-foreground'}`}
              title={physicsActive ? "Desativar Física" : "Ativar Modo Física"}
            >
              <Atom className="h-5 w-5" />
              {physicsActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-pulse" />
              )}
            </Button>
            
            <Button variant="outline" className="gap-2 border-primary/30 hover:bg-primary/5 hover:border-primary/50 font-medium">
              <LogIn className="h-4 w-4" />
              Login Médico
            </Button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};
