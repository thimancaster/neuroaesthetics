import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export const Navbar = () => {
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
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-xl font-serif">N</span>
            </div>
            <span className="text-xl font-semibold text-foreground font-serif">
              NeuroAesthetics AI
            </span>
          </Link>

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

          <Button asChild variant="outline" className="gap-2 border-primary/30 hover:bg-primary/5 hover:border-primary/50 font-medium">
            <Link to="/login">
              <LogIn className="h-4 w-4" />
              Login Médico
            </Link>
          </Button>
        </div>
      </div>
    </motion.nav>
  );
};
