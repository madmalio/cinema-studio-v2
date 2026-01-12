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
  ChevronRight,
  Download,
  Share2,
  Copy,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- API IMPORTS ---
import { getProjectAssets, generateAsset, deleteAsset, Asset } from "@/lib/api";

export default function CharacterProfilePage({
  params,
}: {
  params: Promise<{ id: string; charId: string }>;
}) {
  const router = useRouter();
  const { id, charId } = use(params);

  // --- STATE ---
  const [character, setCharacter] = useState<Asset | null>(null);
  const [scenes, setScenes] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // Generator State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [sceneName, setSceneName] = useState("");
  const [scenePrompt, setScenePrompt] = useState("");

  // Camera State (FULL DATABASE)
  const [selectedCamera, setSelectedCamera] = useState("Arri Alexa 35");
  const [selectedLens, setSelectedLens] = useState("Cooke S4/i Prime");
  const [selectedFocal, setSelectedFocal] = useState("35mm");
  const [isChroma, setIsChroma] = useState(false);

  // --- LOAD DATA ---
  useEffect(() => {
    async function load() {
      try {
        const assets = await getProjectAssets(id);
        const hero = assets.find((a) => a.id === Number(charId));

        if (hero) {
          setCharacter(hero);
          // Load scenes (assets that contain the character name, excluding the hero itself)
          const charScenes = assets.filter(
            (a) =>
              a.id !== hero.id &&
              (a.name.includes(hero.name) || a.prompt.includes(hero.name))
          );
          setScenes(charScenes);
        } else {
          console.error("Character not found");
        }
      } catch (e) {
        console.error("Failed to load character", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, charId]);

  // --- GENERATE SCENE ---
  const handleGenerateScene = async () => {
    if (!scenePrompt || !character) return;
    setIsGenerating(true);
    setGeneratedImage(null);

    const fullPrompt = `((${
      character.name
    })), ${scenePrompt}, shot on ${selectedCamera}, ${selectedLens}, ${selectedFocal}, cinematic lighting, photorealistic${
      isChroma ? ", green screen background, chroma key, flat lighting" : ""
    }`;

    // Auto-name if empty
    const finalName =
      sceneName || `${character.name} - Scene ${scenes.length + 1}`;

    try {
      const data = await generateAsset({
        project_id: Number(id),
        type: "char_render",
        name: finalName,
        prompt: fullPrompt,
      });

      if (data.success) {
        setGeneratedImage(data.image_url);
        // Reload scenes to show new image in grid
        const assets = await getProjectAssets(id);
        const charScenes = assets.filter(
          (a) =>
            a.id !== Number(charId) &&
            (a.name.includes(character.name) ||
              a.prompt.includes(character.name))
        );
        setScenes(charScenes);
      } else {
        alert("Generation failed: " + data.error);
      }
    } catch (e) {
      alert("Backend error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveScene = async () => {
    // Reset Generator for next shot
    setGeneratedImage(null);
    setScenePrompt("");
    setSceneName("");
  };

  const handleDelete = async (assetId: number) => {
    if (confirm("Delete this scene?")) {
      await deleteAsset(assetId);
      // Refresh
      const assets = await getProjectAssets(id);
      if (character) {
        setScenes(
          assets.filter(
            (a) => a.id !== character.id && a.name.includes(character.name)
          )
        );
      }
    }
  };

  if (loading)
    return (
      <div className="h-screen bg-black flex items-center justify-center text-[#D2FF44]">
        <Loader2 className="animate-spin mr-2" /> Loading Profile...
      </div>
    );
  if (!character)
    return (
      <div className="h-screen bg-black text-white p-10">
        Character not found.
      </div>
    );

  return (
    <div className="h-screen bg-zinc-950 text-white font-sans selection:bg-[#D2FF44]/30 flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur flex items-center px-6 justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href={`/studio/${id}/characters`}
            className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-bold text-lg flex items-center gap-2">
              <User size={18} className="text-[#D2FF44]" /> {character.name}
            </h1>
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono uppercase">
              <span>Asset ID: {character.id}</span>
              <ChevronRight size={10} />
              <span className="text-[#D2FF44]">Scene Workshop</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-400 hover:text-white text-xs"
          >
            <Share2 size={14} className="mr-2" /> Export Profile
          </Button>
        </div>
      </header>

      {/* WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: IDENTITY (Source of Truth) */}
        <div className="w-[320px] border-r border-zinc-800 bg-zinc-900/20 flex flex-col flex-shrink-0">
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            {/* Hero Image Card (BIGGER) */}
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-zinc-800 shadow-2xl mb-6 group">
              <img
                src={character.image_path}
                className="w-full h-full object-cover"
                alt="Hero Reference"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 flex items-end p-4">
                <div>
                  <Badge className="bg-[#D2FF44] text-black hover:bg-[#D2FF44] mb-2 font-bold">
                    HERO REFERENCE
                  </Badge>
                  <p className="text-[10px] text-zinc-400">
                    Source DNA for generation.
                  </p>
                </div>
              </div>
            </div>

            {/* Base Data */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Base Description
                </Label>
                <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs text-zinc-300 leading-relaxed font-mono">
                  {character.prompt || "No description provided."}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-[10px] text-zinc-500 h-6"
                >
                  <Copy size={10} className="mr-2" /> Copy Prompt
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: SCENE GENERATOR (Narrower: 400px) */}
        <div className="w-[400px] border-r border-zinc-800 bg-zinc-900/10 flex flex-col flex-shrink-0">
          <div className="p-6 border-b border-zinc-800 bg-zinc-900/30 shrink-0">
            <h2 className="font-bold text-sm flex items-center gap-2 text-zinc-200">
              <Wand2 className="text-[#D2FF44]" size={16} /> Scene Generator
            </h2>
            <p className="text-[10px] text-zinc-500 mt-1">
              Place{" "}
              <span className="text-white font-bold">{character.name}</span>{" "}
              into a new context.
            </p>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {/* Scene Name */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-400 uppercase">
                  Scene Name
                </Label>
                <Input
                  value={sceneName}
                  onChange={(e) => setSceneName(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white focus-visible:ring-[#D2FF44]"
                  placeholder={`e.g. ${character.name} - Scene 001`}
                />
              </div>

              {/* Prompt Input */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-400 uppercase">
                  Context / Action
                </Label>
                <Textarea
                  value={scenePrompt}
                  onChange={(e) => setScenePrompt(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 min-h-[100px] text-base focus-visible:ring-[#D2FF44]"
                  placeholder={`e.g. ${character.name} sitting in a 1950s diner at night, drinking coffee...`}
                />
              </div>

              {/* FULL CAMERA KIT */}
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4 space-y-4">
                <Label className="text-[10px] font-bold text-[#D2FF44] uppercase flex items-center gap-2">
                  <Camera size={12} /> Scene Cinematography
                </Label>

                {/* Camera Body */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-500 font-bold uppercase">
                    Camera Body
                  </Label>
                  <Select
                    value={selectedCamera}
                    onValueChange={setSelectedCamera}
                  >
                    <SelectTrigger className="h-8 bg-zinc-950 border-zinc-800 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectGroup>
                        <SelectLabel className="text-[10px] text-zinc-500">
                          Digital Cinema
                        </SelectLabel>
                        <SelectItem value="Arri Alexa 65">
                          Arri Alexa 65
                        </SelectItem>
                        <SelectItem value="Arri Alexa 35">
                          Arri Alexa 35
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
                        <SelectLabel className="text-[10px] text-zinc-500 mt-2">
                          Film Stock
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

                {/* Lens */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-500 font-bold uppercase">
                    Lens Set
                  </Label>
                  <Select value={selectedLens} onValueChange={setSelectedLens}>
                    <SelectTrigger className="h-8 bg-zinc-950 border-zinc-800 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectGroup>
                        <SelectLabel className="text-[10px] text-zinc-500">
                          Anamorphic
                        </SelectLabel>
                        <SelectItem value="Panavision C-Series">
                          Panavision C-Series
                        </SelectItem>
                        <SelectItem value="Cooke Anamorphic /i">
                          Cooke Anamorphic /i
                        </SelectItem>
                        <SelectItem value="Atlas Orion">Atlas Orion</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-[10px] text-zinc-500 mt-2">
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
                        <SelectLabel className="text-[10px] text-zinc-500 mt-2">
                          Vintage
                        </SelectLabel>
                        <SelectItem value="Petzval 85 Art">
                          Petzval 85 Art
                        </SelectItem>
                        <SelectItem value="16mm Bolex">
                          16mm Vintage Look
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* Focal Length */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-[10px] text-zinc-500 uppercase font-bold">
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
                        className={`text-[10px] h-7 rounded border transition-all font-bold ${
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

                {/* Green Screen */}
                <div
                  onClick={() => setIsChroma(!isChroma)}
                  className={`border rounded p-2 cursor-pointer transition-all flex items-center justify-between group ${
                    isChroma
                      ? "bg-[#D2FF44]/10 border-[#D2FF44]"
                      : "bg-zinc-950 border-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers
                      size={14}
                      className={isChroma ? "text-[#D2FF44]" : "text-zinc-500"}
                    />
                    <span
                      className={`text-[10px] font-bold ${
                        isChroma ? "text-[#D2FF44]" : "text-zinc-500"
                      }`}
                    >
                      Green Screen Mode
                    </span>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full border ${
                      isChroma
                        ? "bg-[#D2FF44] border-[#D2FF44]"
                        : "border-zinc-600"
                    }`}
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerateScene}
                disabled={!scenePrompt || isGenerating}
                className="w-full h-12 bg-[#D2FF44] text-black font-bold hover:bg-[#bce63b] shadow-[0_0_20px_rgba(210,255,68,0.2)]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin mr-2" /> Rendering Scene...
                  </>
                ) : (
                  <>
                    <Dice5 className="mr-2" /> Generate Scene
                  </>
                )}
              </Button>
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT COLUMN: PREVIEW / GALLERY */}
        <div className="flex-1 bg-black relative flex flex-col">
          {/* Main Preview */}
          <div className="flex-1 flex items-center justify-center relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/40 to-black overflow-hidden p-8">
            {isGenerating ? (
              <div className="text-center space-y-4 animate-pulse">
                <div className="w-20 h-20 border-4 border-[#D2FF44] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[#D2FF44] font-mono text-xs tracking-widest uppercase">
                  Applying Identity...
                </p>
              </div>
            ) : generatedImage ? (
              <div className="relative w-full h-full flex items-center justify-center group">
                <img
                  src={generatedImage}
                  className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
                />
                <div className="absolute bottom-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    onClick={handleSaveScene}
                    className="bg-[#D2FF44] text-black font-bold hover:bg-[#bce63b]"
                  >
                    <Save size={16} className="mr-2" /> Save to Gallery
                  </Button>
                  <Button
                    variant="secondary"
                    className="bg-zinc-800 text-white hover:bg-zinc-700"
                  >
                    <Download size={16} />
                  </Button>
                </div>
              </div>
            ) : (
              // SHOW SCENES GALLERY IF NOT GENERATING
              <div className="w-full h-full overflow-y-auto p-4">
                {scenes.length > 0 ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {scenes
                      .slice()
                      .reverse()
                      .map((scene) => (
                        <div
                          key={scene.id}
                          className="group relative aspect-video bg-zinc-900 rounded border border-zinc-800 hover:border-[#D2FF44] transition-all"
                        >
                          <img
                            src={scene.image_path}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="bg-black/50 p-1 rounded text-white hover:bg-[#D2FF44] hover:text-black">
                                  <MoreVertical size={14} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-zinc-950 border-zinc-800 text-white">
                                <DropdownMenuItem
                                  onClick={() => handleDelete(scene.id)}
                                  className="text-red-500"
                                >
                                  <Trash2 size={12} className="mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] text-zinc-300 truncate">
                              {scene.name}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
                    <Film size={48} className="mx-auto mb-4" />
                    <h3 className="text-xl font-bold">Scene Gallery Empty</h3>
                    <p className="text-sm">
                      Generated outcomes will appear here.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
