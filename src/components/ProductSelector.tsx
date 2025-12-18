import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface ToxinProduct {
  id: string;
  name: string;
  genericName: string;
  conversionFactor: number;
  description: string;
}

export const TOXIN_PRODUCTS: ToxinProduct[] = [
  {
    id: "botox",
    name: "Botox®",
    genericName: "OnabotulinumtoxinA",
    conversionFactor: 1.0,
    description: "Allergan - Padrão de referência"
  },
  {
    id: "dysport",
    name: "Dysport®",
    genericName: "AbobotulinumtoxinA",
    conversionFactor: 2.5,
    description: "Galderma - Fator de conversão 2.5:1"
  },
  {
    id: "xeomin",
    name: "Xeomin®",
    genericName: "IncobotulinumtoxinA",
    conversionFactor: 1.0,
    description: "Merz - Equivalente 1:1 ao Botox"
  },
  {
    id: "jeuveau",
    name: "Jeuveau®",
    genericName: "PrabotulinumtoxinA",
    conversionFactor: 1.0,
    description: "Evolus - Equivalente 1:1 ao Botox"
  },
  {
    id: "daxxify",
    name: "Daxxify®",
    genericName: "DaxibotulinumtoxinA",
    conversionFactor: 1.0,
    description: "Revance - Longa duração"
  }
];

interface ProductSelectorProps {
  selectedProduct: string;
  onProductChange: (productId: string, conversionFactor: number) => void;
}

export function ProductSelector({ selectedProduct, onProductChange }: ProductSelectorProps) {
  const currentProduct = TOXIN_PRODUCTS.find(p => p.id === selectedProduct) || TOXIN_PRODUCTS[0];

  const handleChange = (productId: string) => {
    const product = TOXIN_PRODUCTS.find(p => p.id === productId);
    if (product) {
      onProductChange(productId, product.conversionFactor);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="product-select">Produto/Marca</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                As dosagens são calculadas usando Botox® como referência. 
                Ao selecionar outra marca, as unidades são automaticamente convertidas.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <Select value={selectedProduct} onValueChange={handleChange}>
        <SelectTrigger id="product-select" className="w-full">
          <SelectValue placeholder="Selecione o produto" />
        </SelectTrigger>
        <SelectContent>
          {TOXIN_PRODUCTS.map((product) => (
            <SelectItem key={product.id} value={product.id}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{product.name}</span>
                {product.conversionFactor !== 1 && (
                  <Badge variant="secondary" className="text-xs">
                    {product.conversionFactor}x
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <p className="text-xs text-muted-foreground">
        {currentProduct.genericName} — {currentProduct.description}
      </p>

      {currentProduct.conversionFactor !== 1 && (
        <div className="p-2 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            ⚠️ As unidades exibidas serão multiplicadas por {currentProduct.conversionFactor} 
            (ex: 10U Botox = {10 * currentProduct.conversionFactor}U {currentProduct.name})
          </p>
        </div>
      )}
    </div>
  );
}
