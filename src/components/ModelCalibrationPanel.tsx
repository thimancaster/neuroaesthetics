import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Settings2, RotateCcw, Save, Eye, EyeOff, Crosshair } from "lucide-react";

export interface CalibrationConfig {
  scale: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  xScale: number;
  yScale: number;
  baseDepth: number;
}

interface ModelCalibrationPanelProps {
  config: CalibrationConfig;
  onConfigChange: (config: CalibrationConfig) => void;
  onReset: () => void;
  onSave: () => void;
  isVisible: boolean;
  onVisibilityChange: (visible: boolean) => void;
  showTestPoints?: boolean;
  onToggleTestPoints?: (show: boolean) => void;
}

// Default calibration values (matching MODEL_CONFIG in Face3DViewer)
export const DEFAULT_CALIBRATION: CalibrationConfig = {
  scale: 0.018,
  positionX: 0,
  positionY: -0.55,
  positionZ: -0.3,
  rotationX: 0.05,
  rotationY: 0,
  rotationZ: 0,
  xScale: 1.40,
  yScale: 1.85,
  baseDepth: 1.35,
};

export function ModelCalibrationPanel({
  config,
  onConfigChange,
  onReset,
  onSave,
  isVisible,
  onVisibilityChange,
  showTestPoints = false,
  onToggleTestPoints,
}: ModelCalibrationPanelProps) {
  const [activeSection, setActiveSection] = useState<"transform" | "mapping">("transform");

  const updateConfig = (key: keyof CalibrationConfig, value: number) => {
    onConfigChange({ ...config, [key]: value });
  };

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onVisibilityChange(true)}
        className="flex items-center gap-2"
      >
        <Settings2 className="w-4 h-4" />
        Calibração do Modelo
      </Button>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-amber-600" />
            Calibração do Modelo 3D
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onVisibilityChange(false)}>
              <EyeOff className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-2 px-4 space-y-4">
        {/* Section Tabs */}
        <div className="flex gap-2">
          <Badge
            variant={activeSection === "transform" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setActiveSection("transform")}
          >
            Transformação
          </Badge>
          <Badge
            variant={activeSection === "mapping" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setActiveSection("mapping")}
          >
            Mapeamento
          </Badge>
        </div>

        {activeSection === "transform" && (
          <div className="space-y-4">
            {/* Scale */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Escala</Label>
                <span className="text-xs text-muted-foreground font-mono">{config.scale.toFixed(4)}</span>
              </div>
              <Slider
                value={[config.scale * 1000]}
                onValueChange={([v]) => updateConfig("scale", v / 1000)}
                min={10}
                max={40}
                step={0.5}
                className="cursor-pointer"
              />
            </div>

            {/* Position X */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Posição X (Horizontal)</Label>
                <span className="text-xs text-muted-foreground font-mono">{config.positionX.toFixed(2)}</span>
              </div>
              <Slider
                value={[config.positionX * 100 + 100]}
                onValueChange={([v]) => updateConfig("positionX", (v - 100) / 100)}
                min={0}
                max={200}
                step={1}
                className="cursor-pointer"
              />
            </div>

            {/* Position Y */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Posição Y (Vertical)</Label>
                <span className="text-xs text-muted-foreground font-mono">{config.positionY.toFixed(2)}</span>
              </div>
              <Slider
                value={[config.positionY * 100 + 150]}
                onValueChange={([v]) => updateConfig("positionY", (v - 150) / 100)}
                min={0}
                max={300}
                step={1}
                className="cursor-pointer"
              />
            </div>

            {/* Position Z */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Posição Z (Profundidade)</Label>
                <span className="text-xs text-muted-foreground font-mono">{config.positionZ.toFixed(2)}</span>
              </div>
              <Slider
                value={[config.positionZ * 100 + 100]}
                onValueChange={([v]) => updateConfig("positionZ", (v - 100) / 100)}
                min={0}
                max={200}
                step={1}
                className="cursor-pointer"
              />
            </div>

            {/* Rotation X */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Rotação X (Inclinação)</Label>
                <span className="text-xs text-muted-foreground font-mono">{(config.rotationX * 180 / Math.PI).toFixed(1)}°</span>
              </div>
              <Slider
                value={[config.rotationX * 100 + 50]}
                onValueChange={([v]) => updateConfig("rotationX", (v - 50) / 100)}
                min={0}
                max={100}
                step={1}
                className="cursor-pointer"
              />
            </div>

            {/* Rotation Y */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Rotação Y (Giro)</Label>
                <span className="text-xs text-muted-foreground font-mono">{(config.rotationY * 180 / Math.PI).toFixed(1)}°</span>
              </div>
              <Slider
                value={[config.rotationY * 100 + 50]}
                onValueChange={([v]) => updateConfig("rotationY", (v - 50) / 100)}
                min={0}
                max={100}
                step={1}
                className="cursor-pointer"
              />
            </div>
          </div>
        )}

        {activeSection === "mapping" && (
          <div className="space-y-4">
            {/* X Scale */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Escala Horizontal (X)</Label>
                <span className="text-xs text-muted-foreground font-mono">{config.xScale.toFixed(2)}</span>
              </div>
              <Slider
                value={[config.xScale * 50]}
                onValueChange={([v]) => updateConfig("xScale", v / 50)}
                min={50}
                max={150}
                step={1}
                className="cursor-pointer"
              />
            </div>

            {/* Y Scale */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Escala Vertical (Y)</Label>
                <span className="text-xs text-muted-foreground font-mono">{config.yScale.toFixed(2)}</span>
              </div>
              <Slider
                value={[config.yScale * 50]}
                onValueChange={([v]) => updateConfig("yScale", v / 50)}
                min={75}
                max={150}
                step={1}
                className="cursor-pointer"
              />
            </div>

            {/* Base Depth */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Profundidade Base (Z)</Label>
                <span className="text-xs text-muted-foreground font-mono">{config.baseDepth.toFixed(2)}</span>
              </div>
              <Slider
                value={[config.baseDepth * 50]}
                onValueChange={([v]) => updateConfig("baseDepth", v / 50)}
                min={50}
                max={100}
                step={1}
                className="cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Test Points Toggle */}
        {onToggleTestPoints && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Switch
              id="test-points"
              checked={showTestPoints}
              onCheckedChange={onToggleTestPoints}
            />
            <Label htmlFor="test-points" className="text-xs flex items-center gap-1 cursor-pointer">
              <Crosshair className="w-3 h-3" />
              Mostrar Pontos de Teste
            </Label>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="w-3 h-3 mr-1" />
            Resetar
          </Button>
          <Button size="sm" onClick={onSave}>
            <Save className="w-3 h-3 mr-1" />
            Salvar Calibração
          </Button>
        </div>

        {/* Preset Info */}
        <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
          💡 Ajuste os parâmetros até que os pontos de injeção alinhem perfeitamente com a anatomia muscular do modelo 3D.
        </div>
      </CardContent>
    </Card>
  );
}
