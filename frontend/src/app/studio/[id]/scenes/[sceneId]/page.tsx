"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Play,
  Film,
  Image as ImageIcon,
  Plus,
  MoreVertical,
  Wand2,
  Link as LinkIcon,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- TYPES ---
interface Shot {
  id: number;
  order_index: number;
  prompt: string;
  keyframe_url: string | null;
  video_url: string | null; // The video bridging this shot to the next
  status: "empty" | "pending" | "ready" | "animating" | "complete";
}

interface Asset {
  id: number;
  name: string;
  image_path: string;
  type: string;
}

export default function SceneSequencer({
  params,
}: {
  params: Promise<{ id: string; sceneId: string }>;
}) {
  const { id: projectId, sceneId } = use(params);
  const router = useRouter();

  // State
  const [shots, setShots] = useState<Shot[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sceneName, setSceneName] = useState("Loading...");
  const [activeShotId, setActiveShotId] = useState<number | null>(null);

  // Bridge Modal State
  const [isBridgeOpen, setIsBridgeOpen] = useState(false);
  const [selectedGapIndex, setSelectedGapIndex] = useState<number | null>(null);
  const [bridgePrompt, setBridgePrompt] = useState("");
  const [bridgeMode, setBridgeMode] = useState<"draft" | "final">("draft");

  // Drag & Drop State
  const [draggedAsset, setDraggedAsset] = useState<Asset | null>(null);

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchData();
  }, [projectId, sceneId]);

  async function fetchData() {
    // 1. Get Scene Details & Shots
    const sRes = await fetch(
      `http://127.0.0.1:8000/projects/${projectId}/scenes`
    );
    const sData = await sRes.json();
    const currentScene = sData.scenes.find(
      (s: any) => s.id === Number(sceneId)
    );

    if (currentScene) {
      setSceneName(currentScene.name);
      // Sort shots by order_index if you have that field, otherwise ID
      setShots(currentScene.shots || []);
    }

    // 2. Get Available Assets (for the sidebar)
    const aRes = await fetch(
      `http://127.0.0.1:8000/projects/${projectId}/assets`
    );
    const aData = await aRes.json();
    setAssets(aData.assets);
  }

  // --- ACTIONS ---

  // 1. Add Empty Slot to End
  const addShotSlot = async () => {
    // Call API to create a new empty shot
    const res = await fetch(`http://127.0.0.1:8000/shots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scene_id: sceneId,
        prompt: "New Keyframe Slot",
      }),
    });
    if (res.ok) fetchData();
  };

  // 2. Drop Asset onto Slot (Assign Keyframe)
  const handleDrop = async (e: React.DragEvent, shotId: number) => {
    e.preventDefault();
    if (!draggedAsset) return;

    // Update Shot with this Image
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

  // 3. Open Bridge Menu (The "Link" Button)
  const openBridgeMenu = (index: number) => {
    setSelectedGapIndex(index);
    setBridgePrompt("Smooth morph, consistent lighting, character movement...");
    setIsBridgeOpen(true);
  };

  // 4. Generate Bridge (The Magic)
  const handleGenerateBridge = async () => {
    if (selectedGapIndex === null) return;

    const startShot = shots[selectedGapIndex];
    // In a real app, we'd pass the 'nextShot' ID too so the backend knows the target
    // For now, we simulate triggering the animation on the Start Shot

    // Optimistic UI Update
    const newShots = [...shots];
    newShots[selectedGapIndex].status = "animating";
    setShots(newShots);
    setIsBridgeOpen(false);

    try {
      // Call your Local Engine (We'll update backend to handle 'bridge' mode later)
      // We pass the prompt + a flag saying "This is a bridge between A and B"
      await fetch(`http://127.0.0.1:8000/shots/${startShot.id}/animate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: bridgePrompt,
          mode: bridgeMode, // 'draft' (LTX) or 'final' (Wan)
        }),
      });

      // Refresh to see result (Video URL should be updated)
      fetchData();
    } catch (error) {
      console.error("Bridge failed", error);
      alert("Failed to queue render");
    }
  };

  const activeShot = activeShotId
    ? shots.find((s) => s.id === activeShotId)
    : shots[0];

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden font-sans selection:bg-[#D2FF44]/30">
      {/* HEADER */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="font-bold text-sm text-zinc-200">{sceneName}</h1>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
              Sequence Editor
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-zinc-700 text-zinc-400 font-mono text-[10px]"
          >
            {shots.length} SHOTS
          </Badge>
          <Button
            size="sm"
            className="h-8 bg-[#D2FF44] text-black hover:bg-[#bce63b] font-bold text-xs"
          >
            <Play size={12} className="mr-2 fill-current" /> Play Scene
          </Button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: ASSET LIBRARY (SOURCE) */}
        <div className="w-64 border-r border-zinc-800 bg-zinc-900/30 flex flex-col shrink-0">
          <div className="p-3 border-b border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-500 uppercase">
              Project Assets
            </h3>
          </div>
          <ScrollArea className="flex-1 p-3">
            <div className="grid grid-cols-2 gap-2">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  draggable
                  onDragStart={() => setDraggedAsset(asset)}
                  className="aspect-square bg-zinc-900 rounded border border-zinc-800 hover:border-[#D2FF44] cursor-grab active:cursor-grabbing overflow-hidden group relative"
                >
                  <img
                    src={asset.image_path}
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                    <p className="text-[9px] truncate text-white">
                      {asset.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* CENTER: STAGE & RAIL */}
        <div className="flex-1 flex flex-col min-w-0 bg-zinc-950/80 relative">
          {/* TOP: PREVIEW STAGE */}
          <div className="flex-1 flex items-center justify-center p-8 border-b border-zinc-800/50 relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>

            {activeShot ? (
              <div className="relative max-h-full aspect-video shadow-2xl rounded-lg overflow-hidden border border-zinc-800 bg-black">
                {activeShot.video_url ? (
                  <video
                    src={activeShot.video_url}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                ) : activeShot.keyframe_url ? (
                  <img
                    src={activeShot.keyframe_url}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700">
                    <ImageIcon size={48} className="mb-4 opacity-20" />
                    <p className="text-xs font-mono opacity-50">
                      NO CONTENT SELECTED
                    </p>
                  </div>
                )}

                {/* Shot Info Overlay */}
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-2 py-1 rounded text-xs font-mono text-zinc-300 border border-white/10">
                  SHOT {activeShot.order_index + 1}
                </div>
              </div>
            ) : (
              <div className="text-zinc-600 font-mono text-xs">
                Select a shot to preview
              </div>
            )}
          </div>

          {/* BOTTOM: THE SEQUENCER RAIL */}
          <div className="h-48 bg-zinc-900 border-t border-zinc-800 flex flex-col shrink-0">
            <div className="h-8 border-b border-zinc-800 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase">
                <Film size={12} /> Timeline
              </div>
              <div className="flex gap-2">
                {/* Zoom controls could go here */}
              </div>
            </div>

            <ScrollArea className="flex-1 w-full whitespace-nowrap">
              <div className="flex items-center gap-2 p-4 min-w-max">
                {shots.map((shot, index) => (
                  <div key={shot.id} className="flex items-center gap-2">
                    {/* 1. THE SHOT CARD (Keyframe) */}
                    <div
                      onClick={() => setActiveShotId(shot.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, shot.id)}
                      className={`
                                        w-40 aspect-video rounded-md border-2 relative group cursor-pointer transition-all flex-shrink-0
                                        ${
                                          activeShotId === shot.id
                                            ? "border-[#D2FF44]"
                                            : "border-zinc-800 hover:border-zinc-600"
                                        }
                                        ${
                                          !shot.keyframe_url
                                            ? "border-dashed bg-zinc-900/50"
                                            : "bg-black"
                                        }
                                    `}
                    >
                      {shot.keyframe_url ? (
                        <img
                          src={shot.keyframe_url}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 pointer-events-none">
                          <Download size={20} className="mb-1" />
                          <span className="text-[9px] font-bold">
                            DROP FLUX IMAGE
                          </span>
                        </div>
                      )}

                      {/* Shot Number */}
                      <div className="absolute top-1 left-1 bg-black/80 text-[9px] text-white px-1.5 rounded-sm font-mono">
                        {index + 1}
                      </div>
                    </div>

                    {/* 2. THE CONNECTOR (Bridge) */}
                    {/* Only show if there is a next shot */}
                    {index < shots.length - 1 && (
                      <div className="relative flex flex-col items-center justify-center w-12 gap-1 group/link">
                        <div className="h-[2px] w-full bg-zinc-800 group-hover/link:bg-zinc-700 absolute top-1/2 -z-10"></div>

                        <Button
                          onClick={() => openBridgeMenu(index)}
                          variant="outline"
                          size="icon"
                          className={`
                                                w-8 h-8 rounded-full border border-zinc-700 shadow-sm transition-all z-10
                                                ${
                                                  shot.status === "animating"
                                                    ? "animate-pulse bg-[#D2FF44]/20 border-[#D2FF44]"
                                                    : "bg-zinc-900 hover:border-[#D2FF44] hover:text-[#D2FF44]"
                                                }
                                                ${
                                                  shot.video_url
                                                    ? "text-[#D2FF44] border-[#D2FF44]"
                                                    : "text-zinc-500"
                                                }
                                            `}
                        >
                          {shot.status === "animating" ? (
                            <Clock size={12} className="animate-spin" />
                          ) : shot.video_url ? (
                            <LinkIcon size={12} />
                          ) : (
                            <Plus size={12} />
                          )}
                        </Button>

                        {/* Label */}
                        <span className="text-[8px] font-mono text-zinc-600 uppercase">
                          {shot.video_url ? "LINKED" : "GAP"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {/* ADD NEW SLOT BUTTON */}
                <div className="pl-4">
                  <Button
                    onClick={addShotSlot}
                    variant="outline"
                    className="h-full aspect-square border-dashed border-zinc-800 text-zinc-600 hover:text-white hover:bg-zinc-900 hover:border-zinc-600"
                  >
                    <Plus size={20} />
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* MODAL: BRIDGE GENERATOR */}
      <Dialog open={isBridgeOpen} onOpenChange={setIsBridgeOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="text-[#D2FF44]" size={18} />
              <span>Generate Bridge</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Create a video transition between Shot{" "}
              {selectedGapIndex !== null ? selectedGapIndex + 1 : "?"} and Shot{" "}
              {selectedGapIndex !== null ? selectedGapIndex + 2 : "?"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Mode Selector */}
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
                  Draft (LTX) - Fast
                </TabsTrigger>
                <TabsTrigger
                  value="final"
                  className="flex-1 text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-[#D2FF44]"
                >
                  Final (Wan 14B) - Slow
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">
                Transition Prompt
              </label>
              <Textarea
                value={bridgePrompt}
                onChange={(e) => setBridgePrompt(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-sm h-24 focus-visible:ring-[#D2FF44]"
                placeholder="Describe the movement (e.g. Camera pushes in, character turns head...)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsBridgeOpen(false)}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateBridge}
              className="bg-[#D2FF44] hover:bg-[#bce63b] text-black font-bold"
            >
              <Film size={16} className="mr-2" />
              {bridgeMode === "draft"
                ? "Generate Draft (30s)"
                : "Render Final (5m)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
