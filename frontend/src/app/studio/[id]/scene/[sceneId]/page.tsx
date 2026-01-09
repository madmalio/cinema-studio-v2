"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Plus,
  Layout,
  FileText,
  Film,
  ArrowRight,
  Users,
  MonitorPlay,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  status: "pending" | "ready" | "animating" | "complete";
  keyframe_url: string | null;
  video_url: string | null;
}

interface Scene {
  id: number;
  name: string;
  description: string;
  shots: Shot[];
}

export default function SceneBuilderPage({
  params,
}: {
  params: Promise<{ id: string; sceneId: string }>;
}) {
  const router = useRouter();
  const { id: projectId, sceneId } = use(params);

  // --- STATE ---
  const [scene, setScene] = useState<Scene | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [masterContext, setMasterContext] = useState("");
  const [isSavingContext, setIsSavingContext] = useState(false);

  // DRAG STATE
  const [draggedAsset, setDraggedAsset] = useState<Asset | null>(null);
  const [dragOverShotId, setDragOverShotId] = useState<number | null>(null);

  // --- FETCH DATA ---
  async function fetchData() {
    try {
      // 1. Get All Scenes
      const sRes = await fetch(
        `http://127.0.0.1:8000/projects/${projectId}/scenes`
      );
      if (sRes.ok) {
        const data = await sRes.json();
        const foundScene = data.scenes.find(
          (s: Scene) => s.id.toString() === sceneId
        );
        if (foundScene) {
          setScene(foundScene);
          setMasterContext(foundScene.description || "");
        }
      }

      // 2. Get Assets
      const aRes = await fetch(
        `http://127.0.0.1:8000/projects/${projectId}/assets`
      );
      if (aRes.ok) {
        const data = await aRes.json();
        setAssets(data.assets);
      }
    } catch (error) {
      console.error("Failed to fetch scene data", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [projectId, sceneId]);

  // --- ACTIONS ---

  const handleSaveContext = async () => {
    if (!scene) return;
    setIsSavingContext(true);
    setTimeout(() => setIsSavingContext(false), 500);
  };

  const handleAddShot = async () => {
    if (!scene) return;
    await fetch(`http://127.0.0.1:8000/shots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scene_id: scene.id,
        prompt: "New Shot",
      }),
    });
    fetchData();
  };

  // --- DRAG AND DROP HANDLERS ---
  const onDragOver = (e: React.DragEvent, shotId: number) => {
    e.preventDefault(); // Essential to allow dropping
    setDragOverShotId(shotId);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverShotId(null);
  };

  const onDrop = async (e: React.DragEvent, shotId: number) => {
    e.preventDefault();
    setDragOverShotId(null);

    if (!draggedAsset) return;

    // Save keyframe to backend
    const res = await fetch(`http://127.0.0.1:8000/shots/${shotId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyframe_url: draggedAsset.image_path,
        status: "ready_for_video", // Auto-update status so Director knows it's ready
      }),
    });

    if (res.ok) {
      fetchData(); // Refresh UI to show image
    }
    setDraggedAsset(null);
  };

  const castAssets = assets.filter((a) => a.type === "cast");
  const locAssets = assets.filter((a) => a.type === "loc");

  if (loading)
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center text-[#D2FF44] animate-pulse font-mono">
        LOADING SCENE DATA...
      </div>
    );
  if (!scene)
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center text-white">
        Scene not found
      </div>
    );

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden font-sans selection:bg-[#D2FF44]/30">
      {/* 1. LEFT: SHOT LIST (The Timeline) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/studio/${projectId}`)}
              className="text-zinc-400 hover:text-[#D2FF44] hover:bg-transparent transition-colors"
            >
              <ChevronLeft size={16} className="mr-1" /> Dashboard
            </Button>
            <div className="h-6 w-px bg-zinc-800" />
            <h1 className="font-bold text-lg text-white flex items-center gap-2">
              <Layout size={18} className="text-[#D2FF44]" />
              {scene.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAddShot}
              className="bg-[#D2FF44] text-black hover:bg-[#bce63b] font-bold h-9 text-xs shadow-[0_0_15px_rgba(210,255,68,0.2)] transition-all"
            >
              <Plus size={14} className="mr-2" /> Add Shot Slot
            </Button>
          </div>
        </div>

        {/* Master Context Bar */}
        <div className="bg-zinc-900/30 border-b border-zinc-800 p-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-bold text-[#D2FF44] uppercase tracking-widest flex items-center gap-2">
              <FileText size={12} /> Master Context (Atmosphere)
            </Label>
            {isSavingContext && (
              <span className="text-[10px] text-[#D2FF44] font-mono animate-pulse">
                SAVING...
              </span>
            )}
          </div>
          <Textarea
            value={masterContext}
            onChange={(e) => setMasterContext(e.target.value)}
            onBlur={handleSaveContext}
            placeholder="Describe the global look, lighting, and mood for this scene. This prompt is injected into every shot."
            className="bg-zinc-950 border-zinc-800 focus:border-[#D2FF44] min-h-[80px] text-zinc-300 resize-none text-sm leading-relaxed"
          />
        </div>

        {/* Shot Stack */}
        <ScrollArea className="flex-1 p-6 bg-zinc-950">
          <div className="max-w-4xl mx-auto space-y-4">
            {scene.shots.length === 0 && (
              <div className="text-center py-20 opacity-30 select-none">
                <Film size={48} className="mx-auto mb-4 text-[#D2FF44]" />
                <p className="font-mono text-sm">NO SHOTS IN SCENE</p>
              </div>
            )}

            {scene.shots.map((shot, index) => (
              <div key={shot.id} className="flex gap-4 group">
                {/* Index Column */}
                <div className="flex flex-col items-center pt-4 w-12 flex-shrink-0">
                  <span className="text-xl font-black text-zinc-800 group-hover:text-[#D2FF44] transition-colors">
                    {index + 1}
                  </span>
                  <div className="w-px h-full bg-zinc-900 my-2 group-last:hidden" />
                </div>

                {/* Shot Card (DROP TARGET) */}
                <div
                  onDragOver={(e) => onDragOver(e, shot.id)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, shot.id)}
                  className={`flex-1 bg-zinc-900 border rounded-xl p-1 transition-all flex gap-4 overflow-hidden relative group/card shadow-sm
                                ${
                                  dragOverShotId === shot.id
                                    ? "border-[#D2FF44] bg-zinc-800 shadow-[0_0_20px_rgba(210,255,68,0.2)]"
                                    : "border-zinc-800 hover:border-[#D2FF44]"
                                }
                            `}
                >
                  {/* Visual Preview (Thumbnail) */}
                  <div className="w-48 aspect-video bg-black rounded-lg overflow-hidden relative flex-shrink-0 border border-zinc-800 group-hover/card:border-zinc-700 transition-colors">
                    {shot.video_url ? (
                      <video
                        src={shot.video_url}
                        className="w-full h-full object-cover"
                      />
                    ) : shot.keyframe_url ? (
                      <img
                        src={shot.keyframe_url}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700">
                        <Download
                          size={24}
                          className={`mb-2 ${
                            dragOverShotId === shot.id
                              ? "text-[#D2FF44] animate-bounce"
                              : ""
                          }`}
                        />
                        <span className="text-[9px] font-bold uppercase tracking-wider">
                          {dragOverShotId === shot.id
                            ? "DROP HERE"
                            : "DROP ASSET"}
                        </span>
                      </div>
                    )}

                    {/* Enter Lab Overlay (Only if keyframe exists) */}
                    {shot.keyframe_url && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
                        <Link href={`/studio/${projectId}/shot/${shot.id}`}>
                          <Button
                            size="sm"
                            className="bg-[#D2FF44] text-black font-bold hover:bg-[#bce63b] border-none shadow-lg transform hover:scale-105 transition-all"
                          >
                            Enter Lab
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 py-3 pr-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 border-zinc-700 text-zinc-400 font-mono tracking-wider"
                        >
                          {shot.status.toUpperCase()}
                        </Badge>
                        {shot.keyframe_url && (
                          <Link href={`/studio/${projectId}/shot/${shot.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] text-zinc-500 hover:text-[#D2FF44] hover:bg-transparent transition-colors"
                            >
                              OPEN DIRECTOR'S LAB{" "}
                              <ArrowRight size={10} className="ml-1" />
                            </Button>
                          </Link>
                        )}
                      </div>
                      <p className="text-sm text-zinc-300 line-clamp-2 font-medium leading-snug group-hover/card:text-white transition-colors">
                        {shot.prompt.startsWith("[CONTEXT")
                          ? shot.prompt.split("]")[1]
                          : shot.prompt}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-600 font-mono mt-2">
                      <span>SHOT ID: {shot.id}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Append Button */}
            <button
              onClick={handleAddShot}
              className="h-16 w-[calc(100%-4rem)] ml-16 rounded-xl border-2 border-dashed border-zinc-800 bg-black/20 text-zinc-600 font-bold flex items-center justify-center gap-2 hover:border-[#D2FF44] hover:text-[#D2FF44] hover:bg-[#D2FF44]/5 transition-all"
            >
              <Plus size={20} />
              <span>Append New Shot</span>
            </button>
          </div>
        </ScrollArea>
      </div>

      {/* 2. RIGHT: ASSET DRAWER (Source) */}
      <div className="w-80 border-l border-zinc-800 bg-zinc-900/30 flex flex-col">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="font-bold text-sm flex items-center gap-2 text-white">
            <Users size={14} className="text-[#D2FF44]" />
            Project Assets
          </h2>
          <p className="text-[10px] text-zinc-500 mt-1">
            Drag assets to shot slots
          </p>
        </div>

        <Tabs defaultValue="all" className="flex-1 flex flex-col">
          <div className="px-4 pt-4">
            <TabsList className="w-full bg-zinc-900 border border-zinc-800 p-0.5 grid grid-cols-2 h-8">
              <TabsTrigger
                value="all"
                className="text-[10px] font-bold text-zinc-400 data-[state=active]:bg-[#D2FF44] data-[state=active]:text-black hover:text-[#D2FF44] data-[state=active]:hover:text-black transition-colors"
              >
                All Assets
              </TabsTrigger>
              <TabsTrigger
                value="scene"
                className="text-[10px] font-bold text-zinc-400 data-[state=active]:bg-[#D2FF44] data-[state=active]:text-black hover:text-[#D2FF44] data-[state=active]:hover:text-black transition-colors"
              >
                Scene Only
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 p-4">
            <TabsContent value="all" className="mt-0 space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-[10px] text-zinc-500 uppercase font-bold mb-2 block">
                    Cast
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {castAssets.map((a) => (
                      <div
                        key={a.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedAsset(a);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        className="aspect-square bg-zinc-900 rounded border border-zinc-800 overflow-hidden relative group hover:border-[#D2FF44] transition-colors cursor-grab active:cursor-grabbing"
                      >
                        <img
                          src={a.image_path}
                          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 text-[9px] truncate text-center text-zinc-300 group-hover:text-white pointer-events-none">
                          {a.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-zinc-500 uppercase font-bold mb-2 block">
                    Locations
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {locAssets.map((a) => (
                      <div
                        key={a.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedAsset(a);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        className="aspect-square bg-zinc-900 rounded border border-zinc-800 overflow-hidden relative group hover:border-[#D2FF44] transition-colors cursor-grab active:cursor-grabbing"
                      >
                        <img
                          src={a.image_path}
                          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 text-[9px] truncate text-center text-zinc-300 group-hover:text-white pointer-events-none">
                          {a.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="scene" className="mt-0">
              <div className="text-center text-zinc-600 text-xs py-10">
                No assets assigned specifically to this scene yet.
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}
