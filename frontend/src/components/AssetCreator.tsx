"use client";

import { useState } from "react";
import {
  X,
  Aperture,
  Video,
  Sparkles,
  Save,
  RefreshCw,
  Clapperboard,
  MapPin,
  Box,
  Maximize,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Reusing your constants
const CAMERAS = ["Red V-Raptor", "Sony Venice", "ARRI Alexa 35", "IMAX Film"];
const LENSES = [
  "Cooke S4",
  "Panavision C-Series",
  "Zeiss Ultra Prime",
  "Hawk V-Lite",
];

interface AssetCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  type: "cast" | "loc" | "prop";
}

export function AssetCreator({ isOpen, onClose, type }: AssetCreatorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = () => {
    setIsGenerating(true);
    setGeneratedImage(null);
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedImage(
        type === "cast"
          ? "https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=1200&q=80"
          : "https://images.unsplash.com/photo-1572061486967-3d12222b0717?w=1200&q=80"
      );
    }, 2000);
  };

  const handleSave = () => {
    onClose();
    setGeneratedImage(null);
  };

  const getIcon = () => {
    if (type === "cast") return <Sparkles size={18} />;
    if (type === "loc") return <MapPin size={18} />;
    return <Box size={18} />;
  };

  const getTitle = () => {
    if (type === "cast") return "Casting Call";
    if (type === "loc") return "Location Scout";
    return "Prop Shop";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "bg-zinc-950 border-zinc-800 p-0 overflow-hidden flex gap-0 text-white",
          // FORCE FULL WIDTH & HEIGHT OVERRIDES
          "w-[96vw] max-w-none h-[90vh]", // Wide mode
          "[&>button]:hidden" // Hide default close X
        )}
      >
        <DialogTitle className="sr-only">Create New Asset</DialogTitle>

        {/* --- LEFT: CONTROLS (Fixed Width) --- */}
        <div className="w-[380px] shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-900/50 h-full relative z-10">
          {/* Header */}
          <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
            <div className="p-2 bg-[#D2FF44] rounded-lg text-black shadow-[0_0_10px_rgba(210,255,68,0.2)]">
              {getIcon()}
            </div>
            <div>
              <h2 className="font-bold text-lg uppercase tracking-wider leading-none">
                {getTitle()}
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono mt-1">
                NEW ASSET ENTRY
              </p>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            {/* Identity Section */}
            <div className="space-y-4">
              <Label className="text-zinc-400 text-xs uppercase font-bold tracking-wider">
                Identity
              </Label>
              <Input
                placeholder={
                  type === "cast"
                    ? "Character Name (e.g. Neo)"
                    : "Location Name"
                }
                className="bg-zinc-950/50 border-zinc-800 focus:border-[#D2FF44] h-11"
              />
              <Textarea
                placeholder={
                  type === "cast"
                    ? "Describe visual details: Age, ethnicity, clothing, scars, hair style..."
                    : "Describe environment: Time of day, weather, atmosphere, key objects..."
                }
                className="bg-zinc-950/50 border-zinc-800 focus:border-[#D2FF44] min-h-[120px] resize-none leading-relaxed"
              />
            </div>

            {/* Camera Gear Section */}
            <div className="space-y-4 p-5 rounded-2xl bg-black/40 border border-zinc-800/50">
              <Label className="text-zinc-500 text-[10px] uppercase font-bold flex items-center gap-2">
                <Video size={12} /> Camera Configuration
              </Label>

              <div className="grid grid-cols-1 gap-3">
                <Select defaultValue={CAMERAS[0]}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    {CAMERAS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select defaultValue={LENSES[0]}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    {LENSES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Generate Button Footer */}
          <div className="p-6 border-t border-zinc-800 bg-zinc-900/30">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full h-14 bg-[#D2FF44] hover:bg-[#bce63b] text-black font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(210,255,68,0.15)] hover:shadow-[0_0_30px_rgba(210,255,68,0.3)] transition-all hover:scale-[1.02]"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 animate-spin" size={20} />{" "}
                  Developing...
                </>
              ) : (
                <>
                  <Aperture className="mr-2" size={20} /> Develop Shot
                </>
              )}
            </Button>
          </div>
        </div>

        {/* --- RIGHT: PREVIEW AREA (Expands) --- */}
        <div className="flex-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 relative flex flex-col h-full">
          {/* Top Bar */}
          <div className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-8 bg-black/20 shrink-0">
            <div className="flex items-center gap-2 opacity-50">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-mono tracking-widest">
                LIVE PREVIEW
              </span>
            </div>

            {/* Custom Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-zinc-500 hover:text-white hover:bg-white/10 rounded-full w-10 h-10"
            >
              <X size={22} />
            </Button>
          </div>

          {/* Main Canvas */}
          <div className="flex-1 flex items-center justify-center p-12 overflow-hidden relative">
            {/* Grid Overlay for "Tech" feel */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

            {isGenerating ? (
              <div className="flex flex-col items-center gap-6 animate-pulse z-10">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-[#D2FF44]/30 border-t-[#D2FF44] animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCw
                      size={32}
                      className="text-[#D2FF44] animate-pulse"
                    />
                  </div>
                </div>
                <p className="text-sm font-mono text-[#D2FF44] tracking-widest">
                  RENDERING FLUX DEV...
                </p>
              </div>
            ) : generatedImage ? (
              <div className="relative w-full h-full animate-in zoom-in-95 duration-500 flex items-center justify-center group">
                <div className="relative shadow-2xl transition-transform duration-500">
                  <img
                    src={generatedImage}
                    className="max-w-full max-h-[70vh] object-contain border border-zinc-800 rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                  />
                  {/* Badge Overlay */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <Badge className="bg-[#D2FF44] text-black hover:bg-[#D2FF44] border-none font-bold">
                      Flux Dev
                    </Badge>
                    <Badge className="bg-black/50 backdrop-blur-md text-white border-zinc-700">
                      RAW
                    </Badge>
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      className="bg-black/60 hover:bg-black text-white rounded-full"
                    >
                      <Maximize size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center opacity-20 select-none z-10">
                <Clapperboard
                  size={80}
                  className="mx-auto mb-6 text-zinc-500"
                />
                <p className="font-mono text-base tracking-[0.2em]">
                  NO SIGNAL
                </p>
                <p className="text-xs text-zinc-600 mt-2">
                  Enter prompt details to develop shot
                </p>
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          {generatedImage && (
            <div className="h-24 border-t border-zinc-800 flex items-center justify-between px-8 bg-zinc-900/80 shrink-0 backdrop-blur-sm z-20">
              <div className="text-xs text-zinc-500 font-mono">
                <p>RES: 1536 x 640</p>
                <p>FMT: PNG (RAW)</p>
              </div>
              <Button
                onClick={handleSave}
                size="lg"
                className="bg-white text-black hover:bg-zinc-200 font-bold h-12 px-8 text-base shadow-lg"
              >
                <Save size={18} className="mr-2" /> Save to{" "}
                {type === "cast"
                  ? "Cast"
                  : type === "loc"
                  ? "Locations"
                  : "Props"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
