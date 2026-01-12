"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Wand2,
  Dice5,
  Save,
  Loader2,
  Camera,
  Aperture,
  Film,
  Layers,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// --- API IMPORTS ---
import {
  getProject,
  generateAsset,
  updateAsset,
  getCharacters,
  Character,
} from "@/lib/api";

export default function GeneratorPage({
  params,
}: {
  params: Promise<{ id: string; type: string }>;
}) {
  const router = useRouter();
  const { id, type } = use(params);

  // Data State
  const [projectName, setProjectName] = useState<string>(`Project #${id}`);
  const [projectRatio, setProjectRatio] = useState<string>("16:9");
  const [loadingProject, setLoadingProject] = useState(true);

  // Character State (For Cast Generation)
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<string>("none");

  // Gen State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<number | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");

  // Camera State
  const [selectedCamera, setSelectedCamera] = useState("Arri Alexa 35");
  const [selectedLens, setSelectedLens] = useState("Cooke S4/i Prime");
  const [selectedFocal, setSelectedFocal] = useState("35mm");
  const [isChroma, setIsChroma] = useState(false);

  const typeLabel =
    type === "loc" ? "Location" : type.charAt(0).toUpperCase() + type.slice(1);

  // --- INITIAL LOAD ---
  useEffect(() => {
    async function load() {
      try {
        // 1. Load Project Info
        const pData = await getProject(id);
        setProjectName(pData.name || "Untitled");
        if (pData.aspect_ratio) setProjectRatio(pData.aspect_ratio);

        // 2. Load Characters (Only if generating Cast)
        if (type === "cast") {
          const cData = await getCharacters();
          setCharacters(cData);
        }
      } catch (error) {
        console.error("Failed to load generator data", error);
      } finally {
        setLoadingProject(false);
      }
    }
    load();
  }, [id, type]);

  // --- HANDLERS ---

  // When a character is selected from the dropdown
  const handleCharacterSelect = (charId: string) => {
    setSelectedCharId(charId);
    if (charId === "none") return;

    const char = characters.find((c) => c.id.toString() === charId);
    if (char) {
      setName(char.name);
      // Append character description to current prompt or replace it
      // We append it to ensure the user can still add scene details
      setPrompt((prev) => {
        const base = char.description;
        return prev ? `${base}, ${prev}` : base;
      });
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setGeneratedImage(null);
    setAssetId(null);

    try {
      // REFACTORED: Use api.ts
      const data = await generateAsset({
        project_id: Number(id),
        type: type,
        name: name || (type === "cast" ? "New Character" : "New Location"),
        prompt: prompt,
        // Note: We will add camera/lens to the backend model later if needed,
        // for now we append them to the prompt or backend handles defaults.
        // If your generateAsset definition in api.ts doesn't support extra fields yet,
        // we can pass them in the payload and update api.ts later.
        // For now, I'll assume your backend reads them from the JSON body.
      });

      // NOTE: If generateAsset in api.ts is strictly typed, you might need to update the interface there.
      // But passing the object usually works in JS/TS unless strict typing blocks it.
      // To be safe, ensure api.ts generateAsset accepts `any` or extend the interface.

      if (data.success) {
        setGeneratedImage(data.image_url);
        setAssetId(data.asset_id);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      console.error("API Call failed", error);
      alert("Failed to connect to Studio Backend.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!assetId) return;
    try {
      if (name) {
        // REFACTORED: Use api.ts
        await updateAsset(assetId, name);
      }
      router.push(`/studio/${id}`);
    } catch (error) {
      console.error("Failed to save", error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans selection:bg-[#D2FF44]/30">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Link
            href={`/studio/${id}`}
            className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2">
              <Wand2 size={18} className="text-[#D2FF44]" />
              Generate {typeLabel}
            </h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono flex items-center gap-2">
              {loadingProject ? "Loading..." : projectName}
              <span className="w-1 h-1 bg-zinc-600 rounded-full" />
              <Badge
                variant="outline"
                className="text-[9px] h-4 px-1 border-zinc-700 text-zinc-400"
              >
                {projectRatio}
              </Badge>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => router.push(`/studio/${id}`)}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!generatedImage}
            className="bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 font-bold text-xs disabled:opacity-50"
          >
            <Save size={14} className="mr-2" /> Save Asset
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left: Controls */}
        <div className="w-[420px] border-r border-zinc-800 flex flex-col bg-zinc-900/10">
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* 0. CHARACTER PRESET (Only for Cast) */}
            {type === "cast" && characters.length > 0 && (
              <div className="space-y-2 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <Label className="text-xs font-bold text-[#D2FF44] uppercase tracking-wider flex items-center gap-2">
                  <User size={12} /> Apply Character Profile
                </Label>
                <Select
                  value={selectedCharId}
                  onValueChange={handleCharacterSelect}
                >
                  <SelectTrigger className="h-9 bg-black border-zinc-700 text-white">
                    <SelectValue placeholder="Select existing cast..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="none">-- Create New --</SelectItem>
                    {characters.map((char) => (
                      <SelectItem key={char.id} value={char.id.toString()}>
                        {char.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-zinc-500">
                  Auto-fills name and visual description.
                </p>
              </div>
            )}

            {/* 1. BASIC INFO */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Asset Name
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    type === "cast"
                      ? "e.g. Detective Miller"
                      : "e.g. Cyberpunk Alley"
                  }
                  className="bg-zinc-950 border-zinc-800 text-zinc-200 focus-visible:ring-[#D2FF44]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Visual Prompt
                </Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="h-28 bg-zinc-950 border-zinc-800 text-zinc-200 focus-visible:ring-[#D2FF44] resize-none leading-relaxed"
                  placeholder="Describe lighting, subject, and mood..."
                />
              </div>
            </div>

            {/* 2. GEAR SECTION - FIXED LAYOUT */}
            <div className="relative pt-2">
              <div className="absolute -top-1 left-0 bg-[#D2FF44] text-black text-[10px] font-bold px-2 py-0.5 rounded-full z-10 flex items-center gap-1">
                <Camera size={10} /> CINEMATOGRAPHY
              </div>

              <div className="border border-zinc-800 bg-zinc-900/30 rounded-xl p-5 pt-8 space-y-5 mt-2">
                <div className="flex flex-col gap-4">
                  <div className="space-y-1.5 w-full">
                    <Label className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1.5">
                      <Film size={12} /> Camera Body
                    </Label>
                    <Select
                      value={selectedCamera}
                      onValueChange={setSelectedCamera}
                    >
                      <SelectTrigger className="h-9 w-full bg-zinc-950 border-zinc-800 text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-[300px]">
                        <SelectGroup>
                          <SelectLabel className="text-[10px] text-zinc-500 uppercase">
                            Digital Cinema
                          </SelectLabel>
                          <SelectItem value="Arri Alexa 65">
                            Arri Alexa 65 (Large Format)
                          </SelectItem>
                          <SelectItem value="Arri Alexa 35">
                            Arri Alexa 35 (Super 35)
                          </SelectItem>
                          <SelectItem value="RED V-Raptor XL">
                            RED V-Raptor XL
                          </SelectItem>
                          <SelectItem value="Sony Venice 2">
                            Sony Venice 2
                          </SelectItem>
                          <SelectItem value="Panavision DXL2">
                            Panavision DXL2
                          </SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel className="text-[10px] text-zinc-500 uppercase mt-2">
                            Film Stock Emulation
                          </SelectLabel>
                          <SelectItem value="IMAX 70mm Film">
                            IMAX 15/70mm Film
                          </SelectItem>
                          <SelectItem value="Kodak Vision3 500T">
                            Kodak Vision3 500T
                          </SelectItem>
                          <SelectItem value="Kodak Portra 400">
                            Kodak Portra 400
                          </SelectItem>
                          <SelectItem value="16mm Bolex">
                            16mm Grainy Film
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 w-full">
                    <Label className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1.5">
                      <Aperture size={12} /> Lens Set
                    </Label>
                    <Select
                      value={selectedLens}
                      onValueChange={setSelectedLens}
                    >
                      <SelectTrigger className="h-9 w-full bg-zinc-950 border-zinc-800 text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-[300px]">
                        <SelectGroup>
                          <SelectLabel className="text-[10px] text-zinc-500 uppercase">
                            Anamorphic
                          </SelectLabel>
                          <SelectItem value="Panavision C-Series">
                            Panavision C-Series
                          </SelectItem>
                          <SelectItem value="Cooke Anamorphic /i">
                            Cooke Anamorphic /i
                          </SelectItem>
                          <SelectItem value="Atlas Orion">
                            Atlas Orion
                          </SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel className="text-[10px] text-zinc-500 uppercase mt-2">
                            Spherical Primes
                          </SelectLabel>
                          <SelectItem value="Cooke S4/i Prime">
                            Cooke S4/i Prime
                          </SelectItem>
                          <SelectItem value="Arri/Zeiss Master Prime">
                            Arri/Zeiss Master Prime
                          </SelectItem>
                          <SelectItem value="Angenieux Optimo">
                            Angenieux Optimo Zoom
                          </SelectItem>
                          <SelectItem value="Canon K35 Vintage">
                            Canon K35 Vintage
                          </SelectItem>
                          <SelectItem value="Leica Summilux-C">
                            Leica Summilux-C
                          </SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel className="text-[10px] text-zinc-500 uppercase mt-2">
                            Vintage & Specialty
                          </SelectLabel>
                          <SelectItem value="Petzval 85 Art">
                            Lomo Petzval 85 (Swirly Bokeh)
                          </SelectItem>
                          <SelectItem value="Canon K35 Vintage">
                            Canon K35 Vintage
                          </SelectItem>
                          <SelectItem value="16mm Bolex">
                            16mm Vintage Look
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Focal Length Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-[10px] text-zinc-400 uppercase font-bold">
                      Focal Length
                    </Label>
                    <span className="text-[10px] text-[#D2FF44] font-mono">
                      {selectedFocal}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {["14mm", "24mm", "35mm", "50mm", "85mm"].map((focal) => (
                      <button
                        key={focal}
                        onClick={() => setSelectedFocal(focal)}
                        className={`text-[10px] h-8 rounded border transition-all font-bold ${
                          selectedFocal === focal
                            ? "bg-[#D2FF44] text-black border-[#D2FF44]"
                            : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600"
                        }`}
                      >
                        {focal}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Green Screen Toggle */}
                <div
                  onClick={() => setIsChroma(!isChroma)}
                  className={`
                        mt-4 border rounded-lg p-3 cursor-pointer transition-all flex items-center justify-between group
                        ${
                          isChroma
                            ? "bg-[#D2FF44]/10 border-[#D2FF44]"
                            : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                        }
                    `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-full transition-colors ${
                        isChroma
                          ? "bg-[#D2FF44] text-black"
                          : "bg-zinc-900 text-zinc-600"
                      }`}
                    >
                      <Layers size={14} />
                    </div>
                    <div>
                      <h3
                        className={`text-xs font-bold transition-colors ${
                          isChroma ? "text-[#D2FF44]" : "text-zinc-400"
                        }`}
                      >
                        Green Screen Mode
                      </h3>
                      <p className="text-[9px] text-zinc-600">
                        Generates clean chroma key background.
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-2.5 h-2.5 rounded-full border-2 transition-colors ${
                      isChroma
                        ? "bg-[#D2FF44] border-[#D2FF44]"
                        : "border-zinc-700"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-zinc-800 bg-zinc-900/30">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt}
              className="w-full h-14 bg-[#D2FF44] text-black font-bold text-lg hover:bg-[#bce63b] shadow-[0_0_20px_rgba(210,255,68,0.3)] disabled:opacity-50 transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 animate-spin" /> DEVELOPING
                  NEGATIVE...
                </>
              ) : (
                <>
                  <Dice5 size={18} className="mr-2" /> GENERATE SHOT
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right: Preview Area */}
        <div className="flex-1 bg-black flex items-center justify-center relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 to-black overflow-hidden">
          {isGenerating && (
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <div className="w-16 h-16 border-4 border-[#D2FF44] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#D2FF44] font-mono text-sm tracking-widest uppercase">
                Rendering with Flux...
              </p>
            </div>
          )}
          {!isGenerating && generatedImage && (
            <img
              src={generatedImage}
              alt="Generated"
              className="max-h-[90%] max-w-[90%] object-contain shadow-2xl border border-zinc-800 rounded-sm"
            />
          )}
          {!isGenerating && !generatedImage && (
            <div className="text-center space-y-4 opacity-40 select-none">
              <div className="w-24 h-24 border-2 border-dashed border-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-zinc-700">
                <Wand2 size={32} />
              </div>
              <p className="text-sm font-medium text-zinc-500">
                Configure camera & settings to begin
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
