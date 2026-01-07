"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Users,
  Wand2,
  Download,
  Plus,
  Trash2,
  AlertTriangle,
  MoreVertical,
  Pencil,
  Film,
  Loader2,
  Link as LinkIcon,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- TYPES ---
interface Asset {
  id: number;
  type: string;
  name: string;
  image_path: string;
}

interface Shot {
  id: number;
  order_index: number;
  prompt: string;
  keyframe_url: string | null;
  video_url: string | null;
  status: string;
}

interface Scene {
  id: number;
  name: string;
  shots: Shot[];
}

export default function StudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: projectId } = use(params);

  // --- GLOBAL STATE ---
  const [project, setProject] = useState<any>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string>("default");

  const [loading, setLoading] = useState(true);

  // --- UI STATE ---
  const [activeShotId, setActiveShotId] = useState<number | null>(null);
  const [draggedAsset, setDraggedAsset] = useState<Asset | null>(null);

  // --- MODAL STATES ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Bridge / Animation State
  const [isBridgeOpen, setIsBridgeOpen] = useState(false);
  const [selectedGapIndex, setSelectedGapIndex] = useState<number | null>(null);
  const [bridgePrompt, setBridgePrompt] = useState("");
  const [bridgeMode, setBridgeMode] = useState<"draft" | "final">("draft");

  // Selection State (for Edit/Delete)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [newName, setNewName] = useState("");

  // --- 1. FETCH DATA ---
  async function fetchData() {
    try {
      // Fetch Project
      const pRes = await fetch(`http://127.0.0.1:8000/projects/${projectId}`);
      if (pRes.ok) setProject(await pRes.json());

      // Fetch Assets
      const aRes = await fetch(
        `http://127.0.0.1:8000/projects/${projectId}/assets`
      );
      if (aRes.ok) {
        const data = await aRes.json();
        setAssets(data.assets);
      }

      // Fetch Scenes
      const sRes = await fetch(
        `http://127.0.0.1:8000/projects/${projectId}/scenes`
      );
      if (sRes.ok) {
        const data = await sRes.json();
        setScenes(data.scenes);
        if (data.scenes.length > 0 && activeSceneId === "default") {
          setActiveSceneId(data.scenes[0].id.toString());
        }
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

  // --- 2. ACTIONS ---

  const createDefaultScene = async () => {
    const res = await fetch(
      `http://127.0.0.1:8000/projects/${projectId}/scenes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Scene 1" }),
      }
    );
    if (res.ok) fetchData();
  };

  const addShotSlot = async () => {
    if (activeSceneId === "default") {
      return; // User needs to create scene first
    }
    await fetch(`http://127.0.0.1:8000/shots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scene_id: activeSceneId,
        prompt: "New Shot",
      }),
    });
    fetchData();
  };

  const handleDrop = async (e: React.DragEvent, shotId: number) => {
    e.preventDefault();
    if (!draggedAsset) return;

    await fetch(`http://127.0.0.1:8000/shots/${shotId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyframe_url: draggedAsset.image_path,
        status: "ready",
      }),
    });

    setDraggedAsset(null);
    fetchData();
  };

  const openBridgeMenu = (index: number) => {
    setSelectedGapIndex(index);
    setBridgePrompt("Cinematic transition, consistent lighting...");
    setIsBridgeOpen(true);
  };

  const handleGenerateBridge = async () => {
    if (selectedGapIndex === null || activeSceneId === "default") return;

    const currentScene = scenes.find((s) => s.id.toString() === activeSceneId);
    if (!currentScene) return;

    const startShot = currentScene.shots[selectedGapIndex];

    setIsBridgeOpen(false);

    try {
      await fetch(`http://127.0.0.1:8000/shots/${startShot.id}/animate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: bridgePrompt }),
      });
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Render failed");
    }
  };

  // --- ASSET MANAGEMENT ---
  const openEditModal = (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    setSelectedAsset(asset);
    setNewName(asset.name);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    setSelectedAsset(asset);
    setIsDeleteModalOpen(true);
  };

  const handleRenameAsset = async () => {
    if (!selectedAsset || !newName) return;
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/assets/${selectedAsset.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        }
      );
      if (res.ok) {
        setAssets(
          assets.map((a) =>
            a.id === selectedAsset.id ? { ...a, name: newName } : a
          )
        );
        setIsEditModalOpen(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedAsset) return;
    try {
      await fetch(`http://127.0.0.1:8000/assets/${selectedAsset.id}`, {
        method: "DELETE",
      });
      setAssets(assets.filter((a) => a.id !== selectedAsset.id));
      setIsDeleteModalOpen(false);
      setSelectedAsset(null);
    } catch (error) {
      console.error(error);
    }
  };

  // Derived State
  const activeScene = scenes.find((s) => s.id.toString() === activeSceneId);
  const activeShotPreview = activeShotId
    ? activeScene?.shots.find((s) => s.id === activeShotId)
    : null;

  const castAssets = assets.filter((a) => a.type === "cast");
  const locAssets = assets.filter((a) => a.type === "loc");

  // Reusable Asset Card
  const AssetCard = ({ asset }: { asset: Asset }) => (
    <div
      draggable
      onDragStart={() => setDraggedAsset(asset)}
      className="aspect-square rounded-md overflow-hidden border border-zinc-800 hover:border-[#D2FF44] cursor-grab active:cursor-grabbing group relative transition-all bg-zinc-900"
    >
      {asset.type === "video" ? (
        <div className="relative w-full h-full">
          <video
            src={asset.image_path}
            className="w-full h-full object-cover opacity-70 group-hover:opacity-100"
            muted
            loop
            onMouseOver={(e) => e.currentTarget.play()}
            onMouseOut={(e) => e.currentTarget.pause()}
          />
          <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
            <Film size={10} className="text-[#D2FF44]" />
          </div>
        </div>
      ) : (
        <img
          src={asset.image_path}
          alt={asset.name}
          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-white truncate max-w-[70%]">
            {asset.name}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 hover:bg-zinc-800 rounded-md text-zinc-300 hover:text-white"
              >
                <MoreVertical size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-white min-w-[120px]">
              <DropdownMenuItem
                onClick={(e) => openEditModal(e, asset)}
                className="text-xs cursor-pointer hover:bg-zinc-800"
              >
                <Pencil size={12} className="mr-2" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => openDeleteModal(e, asset)}
                className="text-xs cursor-pointer text-red-500 hover:bg-red-900/20"
              >
                <Trash2 size={12} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden font-sans selection:bg-[#D2FF44]/30">
      {/* 1. LEFT SIDEBAR (ASSETS) */}
      <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="text-zinc-500 hover:text-white"
          >
            <ChevronLeft size={20} />
          </Button>
          <div>
            {loading ? (
              <div className="h-4 w-24 bg-zinc-800 animate-pulse rounded" />
            ) : (
              <h2 className="font-bold text-sm truncate w-40">
                {project?.name || "Untitled"}
              </h2>
            )}
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Asset Library
            </p>
          </div>
        </div>

        <Tabs defaultValue="cast" className="flex-1 flex flex-col">
          <div className="px-4 pt-4">
            {/* RESTORED ORIGINAL STYLING: grid-cols-2, original colors */}
            <TabsList className="w-full bg-zinc-950 border border-zinc-800 p-1 grid grid-cols-2">
              <TabsTrigger
                value="cast"
                className="flex-1 text-xs font-bold text-zinc-500 data-[state=active]:bg-[#D2FF44] data-[state=active]:text-black"
              >
                Cast
              </TabsTrigger>
              <TabsTrigger
                value="loc"
                className="flex-1 text-xs font-bold text-zinc-500 data-[state=active]:bg-[#D2FF44] data-[state=active]:text-black"
              >
                Locs
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 p-4">
            <TabsContent value="cast" className="mt-0 space-y-4">
              <Link
                href={`/studio/${projectId}/generate/cast`}
                className="block"
              >
                <Button className="w-full bg-[#D2FF44] hover:bg-[#bce63b] text-black text-xs font-bold h-9">
                  <Plus size={14} className="mr-1" /> Generate Actor
                </Button>
              </Link>
              <div className="grid grid-cols-2 gap-2">
                {castAssets.map((a) => (
                  <AssetCard key={a.id} asset={a} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="loc" className="mt-0 space-y-4">
              <Link
                href={`/studio/${projectId}/generate/loc`}
                className="block"
              >
                <Button className="w-full bg-[#D2FF44] hover:bg-[#bce63b] text-black text-xs font-bold h-9">
                  <Plus size={14} className="mr-1" /> Generate Location
                </Button>
              </Link>
              <div className="grid grid-cols-2 gap-2">
                {locAssets.map((a) => (
                  <AssetCard key={a.id} asset={a} />
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      {/* 2. CENTER STAGE (PREVIEW & TIMELINE) */}
      <div className="flex-1 flex flex-col relative bg-zinc-950">
        {/* Header */}
        <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/30 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-zinc-400">
            <Wand2 size={16} className="text-[#D2FF44]" />
            <span className="text-xs font-bold text-zinc-200">
              Director Mode
            </span>
            <Separator
              orientation="vertical"
              className="h-4 mx-2 bg-zinc-800"
            />
            <span className="text-[10px] font-mono text-zinc-500 uppercase">
              Flux Dev + Local SVD
            </span>
          </div>
          {/* EXPORT BUTTON */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-300"
            >
              <Download size={14} className="mr-2" /> Export
            </Button>
          </div>
        </div>

        {/* MAIN PREVIEW AREA */}
        <div className="flex-1 flex items-center justify-center p-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950">
          {activeShotPreview ? (
            <div className="relative max-h-full aspect-video shadow-2xl rounded-lg overflow-hidden border border-zinc-800 bg-black group">
              {activeShotPreview.video_url ? (
                <video
                  src={activeShotPreview.video_url}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                />
              ) : activeShotPreview.keyframe_url ? (
                <img
                  src={activeShotPreview.keyframe_url}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700">
                  <ImageIcon size={48} className="mb-4 opacity-20" />
                  <p className="text-xs font-mono opacity-50">EMPTY SLOT</p>
                </div>
              )}
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-2 py-1 rounded text-xs font-mono text-zinc-300 border border-white/10">
                SHOT {activeShotPreview.order_index + 1}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 opacity-30 select-none">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-zinc-700 flex items-center justify-center mx-auto text-zinc-600">
                <Users size={32} />
              </div>
              <p className="text-sm font-medium text-zinc-500">
                Select a shot to view
              </p>
            </div>
          )}
        </div>

        {/* 3. THE TIMELINE (SHOT SEQUENCER) */}
        <div className="h-52 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex flex-col z-10">
          {/* Controls Bar - INCREASED HEIGHT FOR PADDING */}
          <div className="h-14 border-b border-zinc-800/50 flex items-center px-4 justify-between bg-zinc-950/50">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D2FF44] animate-pulse" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Sequencer
                </span>
              </div>

              {/* Scene Selector */}
              <Select value={activeSceneId} onValueChange={setActiveSceneId}>
                <SelectTrigger className="h-8 w-[180px] bg-zinc-900 border-zinc-800 text-[10px]">
                  <SelectValue placeholder="Select Scene" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                  {scenes.length === 0 && (
                    <SelectItem value="default">No Scenes</SelectItem>
                  )}
                  {scenes.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {scenes.length === 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={createDefaultScene}
                  className="h-8 text-[10px]"
                >
                  <Plus size={10} className="mr-1" /> Create Scene
                </Button>
              )}
            </div>

            <Button className="h-8 text-[10px] bg-[#D2FF44] hover:bg-[#bce63b] text-black font-bold rounded-full px-4 shadow-[0_0_15px_rgba(210,255,68,0.2)]">
              Export
            </Button>
          </div>

          {/* The Rail */}
          <ScrollArea className="flex-1 w-full whitespace-nowrap p-4">
            <div className="flex items-center gap-2 min-w-max">
              {activeScene?.shots.map((shot, index) => (
                <div key={shot.id} className="flex items-center gap-2">
                  {/* SHOT CARD */}
                  <div
                    onClick={() => setActiveShotId(shot.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, shot.id)}
                    className={`
                                w-40 aspect-video rounded-md border-2 relative group cursor-pointer transition-all flex-shrink-0 overflow-hidden
                                ${
                                  activeShotId === shot.id
                                    ? "border-[#D2FF44]"
                                    : "border-zinc-800 hover:border-zinc-600"
                                }
                                ${
                                  !shot.keyframe_url
                                    ? "border-dashed bg-zinc-900/30"
                                    : "bg-black"
                                }
                            `}
                  >
                    {shot.keyframe_url ? (
                      <>
                        <img
                          src={shot.keyframe_url}
                          className="w-full h-full object-cover"
                        />
                        {shot.video_url && (
                          <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1 border border-[#D2FF44]/50">
                            <Video size={10} className="text-[#D2FF44]" />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 pointer-events-none">
                        <Download size={20} className="mb-2 opacity-50" />
                        <span className="text-[9px] font-bold opacity-50">
                          DROP ASSET
                        </span>
                      </div>
                    )}
                    <div className="absolute top-0 left-0 bg-black/80 text-[9px] text-white px-1.5 py-0.5 rounded-br-sm font-mono border-r border-b border-zinc-800">
                      {index + 1}
                    </div>
                  </div>

                  {/* BRIDGE BUTTON (Only between shots) */}
                  {index < activeScene.shots.length && (
                    <div className="relative flex flex-col items-center justify-center w-8 gap-1 z-10">
                      <div className="h-[2px] w-full bg-zinc-800 absolute top-1/2 -z-10"></div>
                      <Button
                        onClick={() => openBridgeMenu(index)}
                        disabled={!shot.keyframe_url}
                        variant="outline"
                        size="icon"
                        className={`
                                        w-6 h-6 rounded-full border shadow-sm transition-all
                                        ${
                                          shot.video_url
                                            ? "bg-zinc-900 border-[#D2FF44] text-[#D2FF44]"
                                            : "bg-zinc-950 border-zinc-700 text-zinc-600 hover:border-white hover:text-white"
                                        }
                                    `}
                      >
                        {shot.status === "animating" ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <LinkIcon size={10} />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {/* ADD SHOT BUTTON */}
              <div className="pl-2">
                <Button
                  onClick={addShotSlot}
                  variant="ghost"
                  className="h-20 w-20 border border-dashed border-zinc-800 text-zinc-600 hover:text-white hover:bg-zinc-900 hover:border-zinc-500 rounded-md flex flex-col gap-2"
                >
                  <Plus size={20} />
                  <span className="text-[9px]">Add Shot</span>
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* BRIDGE MODAL */}
      <Dialog open={isBridgeOpen} onOpenChange={setIsBridgeOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#D2FF44]">
              <Wand2 size={18} />
              <span>Generate Motion</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Bridge this shot to the next using Local SVD/Wan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Tabs
              value={bridgeMode}
              onValueChange={(v) => setBridgeMode(v as any)}
              className="w-full"
            >
              <TabsList className="w-full bg-zinc-950 border border-zinc-800">
                <TabsTrigger
                  value="draft"
                  className="flex-1 text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-[#D2FF44]"
                >
                  Draft (Fast)
                </TabsTrigger>
                <TabsTrigger
                  value="final"
                  className="flex-1 text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-[#D2FF44]"
                >
                  Final (Slow)
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Textarea
              value={bridgePrompt}
              onChange={(e) => setBridgePrompt(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-sm h-24 focus-visible:ring-[#D2FF44]"
              placeholder="Describe the movement (e.g. Slow zoom in)..."
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsBridgeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateBridge}
              className="bg-[#D2FF44] hover:bg-[#bce63b] text-black font-bold"
            >
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE MODAL */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-zinc-950 border-[#D2FF44] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex gap-2">
              <AlertTriangle className="text-[#D2FF44]" /> Delete Asset?
            </DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-[#D2FF44] text-black font-bold"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Details</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-zinc-950 border-zinc-800"
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
