"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    MapPin,
    Plus,
    Loader2,
    ArrowLeft,
    Search,
    MoreVertical,
    Trash2,
    User,
    Wand2,
    Dice5,
    Save,
    Camera,
    Aperture,
    Film,
    Layers,
    UploadCloud,
    Image as ImageIcon,
    Map,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";

// --- API IMPORTS ---
import {
    getProject,
    getProjectAssets,
    deleteAsset,
    generateAsset,
    updateAsset,
    Asset,
} from "@/lib/api";

export default function LocationsListPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const router = useRouter();
    const { id } = use(params);

    // --- STATE ---
    const [viewMode, setViewMode] = useState<"grid" | "create">("grid");
    const [locations, setLocations] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [projectName, setProjectName] = useState("");

    // Create Mode State
    const [activeTab, setActiveTab] = useState("generate"); // 'generate' | 'upload'

    // Generator State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [newAssetId, setNewAssetId] = useState<number | null>(null);

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Inputs
    const [name, setName] = useState("");
    const [prompt, setPrompt] = useState("");

    // Camera Kit
    const [selectedCamera, setSelectedCamera] = useState("Arri Alexa 35");
    const [selectedLens, setSelectedLens] = useState("Cooke S4/i Prime");
    const [selectedFocal, setSelectedFocal] = useState("24mm"); // Wider for locations
    const [isChroma, setIsChroma] = useState(false);

    // --- DELETE MODAL STATE ---
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [assetToDelete, setAssetToDelete] = useState<number | null>(null);

    // --- LOAD DATA ---
    async function loadLocations() {
        try {
            // Load Project Name
            const pData = await getProject(id);
            if (pData) setProjectName(pData.name);

            const assets = await getProjectAssets(id);
            const locs = assets.filter((a) => a.type === "loc");
            setLocations(locs);
        } catch (e) {
            console.error("Failed to load locations", e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadLocations();
    }, [id]);

    // --- ACTIONS ---

    const openDeleteModal = (e: React.MouseEvent, assetId: number) => {
        e.stopPropagation();
        setAssetToDelete(assetId);
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (assetToDelete) {
            try {
                await deleteAsset(assetToDelete);
                setAssetToDelete(null);
                setIsDeleteOpen(false);
                loadLocations();
            } catch (e) {
                alert("Failed to delete asset.");
            }
        }
    };

    const handleGenerateHero = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        setGeneratedImage(null);
        setNewAssetId(null);

        const fullPrompt = `${prompt}, shot on ${selectedCamera}, ${selectedLens}, ${selectedFocal}, cinematic lighting, photorealistic wide shot environment${isChroma ? ", green screen background, chroma key, flat lighting" : ""
            }`;

        try {
            const data = await generateAsset({
                project_id: Number(id),
                type: "loc",
                name: name || "New Location",
                prompt: fullPrompt,
                camera: selectedCamera,
                lens: selectedLens,
                focal_length: selectedFocal,
                chroma: isChroma,
            });

            if (data.success) {
                setGeneratedImage(data.image_url);
                setNewAssetId(data.asset_id);
            } else {
                alert("Error: " + data.error);
            }
        } catch (e) {
            alert("Generation failed");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadFile(file);
            setUploadPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveUpload = async () => {
        if (!uploadFile || !name) return;
        setIsUploading(true);
        try {
            // Mock upload delay - Replace with actual upload API call
            await new Promise((r) => setTimeout(r, 1000));
            alert(`Successfully imported ${name}.`);
            await loadLocations();
            resetForm();
            setViewMode("grid");
        } catch (e) {
            alert("Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveHero = async () => {
        if (newAssetId && name) {
            await updateAsset(newAssetId, name);
        }
        await loadLocations();
        resetForm();
        setViewMode("grid");
    };

    const resetForm = () => {
        setGeneratedImage(null);
        setName("");
        setPrompt("");
        setNewAssetId(null);
        setUploadFile(null);
        setUploadPreview(null);
        setActiveTab("generate");
    };

    const filteredLocs = locations.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    // --- RENDER: GRID VIEW ---
    if (viewMode === "grid") {
        return (
            <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-[#D2FF44]/30 flex flex-col">
                {/* HEADER */}
                <header className="min-h-20 py-4 border-b border-zinc-800 flex items-center justify-between gap-4 px-8 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4 min-w-0">
                        <Link
                            href={`/studio/${id}`}
                            className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div className="h-8 w-px bg-zinc-800" />
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold flex items-center gap-2 whitespace-nowrap">
                                <MapPin className="text-[#D2FF44]" /> Locations & Sets
                            </h1>
                            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest -mt-1 truncate max-w-[40vw]">
                                {projectName}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative w-40 sm:w-56 lg:w-64">
                            <Search
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                                size={14}
                            />
                            <Input
                                placeholder="Search locations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 pl-9 focus:border-[#D2FF44] h-10 transition-all"
                            />
                        </div>
                        <Button
                            onClick={() => setViewMode("create")}
                            className="bg-[#D2FF44] text-black font-bold hover:bg-[#bce63b] h-10 px-6 shadow-[0_0_15px_rgba(210,255,68,0.2)] whitespace-nowrap"
                        >
                            <Plus size={18} className="mr-2" /> New Location
                        </Button>
                    </div>
                </header>

                {/* CONTENT */}
                <main className="flex-1 p-8">
                    {loading ? (
                        <div className="flex items-center justify-center h-64 text-[#D2FF44]">
                            <Loader2 className="animate-spin mr-2" /> Loading Locations...
                        </div>
                    ) : filteredLocs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500 opacity-50 select-none border-2 border-dashed border-zinc-800 rounded-2xl">
                            <Map size={64} className="mb-4 text-zinc-700" />
                            <h2 className="text-xl font-bold">No Locations Found</h2>
                            <p className="text-sm mt-2">
                                Create a new location to get started.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {/* CREATE NEW CARD */}
                            <div
                                onClick={() => setViewMode("create")}
                                className="aspect-[16/9] border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-4 text-zinc-600 hover:text-[#D2FF44] hover:border-[#D2FF44] hover:bg-zinc-900/50 transition-all cursor-pointer group"
                            >
                                <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center group-hover:bg-[#D2FF44] group-hover:text-black transition-colors">
                                    <Plus size={32} />
                                </div>
                                <span className="font-bold text-sm">Add New Location</span>
                            </div>

                            {/* LOCATION CARDS */}
                            {filteredLocs.map((loc) => (
                                <div
                                    key={loc.id}
                                    onClick={() => router.push(`/studio/${id}/locations/${loc.id}`)}
                                    className="group relative aspect-[16/9] bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-[#D2FF44] hover:shadow-[0_0_30px_rgba(210,255,68,0.15)] transition-all cursor-pointer"
                                >
                                    <img
                                        src={loc.image_path}
                                        alt={loc.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />

                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <h3 className="font-bold text-white text-lg leading-tight mb-1">
                                                    {loc.name}
                                                </h3>
                                                <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
                                                    Asset ID: {loc.id}
                                                </p>
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        className="text-zinc-400 hover:text-white p-1 hover:bg-white/10 rounded"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="bg-zinc-950 border-zinc-800 text-white">
                                                    <DropdownMenuItem
                                                        className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                                                        onClick={(e) => openDeleteModal(e, loc.id)}
                                                    >
                                                        <Trash2 size={14} className="mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                {/* DELETE MODAL (MATCHED TO BRAND UI) */}
                <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                    <DialogContent className="bg-zinc-950 border-[#D2FF44] text-white sm:max-w-md shadow-[0_0_50px_rgba(210,255,68,0.15)]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                <Trash2 className="text-[#D2FF44]" /> Delete Location?
                            </DialogTitle>
                            <DialogDescription className="text-zinc-400">
                                Are you sure you want to delete this location? This will
                                permanently delete the file. This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmDelete}
                                className="bg-[#D2FF44] hover:bg-[#bce63b] text-black font-bold"
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // --- RENDER: CREATE VIEW ---
    return (
        <div className="flex h-screen bg-zinc-950 text-white font-sans selection:bg-[#D2FF44]/30 overflow-hidden">
            {/* Left: Controls */}
            <div className="w-[420px] border-r border-zinc-800 flex flex-col bg-zinc-900/10 flex-shrink-0 min-h-0">
                {/* HEADER (matched sizing, prevents wrap squish) */}
                <div className="min-h-20 py-4 border-b border-zinc-800 flex items-center px-8 bg-zinc-900/50 backdrop-blur-md justify-between flex-shrink-0 sticky top-0 z-10 gap-4">
                    <h1 className="font-bold text-lg flex items-center gap-2 whitespace-nowrap">
                        <Wand2 size={18} className="text-[#D2FF44]" /> New Location
                    </h1>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="text-zinc-500 hover:text-white whitespace-nowrap"
                    >
                        Cancel
                    </Button>
                </div>

                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex-1 flex flex-col min-h-0"
                >
                    <div className="px-6 pt-4 shrink-0">
                        <TabsList className="w-full bg-zinc-950 border border-zinc-800 p-1">
                            <TabsTrigger
                                value="generate"
                                className="flex-1 text-xs text-zinc-500 hover:text-white data-[state=active]:bg-[#D2FF44] data-[state=active]:text-black font-bold uppercase tracking-wider transition-all"
                            >
                                Generate
                            </TabsTrigger>
                            <TabsTrigger
                                value="upload"
                                className="flex-1 text-xs text-zinc-500 hover:text-white data-[state=active]:bg-[#D2FF44] data-[state=active]:text-black font-bold uppercase tracking-wider transition-all"
                            >
                                Upload
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* --- TAB 1: GENERATE --- */}
                    <TabsContent
                        value="generate"
                        className="flex-1 flex flex-col min-h-0 mt-0"
                    >
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-24">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase">
                                        Location Name
                                    </Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Cyberpunk Alleyway"
                                        className="bg-zinc-950 border-zinc-800 text-zinc-200 focus-visible:ring-[#D2FF44]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase">
                                        Environment Description
                                    </Label>
                                    <Textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        className="h-28 bg-zinc-950 border-zinc-800 text-zinc-200 focus-visible:ring-[#D2FF44]"
                                        placeholder="Describe the LOCATION LOOK. This image will be the reference for background plates."
                                    />
                                </div>
                            </div>

                            {/* CAMERA KIT */}
                            <div className="relative pt-2">
                                <div className="absolute -top-1 left-0 bg-[#D2FF44] text-black text-[10px] font-bold px-2 py-0.5 rounded-full z-10 flex items-center gap-1">
                                    <Camera size={10} /> CAMERA KIT
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
                                        <div className="space-y-1.5 w-full">
                                            <Label className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1.5">
                                                <Aperture size={12} /> Lens
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
                                                    className={`text-[10px] h-8 rounded border transition-all font-bold ${selectedFocal === focal
                                                        ? "bg-[#D2FF44] text-black border-[#D2FF44]"
                                                        : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600"
                                                        }`}
                                                >
                                                    {focal}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FOOTER: GENERATE */}
                        <div className="p-6 border-t border-zinc-800 bg-zinc-900/30 flex-shrink-0">
                            <Button
                                onClick={handleGenerateHero}
                                disabled={isGenerating || !prompt}
                                className="w-full h-14 bg-[#D2FF44] text-black font-bold text-lg hover:bg-[#bce63b] shadow-[0_0_20px_rgba(210,255,68,0.3)] disabled:opacity-50 transition-all"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 animate-spin" /> ESTABLISHING LOCATION...
                                    </>
                                ) : (
                                    <>
                                        <Dice5 size={18} className="mr-2" /> GENERATE LOCATION
                                    </>
                                )}
                            </Button>
                        </div>
                    </TabsContent>

                    {/* --- TAB 2: UPLOAD --- */}
                    <TabsContent
                        value="upload"
                        className="flex-1 flex flex-col min-h-0 mt-0"
                    >
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase">
                                        Location Name
                                    </Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Cyberpunk Alleyway"
                                        className="bg-zinc-950 border-zinc-800 text-zinc-200 focus-visible:ring-[#D2FF44]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase">
                                        Description / Tags
                                    </Label>
                                    <Textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        className="h-28 bg-zinc-950 border-zinc-800 text-zinc-200 focus-visible:ring-[#D2FF44]"
                                        placeholder="Notes about this location..."
                                    />
                                </div>
                            </div>

                            {/* DROPZONE */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-zinc-800 rounded-xl p-10 flex flex-col items-center justify-center text-zinc-500 hover:border-[#D2FF44] hover:bg-zinc-900/30 transition-all cursor-pointer relative h-64 group"
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                {uploadPreview ? (
                                    <img
                                        src={uploadPreview}
                                        className="max-h-full max-w-full object-contain rounded shadow-lg"
                                    />
                                ) : (
                                    <>
                                        <div className="p-4 rounded-full bg-zinc-900 group-hover:scale-110 transition-transform mb-4">
                                            <UploadCloud size={32} className="text-[#D2FF44]" />
                                        </div>
                                        <p className="text-sm font-bold text-zinc-400">
                                            Click to Upload Reference
                                        </p>
                                        <p className="text-[10px] mt-2 text-zinc-600">
                                            JPG or PNG (Landscape recommended)
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-zinc-800 bg-zinc-900/30 flex-shrink-0">
                            <Button
                                onClick={handleSaveUpload}
                                disabled={isUploading || !uploadFile || !name}
                                className="w-full h-14 bg-white text-black font-bold text-lg hover:bg-zinc-200 disabled:opacity-50 transition-all"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="mr-2 animate-spin" /> IMPORTING...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} className="mr-2" /> SAVE IMPORT
                                    </>
                                )}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Right: Preview */}
            <div className="flex-1 bg-black flex items-center justify-center relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 to-black overflow-hidden">
                {/* Save Button for Generate Tab */}
                {activeTab === "generate" && (
                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                        <Button
                            onClick={handleSaveHero}
                            disabled={!generatedImage}
                            className="bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 font-bold text-xs disabled:opacity-50"
                        >
                            <Save size={14} className="mr-2" /> Save Location
                        </Button>
                    </div>
                )}

                {isGenerating ? (
                    <div className="flex flex-col items-center gap-4 animate-pulse">
                        <div className="w-16 h-16 border-4 border-[#D2FF44] border-t-transparent rounded-full animate-spin" />
                        <p className="text-[#D2FF44] font-mono text-sm tracking-widest uppercase">
                            Developing Environment...
                        </p>
                    </div>
                ) : activeTab === "upload" && uploadPreview ? (
                    <div className="relative max-h-[90%] max-w-[90%]">
                        <img
                            src={uploadPreview}
                            alt="Upload Preview"
                            className="max-h-full max-w-full object-contain shadow-2xl border border-zinc-800 rounded-sm"
                        />
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-[10px] text-zinc-300 border border-white/10 uppercase tracking-widest">
                            Import Preview
                        </div>
                    </div>
                ) : generatedImage ? (
                    <img
                        src={generatedImage}
                        alt="Generated"
                        className="max-h-[90%] max-w-[90%] object-contain shadow-2xl border border-zinc-800 rounded-sm"
                    />
                ) : (
                    <div className="text-center space-y-4 opacity-40 select-none">
                        {activeTab === "generate" ? (
                            <Wand2 size={32} className="mx-auto" />
                        ) : (
                            <ImageIcon size={32} className="mx-auto" />
                        )}
                        <p className="text-sm font-medium text-zinc-500">
                            {activeTab === "generate"
                                ? "Configure the Location"
                                : "Select an image to import"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
