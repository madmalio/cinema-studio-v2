"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Plus,
  MapPin,
  User,
  Layout,
  FileText,
  Film,
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- TYPES ---
interface Asset {
  id: number;
  type: string;
  name: string;
  image_path: string;
  prompt?: string;
}

interface Shot {
  id: number;
  status: "pending" | "ready" | "animating" | "complete";
}

interface Scene {
  id: number;
  name: string;
  description: string;
  shots: Shot[];
}

export default function ProjectDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: projectId } = use(params);

  // --- STATE ---
  const [project, setProject] = useState<any>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);

  // Scene Creation
  const [isSceneModalOpen, setIsSceneModalOpen] = useState(false);
  const [newSceneName, setNewSceneName] = useState("");
  const [newSceneDesc, setNewSceneDesc] = useState("");

  // Asset Management
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newName, setNewName] = useState("");

  // --- FETCH DATA ---
  async function fetchData() {
    try {
      const pRes = await fetch(`http://127.0.0.1:8000/projects/${projectId}`);
      if (pRes.ok) setProject(await pRes.json());

      const aRes = await fetch(
        `http://127.0.0.1:8000/projects/${projectId}/assets`
      );
      if (aRes.ok) {
        const data = await aRes.json();
        setAssets(data.assets);
      }

      const sRes = await fetch(
        `http://127.0.0.1:8000/projects/${projectId}/scenes`
      );
      if (sRes.ok) {
        const data = await sRes.json();
        setScenes(data.scenes);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [projectId]);

  // --- SCENE ACTIONS ---
  const handleCreateScene = async () => {
    if (!newSceneName) return;
    const res = await fetch(
      `http://127.0.0.1:8000/projects/${projectId}/scenes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSceneName,
          description: newSceneDesc,
        }),
      }
    );

    if (res.ok) {
      setIsSceneModalOpen(false);
      setNewSceneName("");
      setNewSceneDesc("");
      fetchData();
    }
  };

  // --- ASSET ACTIONS ---
  const handleDeleteAsset = async () => {
    if (!selectedAsset) return;
    await fetch(`http://127.0.0.1:8000/assets/${selectedAsset.id}`, {
      method: "DELETE",
    });
    setIsDeleteModalOpen(false);
    fetchData();
  };

  const handleRenameAsset = async () => {
    if (!selectedAsset || !newName) return;
    await fetch(`http://127.0.0.1:8000/assets/${selectedAsset.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setIsEditModalOpen(false);
    fetchData();
  };

  const openDeleteModal = (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    setSelectedAsset(asset);
    setIsDeleteModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    setSelectedAsset(asset);
    setNewName(asset.name);
    setIsEditModalOpen(true);
  };

  // --- COMPONENTS ---
  const AssetCard = ({ asset }: { asset: Asset }) => (
    <div className="aspect-square rounded-md overflow-hidden border border-zinc-800 hover:border-[#D2FF44] group relative transition-all bg-zinc-900">
      <img
        src={asset.image_path}
        alt={asset.name}
        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-white truncate max-w-[70%]">
            {asset.name}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-zinc-800 rounded-md text-zinc-300 hover:text-white">
                <MoreVertical size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-white z-50">
              <DropdownMenuItem
                onClick={(e) => openEditModal(e, asset)}
                className="text-xs hover:bg-zinc-800 cursor-pointer"
              >
                <Pencil size={12} className="mr-2" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => openDeleteModal(e, asset)}
                className="text-xs text-red-500 hover:bg-red-900/20 cursor-pointer"
              >
                <Trash2 size={12} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  const castAssets = assets.filter((a) => a.type === "cast");
  const locAssets = assets.filter((a) => a.type === "loc");

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden font-sans selection:bg-[#D2FF44]/30">
      {/* 1. LEFT SIDEBAR: THE BINDER (Global Assets) */}
      <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/30">
        <div className="p-6 border-b border-zinc-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="mb-4 -ml-2 text-zinc-400 hover:text-[#D2FF44] hover:bg-transparent transition-colors"
          >
            <ChevronLeft size={16} className="mr-1" /> Back to Projects
          </Button>
          <h1 className="text-2xl font-black tracking-tight text-white mb-1">
            {project?.name || "Loading..."}
          </h1>
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono uppercase tracking-wider">
            <Calendar size={12} />
            <span>Production Binder</span>
          </div>
        </div>

        <Tabs defaultValue="cast" className="flex-1 flex flex-col">
          <div className="px-6 pt-6">
            <TabsList className="w-full bg-zinc-900 border border-zinc-800 p-1 grid grid-cols-2">
              <TabsTrigger
                value="cast"
                className="text-[10px] font-bold text-zinc-400 data-[state=active]:bg-[#D2FF44] data-[state=active]:text-black hover:text-[#D2FF44] data-[state=active]:hover:text-black transition-colors"
              >
                CAST ({castAssets.length})
              </TabsTrigger>
              <TabsTrigger
                value="loc"
                className="text-[10px] font-bold text-zinc-400 data-[state=active]:bg-[#D2FF44] data-[state=active]:text-black hover:text-[#D2FF44] data-[state=active]:hover:text-black transition-colors"
              >
                LOCS ({locAssets.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 p-6">
            <TabsContent value="cast" className="mt-0 space-y-4">
              <Button
                asChild
                className="w-full bg-[#D2FF44] hover:bg-[#bce63b] text-black text-xs font-bold h-10 shadow-[0_0_15px_rgba(210,255,68,0.15)] transition-all"
              >
                <Link
                  href={`/studio/${projectId}/generate/cast`}
                  className="block flex items-center justify-center"
                >
                  <Plus size={14} className="mr-1" /> New Cast Member
                </Link>
              </Button>
              <div className="grid grid-cols-2 gap-3">
                {castAssets.map((a) => (
                  <AssetCard key={a.id} asset={a} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="loc" className="mt-0 space-y-4">
              <Button
                asChild
                className="w-full bg-[#D2FF44] hover:bg-[#bce63b] text-black text-xs font-bold h-10 shadow-[0_0_15px_rgba(210,255,68,0.15)] transition-all"
              >
                <Link
                  href={`/studio/${projectId}/generate/loc`}
                  className="block flex items-center justify-center"
                >
                  <Plus size={14} className="mr-1" /> New Location
                </Link>
              </Button>
              <div className="grid grid-cols-2 gap-3">
                {locAssets.map((a) => (
                  <AssetCard key={a.id} asset={a} />
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      {/* 2. MAIN STAGE: SCENE GRID */}
      <div className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden">
        {/* Header */}
        <div className="h-20 border-b border-zinc-800 flex items-center justify-between px-10 bg-zinc-900/20 backdrop-blur-sm">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-3">
              <Layout className="text-[#D2FF44]" /> Scenes Overview
            </h2>
            <p className="text-zinc-500 text-xs mt-1">
              Manage your film's structure and sequence.
            </p>
          </div>
          <Button
            onClick={() => setIsSceneModalOpen(true)}
            className="bg-[#D2FF44] text-black hover:bg-[#bce63b] font-bold shadow-[0_0_20px_rgba(210,255,68,0.2)] hover:shadow-[0_0_30px_rgba(210,255,68,0.4)] transition-all"
          >
            <Plus size={16} className="mr-2" /> Create Scene
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {/* NEW SCENE BUTTON (Empty State) */}
            <button
              onClick={() => setIsSceneModalOpen(true)}
              className="aspect-[16/9] border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-600 hover:text-[#D2FF44] hover:border-[#D2FF44] hover:bg-zinc-900/50 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[#D2FF44] group-hover:text-black transition-all">
                <Plus size={32} />
              </div>
              <span className="font-bold">Add New Scene</span>
            </button>

            {/* SCENE CARDS */}
            {scenes.map((scene) => (
              <div
                key={scene.id}
                onClick={() =>
                  router.push(`/studio/${projectId}/scene/${scene.id}`)
                }
                className="aspect-[16/9] bg-zinc-900 rounded-xl border border-zinc-800 p-6 flex flex-col justify-between hover:border-[#D2FF44] hover:shadow-[0_0_30px_rgba(210,255,68,0.1)] transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-[#D2FF44] text-black rounded-full p-2">
                    <ArrowRight size={16} />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#D2FF44] transition-colors">
                    {scene.name}
                  </h3>
                  <p className="text-zinc-500 text-sm line-clamp-3 leading-relaxed">
                    {scene.description || "No atmospheric description set."}
                  </p>
                </div>

                <div className="flex items-center gap-4 border-t border-zinc-800 pt-4 mt-4">
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 group-hover:text-zinc-300">
                    <Film size={14} />
                    <span>{scene.shots.length} SHOTS</span>
                  </div>
                  {scene.shots.some((s) => s.status === "complete") && (
                    <div className="flex items-center gap-2 text-xs font-mono text-[#D2FF44]">
                      <Clock size={14} />
                      <span>IN PROGRESS</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* MODALS */}
      <Dialog open={isSceneModalOpen} onOpenChange={setIsSceneModalOpen}>
        <DialogContent className="bg-zinc-950 border-[#D2FF44] text-white sm:max-w-md shadow-[0_0_50px_rgba(210,255,68,0.15)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Layout className="text-[#D2FF44]" /> New Scene
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Define the setting and atmosphere. This "Master Context" will
              guide the AI for every shot in this scene.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-zinc-500">
                Scene Heading
              </Label>
              <Input
                value={newSceneName}
                onChange={(e) => setNewSceneName(e.target.value)}
                placeholder="e.g. SCENE 1 - INT. HOTEL ROOM - DAY"
                className="bg-zinc-900 border-zinc-800 focus:border-[#D2FF44] font-mono text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-zinc-500">
                Master Context
              </Label>
              <Textarea
                value={newSceneDesc}
                onChange={(e) => setNewSceneDesc(e.target.value)}
                placeholder="Describe the mood, lighting, and environment. (e.g. 'Heavy rain outside. Cold blue lighting. The room is messy.')"
                className="bg-zinc-900 border-zinc-800 focus:border-[#D2FF44] h-32 leading-relaxed text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSceneModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateScene}
              className="bg-[#D2FF44] text-black font-bold hover:bg-[#bce63b]"
            >
              Create Scene
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Delete Modals (Reused) */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-zinc-950 border-[#D2FF44] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex gap-2">
              <Trash2 className="text-[#D2FF44]" /> Delete Asset?
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will permanently delete the video file from your disk. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAsset}
              className="bg-[#D2FF44] text-black font-bold"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Details</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-zinc-950 border-zinc-800 focus:border-[#D2FF44]"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRenameAsset}
              className="bg-[#D2FF44] text-black font-bold"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
