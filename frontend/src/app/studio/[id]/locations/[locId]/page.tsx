"use client";

import { useState, useEffect, use, useRef } from "react";
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
    MapPin,
    ChevronRight,
    Download,
    Share2,
    Copy,
    MoreVertical,
    Trash2,
    Image as ImageIcon,
    UploadCloud,
    X,
    Info,
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

export default function LocationProfilePage({
    params,
}: {
    params: Promise<{ id: string; locId: string }>;
}) {
    const router = useRouter();
    const { id, locId } = use(params);

    // --- STATE ---
    const [location, setLocation] = useState<Asset | null>(null);
    const [scenes, setScenes] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);

    // Cinema Mode (Lightbox)
    const [viewedScene, setViewedScene] = useState<Asset | null>(null);

    // Generator State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [sceneName, setSceneName] = useState("");
    const [scenePrompt, setScenePrompt] = useState("");

    // Upload State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Camera State
    const [selectedCamera, setSelectedCamera] = useState("Arri Alexa 35");
    const [selectedLens, setSelectedLens] = useState("Cooke S4/i Prime");
    const [selectedFocal, setSelectedFocal] = useState("24mm"); // Wider default for locations
    const [isChroma, setIsChroma] = useState(false);

    // --- LOAD DATA ---
    async function loadData() {
        try {
            const assets = await getProjectAssets(id);
            const hero = assets.find((a) => a.id === Number(locId));

            if (hero) {
                setLocation(hero);
                // Load renders specific to this location
                const locScenes = assets.filter(
                    (a) =>
                        a.id !== hero.id &&
                        a.type === "loc_render" && // Specifically filter for location renders if possible, or fallback to name matching
                        (a.name.includes(hero.name) || a.prompt.includes(hero.name)),
                );
                setScenes(locScenes);
            }
        } catch (e) {
            console.error("Failed to load location", e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [id, locId]);

    // --- GENERATE SCENE ---
    const handleGenerateScene = async () => {
        if (!scenePrompt || !location) return;
        setIsGenerating(true);
        setGeneratedImage(null);

        const fullPrompt = `((${location.name})), ${scenePrompt}, shot on ${selectedCamera}, ${selectedLens}, ${selectedFocal}, cinematic wide shot, detailed environment, photorealistic${isChroma ? ", green screen background, chroma key, flat lighting" : ""
            }`;

        const finalName =
            sceneName || `${location.name} - Render ${scenes.length + 1}`;

        try {
            const data = await generateAsset({
                project_id: Number(id),
                type: "loc_render", // Distinguish from char_render
                name: finalName,
                prompt: fullPrompt,
            });

            if (data.success) {
                setGeneratedImage(data.image_url);
                await loadData(); // Refresh list
                setSceneName("");
                setScenePrompt("");
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
        setGeneratedImage(null);
        setScenePrompt("");
        setSceneName("");
    };

    // --- UPLOAD HANDLER ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !location) return;

        setIsUploading(true);
        try {
            await new Promise((r) => setTimeout(r, 1000)); // Mock delay
            alert(
                `Simulated Upload: ${file.name} added to ${location.name}'s folder.`,
            );
            await loadData();
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDelete = async (assetId: number) => {
        if (confirm("Delete this render?")) {
            await deleteAsset(assetId);
            if (viewedScene?.id === assetId) setViewedScene(null);
            await loadData();
        }
    };

    const handleDownload = (imageUrl: string, fileName: string) => {
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading)
        return (
            <div className="h-screen bg-black flex items-center justify-center text-[#D2FF44]">
                <Loader2 className="animate-spin mr-2" /> Loading Location...
            </div>
        );
    if (!location)
        return (
            <div className="h-screen bg-black text-white p-10">
                Location not found.
            </div>
        );

    return (
        <div className="h-screen bg-zinc-950 text-white font-sans selection:bg-[#D2FF44]/30 flex flex-col overflow-hidden">
            {/* HEADER */}
            <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur flex items-center px-6 justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/studio/${id}/locations`}
                        className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-lg flex items-center gap-2">
                            <MapPin size={18} className="text-[#D2FF44]" /> {location.name}
                        </h1>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono uppercase">
                            <span>Asset ID: {location.id}</span>
                            <ChevronRight size={10} />
                            <span className="text-[#D2FF44]">Environment Lab</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 text-zinc-400 hover:text-white text-xs"
                    >
                        <Share2 size={14} className="mr-2" /> Export Location
                    </Button>
                </div>
            </header>

            {/* WORKSPACE */}
            <div className="flex-1 flex overflow-hidden">
                {/* COL 1: IDENTITY (320px) - Restored Big Image */}
                <div className="w-[320px] border-r border-zinc-800 bg-zinc-900/20 flex flex-col flex-shrink-0">
                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                        {/* Hero Image Card */}
                        <div className="relative aspect-[16/9] rounded-xl overflow-hidden border-2 border-zinc-800 shadow-2xl mb-6 group">
                            <img
                                src={location.image_path}
                                className="w-full h-full object-cover"
                                alt="Hero Reference"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 flex items-end p-4">
                                <div>
                                    <Badge className="bg-[#D2FF44] text-black hover:bg-[#D2FF44] mb-2 font-bold">
                                        PRIMARY PLATE
                                    </Badge>
                                    <p className="text-[10px] text-zinc-400">
                                        Source environment for generation.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Base Data */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                    Location Description
                                </Label>
                                <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs text-zinc-300 leading-relaxed font-mono">
                                    {location.prompt || "No description provided."}
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

                {/* COL 2: GENERATOR (400px) - Full Kit */}
                <div className="w-[400px] border-r border-zinc-800 bg-zinc-900/10 flex flex-col flex-shrink-0">
                    <div className="p-6 border-b border-zinc-800 bg-zinc-900/30 shrink-0">
                        <h2 className="font-bold text-sm flex items-center gap-2 text-zinc-200">
                            <Wand2 className="text-[#D2FF44]" size={16} /> Variation Generator
                        </h2>
                        <p className="text-[10px] text-zinc-500 mt-1">
                            Create new angles or lighting for{" "}
                            <span className="text-white font-bold">{location.name}</span>.
                        </p>
                    </div>

                    <ScrollArea className="flex-1 p-6 pb-24">
                        <div className="space-y-6">
                            {/* Scene Name */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-zinc-400 uppercase">
                                    Render Name
                                </Label>
                                <Input
                                    value={sceneName}
                                    onChange={(e) => setSceneName(e.target.value)}
                                    className="bg-zinc-950 border-zinc-800 text-white focus-visible:ring-[#D2FF44]"
                                    placeholder={`e.g. ${location.name} - Angle 2`}
                                />
                            </div>

                            {/* Prompt */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-zinc-400 uppercase">
                                    Adjustments / Action
                                </Label>
                                <Textarea
                                    value={scenePrompt}
                                    onChange={(e) => setScenePrompt(e.target.value)}
                                    className="bg-zinc-950 border-zinc-800 min-h-[100px] text-base focus-visible:ring-[#D2FF44]"
                                    placeholder={`e.g. ${location.name} at sunset, heavy rain, wide angle shot from above...`}
                                />
                            </div>

                            {/* FULL CAMERA KIT */}
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
                                                <SelectTrigger className="h-9 bg-zinc-950 border-zinc-800 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-[300px]">
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
                                                            IMAX 15/70mm
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
                                                <SelectTrigger className="h-9 bg-zinc-950 border-zinc-800 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-[300px]">
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
                                                        <SelectItem value="Atlas Orion">
                                                            Atlas Orion
                                                        </SelectItem>
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
                                    </div>

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
                                                    className={`text-[10px] h-8 rounded border transition-all font-bold ${selectedFocal === focal ? "bg-[#D2FF44] text-black border-[#D2FF44]" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600"}`}
                                                >
                                                    {focal}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setIsChroma(!isChroma)}
                                        className={`mt-4 border rounded-lg p-3 cursor-pointer transition-all flex items-center justify-between group ${isChroma ? "bg-[#D2FF44]/10 border-[#D2FF44]" : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`p-1.5 rounded-full transition-colors ${isChroma ? "bg-[#D2FF44] text-black" : "bg-zinc-900 text-zinc-600"}`}
                                            >
                                                <Layers size={14} />
                                            </div>
                                            <div>
                                                <h3
                                                    className={`text-xs font-bold transition-colors ${isChroma ? "text-[#D2FF44]" : "text-zinc-400"}`}
                                                >
                                                    Green Screen Mode
                                                </h3>
                                                <p className="text-[9px] text-zinc-600">
                                                    Clean chroma key background.
                                                </p>
                                            </div>
                                        </div>
                                        <div
                                            className={`w-2.5 h-2.5 rounded-full border-2 transition-colors ${isChroma ? "bg-[#D2FF44] border-[#D2FF44]" : "border-zinc-700"}`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <div className="p-6 border-t border-zinc-800 bg-zinc-900/30 flex-shrink-0">
                        <Button
                            onClick={handleGenerateScene}
                            disabled={!scenePrompt || isGenerating}
                            className="w-full h-14 bg-[#D2FF44] text-black font-bold text-lg hover:bg-[#bce63b] shadow-[0_0_20px_rgba(210,255,68,0.3)] disabled:opacity-50 transition-all"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="animate-spin mr-2" /> RENDERING VARIATION...
                                </>
                            ) : (
                                <>
                                    <Dice5 className="mr-2" /> GENERATE RENDER
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* COL 3: GALLERY & UPLOAD (Right) */}
                <div className="flex-1 bg-black relative flex flex-col">
                    {/* Top Bar with Upload */}
                    <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-900/20 backdrop-blur-sm shrink-0">
                        <div className="flex items-center gap-3">
                            <ImageIcon size={16} className="text-zinc-500" />
                            <span className="text-sm font-bold text-zinc-300">
                                Environment Renders
                            </span>
                            <Badge
                                variant="secondary"
                                className="bg-zinc-800 text-zinc-400 ml-1"
                            >
                                {scenes.length}
                            </Badge>
                        </div>
                        <div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileUpload}
                            />
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 text-xs font-bold border border-zinc-700"
                            >
                                {isUploading ? (
                                    <Loader2 size={12} className="animate-spin mr-2" />
                                ) : (
                                    <UploadCloud size={14} className="mr-2" />
                                )}
                                {isUploading ? "IMPORTING..." : "UPLOAD RENDER"}
                            </Button>
                        </div>
                    </div>

                    {/* Gallery Grid */}
                    <div className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/30 to-black">
                        {isGenerating ? (
                            <div className="h-full flex flex-col items-center justify-center">
                                <div className="text-center space-y-4 animate-pulse">
                                    <div className="w-20 h-20 border-4 border-[#D2FF44] border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="text-[#D2FF44] font-mono text-xs tracking-widest uppercase">
                                        Ranking Environment Details...
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {scenes.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-30 select-none min-h-[400px]">
                                        <Wand2 size={48} className="mb-4" />
                                        <h3 className="text-xl font-bold">Gallery Empty</h3>
                                        <p className="text-sm text-zinc-500 mt-2">
                                            Generate a variation or upload an image.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {scenes
                                            .slice()
                                            .reverse()
                                            .map((scene) => (
                                                <div
                                                    key={scene.id}
                                                    onClick={() => setViewedScene(scene)}
                                                    className="group relative aspect-video bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-[#D2FF44] hover:shadow-2xl transition-all cursor-zoom-in"
                                                >
                                                    <img
                                                        src={scene.image_path}
                                                        className="w-full h-full object-cover"
                                                    />

                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button
                                                                    className="bg-black/50 p-1 rounded text-white hover:bg-[#D2FF44] hover:text-black"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <MoreVertical size={14} />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent className="bg-zinc-950 border-zinc-800 text-white">
                                                                <DropdownMenuItem
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDelete(scene.id);
                                                                    }}
                                                                    className="text-red-500"
                                                                >
                                                                    <Trash2 size={12} className="mr-2" /> Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <p className="text-[10px] font-mono text-zinc-300 truncate">
                                                            {scene.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* --- CINEMA MODE OVERLAY (Light Box) --- */}
            {viewedScene && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setViewedScene(null)}
                >
                    <button
                        className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
                        onClick={() => setViewedScene(null)}
                    >
                        <X size={32} />
                    </button>

                    <div
                        className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center group"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={viewedScene.image_path}
                            className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-sm border border-zinc-900"
                        />

                        <div className="mt-6 flex items-center gap-4 bg-black/50 border border-zinc-800 px-6 py-3 rounded-full backdrop-blur-xl text-zinc-300 transition-transform group-hover:scale-105">
                            <div className="flex items-center gap-2 pr-4 border-r border-zinc-700">
                                <Info size={14} className="text-[#D2FF44]" />
                                <span className="text-xs font-bold text-white">
                                    {viewedScene.name}
                                </span>
                            </div>
                            <p className="text-[10px] font-mono opacity-70 max-w-md truncate">
                                {viewedScene.prompt || "Imported Image"}
                            </p>
                            <div className="pl-4 border-l border-zinc-700 flex gap-2">
                                <Button
                                    size="sm"
                                    className="h-7 text-[10px] bg-[#D2FF44] text-black hover:bg-white"
                                    onClick={() =>
                                        handleDownload(
                                            viewedScene.image_path,
                                            viewedScene.name + ".png",
                                        )
                                    }
                                >
                                    <Download size={12} className="mr-1" /> HIGH RES
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
