"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Wand2,
  Film,
  Loader2,
  Clapperboard,
  Zap,
  History,
  CheckCircle,
  Trash2,
  Monitor,
  Camera,
  Aperture,
  CornerDownRight,
  ArrowLeft,
  ArrowRight,
  AlertTriangle, // <--- NEW IMPORT
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// --- TYPES ---
interface Take {
  id: number;
  video_url: string;
  prompt: string;
  created_at: string;
}

interface Shot {
  id: number;
  scene_id: number;
  prompt: string;
  keyframe_url: string | null;
  video_url: string | null;
  status: "pending" | "ready" | "animating" | "complete";
}

export default function DirectorsLabPage({
  params,
}: {
  params: Promise<{ id: string; shotId: string }>;
}) {
  const router = useRouter();
  const { id: projectId, shotId } = use(params);

  // --- STATE ---
  const [shot, setShot] = useState<Shot | null>(null);
  const [takes, setTakes] = useState<Take[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation State
  const [prevShotId, setPrevShotId] = useState<number | null>(null);
  const [nextShotId, setNextShotId] = useState<number | null>(null);

  // Director Controls
  const [prompt, setPrompt] = useState("");
  const [camera, setCamera] = useState("Push In");
  const [style, setStyle] = useState("Cinematic");
  const [customMove, setCustomMove] = useState("");

  // UI State
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Delete State (Takes)
  const [takeToDelete, setTakeToDelete] = useState<Take | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Delete State (Shot) - NEW
  const [isDeleteShotModalOpen, setIsDeleteShotModalOpen] = useState(false);

  // Scroll Ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- FETCH DATA ---
  async function fetchData() {
    try {
      const sRes = await fetch(
        `http://127.0.0.1:8000/projects/${projectId}/scenes`,
      );
      if (sRes.ok) {
        const data = await sRes.json();
        let foundShot: Shot | null = null;
        let sceneDesc = "";

        // Find current shot and neighbors
        const allShots: Shot[] = [];
        data.scenes.forEach((scene: any) => {
          allShots.push(...scene.shots);
          if (scene.shots.find((s: Shot) => s.id.toString() === shotId)) {
            sceneDesc = scene.description;
          }
        });

        const currentIndex = allShots.findIndex(
          (s) => s.id.toString() === shotId,
        );

        if (currentIndex !== -1) {
          foundShot = allShots[currentIndex];
          setShot(foundShot);
          if (currentIndex > 0) setPrevShotId(allShots[currentIndex - 1].id);
          if (currentIndex < allShots.length - 1)
            setNextShotId(allShots[currentIndex + 1].id);

          if (!foundShot.prompt || foundShot.prompt === "New Shot") {
            setPrompt(sceneDesc ? `[CONTEXT: ${sceneDesc}] ` : "");
          } else {
            setPrompt(foundShot.prompt);
          }
          if (!activeVideo) {
            setActiveVideo(foundShot.video_url || null);
          }
        }
      }

      const tRes = await fetch(`http://127.0.0.1:8000/shots/${shotId}/takes`);
      if (tRes.ok) {
        const tData = await tRes.json();
        setTakes(tData.takes);
      }
    } catch (error) {
      console.error("Failed to fetch shot data", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [projectId, shotId]);

  // --- ACTIONS ---

  const scrollTakes = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleEnhance = async () => {
    setIsEnhancing(true);
    const finalCamera = camera === "Custom" ? customMove : camera;
    try {
      const res = await fetch("http://127.0.0.1:8000/director/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt || "A cinematic shot",
          style: style,
          camera_move: finalCamera,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPrompt(data.enhanced_prompt);
      }
    } catch (error) {
      console.error("Enhance failed", error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleRender = async () => {
    if (!shot?.keyframe_url)
      return alert("Please upload a keyframe first (in Scene Builder).");

    setIsRendering(true);
    const finalCamera = camera === "Custom" ? customMove : camera;
    try {
      const res = await fetch(`http://127.0.0.1:8000/shots/${shotId}/animate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          style: style,
          camera_move: finalCamera,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveVideo(data.video_url);
        fetchData();
      } else {
        alert("Render failed");
      }
    } catch (error) {
      console.error("Render error", error);
    } finally {
      setIsRendering(false);
    }
  };

  const handleSelectTake = async (take: Take) => {
    await fetch(`http://127.0.0.1:8000/shots/${shotId}/select_take`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_url: take.video_url }),
    });
    setActiveVideo(take.video_url);
    fetchData();
  };

  const handleStitch = async (take: Take) => {
    const res = await fetch(`http://127.0.0.1:8000/shots/${shotId}/stitch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_video_url: take.video_url }),
    });
    const data = await res.json();

    if (data.success) {
      router.push(`/studio/${projectId}/shot/${data.new_shot_id}`);
    } else {
      alert("Stitch failed: " + data.error);
    }
  };

  // --- TAKE DELETION ---
  const initiateDeleteTake = (take: Take) => {
    setTakeToDelete(take);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteTake = async () => {
    if (!takeToDelete) return;

    if (activeVideo === takeToDelete.video_url) {
      setActiveVideo(
        shot?.video_url && shot.video_url !== takeToDelete.video_url
          ? shot.video_url
          : null,
      );
    }

    await fetch(`http://127.0.0.1:8000/takes/${takeToDelete.id}`, {
      method: "DELETE",
    });

    setIsDeleteModalOpen(false);
    setTakeToDelete(null);
    fetchData();
  };

  // --- SHOT DELETION (NEW) ---
  const handleDeleteShot = async () => {
    try {
      await fetch(`http://127.0.0.1:8000/shots/${shotId}`, {
        method: "DELETE",
      });
      // Redirect back to scene page
      router.push(`/studio/${projectId}/scene/${shot?.scene_id}`);
    } catch (error) {
      console.error("Failed to delete shot", error);
    }
  };

  if (loading)
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center text-[#D2FF44] font-mono animate-pulse">
        LOADING LABORATORY...
      </div>
    );
  if (!shot)
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center text-white">
        Shot not found
      </div>
    );

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden font-sans selection:bg-[#D2FF44]/30">
      {/* LEFT COLUMN: CONTROLS */}
      <div className="w-[450px] flex-shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-900/10">
        {/* HEADER WITH NAVIGATION */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/30">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                router.push(`/studio/${projectId}/scene/${shot.scene_id}`)
              }
              className="text-zinc-400 hover:text-[#D2FF44]"
              title="Back to Scene"
            >
              <ChevronLeft size={20} />
            </Button>
            <div>
              <h1 className="font-bold text-lg flex items-center gap-2">
                <Clapperboard size={20} className="text-[#D2FF44]" />
                Shot #{shot.id}
              </h1>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                {shot.status}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* DELETE BUTTON */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDeleteShotModalOpen(true)}
              className="text-zinc-600 hover:text-red-500 hover:bg-zinc-800 transition-colors"
              title="Delete Shot"
            >
              <Trash2 size={16} />
            </Button>
            <div className="h-4 w-px bg-zinc-800" />
            <Button
              variant="outline"
              size="icon"
              disabled={!prevShotId}
              onClick={() =>
                prevShotId &&
                router.push(`/studio/${projectId}/shot/${prevShotId}`)
              }
              className="h-8 w-8 border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-600"
            >
              <ArrowLeft size={14} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={!nextShotId}
              onClick={() =>
                nextShotId &&
                router.push(`/studio/${projectId}/shot/${nextShotId}`)
              }
              className="h-8 w-8 border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-600"
            >
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>

        {/* SCROLLABLE CONTROLS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* CAMERA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Camera size={14} /> Camera Movement
              </Label>
            </div>
            <Select value={camera} onValueChange={setCamera}>
              <SelectTrigger className="h-10 bg-zinc-950 border-zinc-800 text-white focus:ring-[#D2FF44]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-[300px]">
                <SelectGroup>
                  <SelectLabel className="text-xs text-zinc-500 font-bold uppercase">
                    Basics
                  </SelectLabel>
                  <SelectItem value="Static">Static (Tripod)</SelectItem>
                  <SelectItem value="Handheld">Handheld</SelectItem>
                  <SelectItem value="Push In">Push In (Slow Dolly)</SelectItem>
                  <SelectItem value="Pull Out">Pull Out (Reveal)</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel className="text-xs text-zinc-500 font-bold uppercase mt-2">
                    Lateral
                  </SelectLabel>
                  <SelectItem value="Pan Right">Truck Right</SelectItem>
                  <SelectItem value="Pan Left">Truck Left</SelectItem>
                  <SelectItem value="Orbit">Orbit (Arc)</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel className="text-xs text-zinc-500 font-bold uppercase mt-2">
                    Vertical
                  </SelectLabel>
                  <SelectItem value="Tilt Up">Tilt Up</SelectItem>
                  <SelectItem value="Tilt Down">Tilt Down</SelectItem>
                  <SelectItem value="Crane Up">Crane Up</SelectItem>
                  <SelectItem value="Crane Down">Crane Down</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel className="text-xs text-zinc-500 font-bold uppercase mt-2">
                    Drone
                  </SelectLabel>
                  <SelectItem value="Drone Overhead">
                    Overhead (God's Eye)
                  </SelectItem>
                  <SelectItem value="Drone Orbit">Drone Orbit</SelectItem>
                  <SelectItem value="Drone Fly Through">
                    FPV Fly Through
                  </SelectItem>
                </SelectGroup>
                <SelectItem
                  value="Custom"
                  className="text-[#D2FF44] font-bold mt-2"
                >
                  ✨ Custom Movement...
                </SelectItem>
              </SelectContent>
            </Select>
            {camera === "Custom" && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <Input
                  value={customMove}
                  onChange={(e) => setCustomMove(e.target.value)}
                  placeholder="e.g. Barrel roll..."
                  className="bg-zinc-950 border-[#D2FF44] text-white"
                />
              </div>
            )}
          </div>

          {/* STYLE */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <Aperture size={14} /> Visual Style
            </Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="h-10 bg-zinc-950 border-zinc-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                <SelectItem value="Cinematic">Cinematic</SelectItem>
                <SelectItem value="Cyberpunk">Cyberpunk</SelectItem>
                <SelectItem value="Anime">Anime</SelectItem>
                <SelectItem value="Vintage">Vintage</SelectItem>
                <SelectItem value="Horror">Horror</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PROMPT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Wand2 size={14} /> Director's Prompt
              </Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleEnhance}
                disabled={isEnhancing}
                className="h-6 text-[10px] text-[#D2FF44] hover:bg-[#D2FF44]/10 hover:text-[#D2FF44] px-2"
              >
                {isEnhancing ? (
                  <Loader2 size={10} className="animate-spin mr-1" />
                ) : (
                  <Zap size={10} className="mr-1" />
                )}
                {isEnhancing ? "OPTIMIZING..." : "ENHANCE"}
              </Button>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="bg-zinc-950 border-zinc-800 focus:border-[#D2FF44] min-h-[150px] resize-none leading-relaxed text-sm p-4"
              placeholder="Describe the action..."
            />
          </div>
        </div>

        {/* FOOTER ACTION BAR */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-900/30">
          <Button
            onClick={handleRender}
            disabled={isRendering}
            className="w-full h-14 bg-[#D2FF44] text-black font-bold text-lg hover:bg-[#bce63b] shadow-[0_0_20px_rgba(210,255,68,0.3)] transition-all"
          >
            {isRendering ? (
              <>
                <Loader2 className="animate-spin mr-2" /> RENDERING VIDEO...
              </>
            ) : (
              <>
                <Film className="mr-2" /> GENERATE TAKE
              </>
            )}
          </Button>
        </div>
      </div>

      {/* RIGHT COLUMN: MONITOR */}
      <div className="flex-1 flex flex-col bg-black relative min-w-0">
        <div className="flex-1 flex items-center justify-center p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black">
          <div className="relative w-full max-w-5xl aspect-video bg-black border border-zinc-800 rounded-lg overflow-hidden shadow-2xl group">
            {activeVideo ? (
              <video
                src={activeVideo}
                controls
                autoPlay
                loop
                className="w-full h-full object-contain"
              />
            ) : shot.keyframe_url ? (
              <div className="relative w-full h-full">
                <img
                  src={shot.keyframe_url}
                  className="w-full h-full object-contain opacity-50"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Monitor size={48} className="text-zinc-500 mb-4" />
                  <p className="text-zinc-400 font-mono text-sm">
                    KEYFRAME READY
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700">
                <Monitor size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-mono opacity-50">
                  NO KEYFRAME SOURCE
                </p>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM: DAILIES */}
        <div className="h-48 border-t border-zinc-800 bg-zinc-900/50 flex flex-col relative group/carousel">
          <div className="h-10 border-b border-zinc-800 flex items-center px-4 justify-between bg-zinc-950/50">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
              <History size={12} /> Version History (Takes)
            </div>
            <div className="text-[10px] text-zinc-600 font-mono">
              {takes.length} VERSIONS STORED
            </div>
          </div>

          {/* SCROLL BUTTONS */}
          {takes.length > 0 && (
            <>
              <button
                onClick={() => scrollTakes("left")}
                className="absolute left-2 top-1/2 -translate-y-1/2 mt-4 z-10 p-2 rounded-full bg-black/60 border border-zinc-700 text-zinc-300 hover:bg-[#D2FF44] hover:text-black hover:border-[#D2FF44] hover:scale-110 transition-all shadow-lg opacity-0 group-hover/carousel:opacity-100"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => scrollTakes("right")}
                className="absolute right-2 top-1/2 -translate-y-1/2 mt-4 z-10 p-2 rounded-full bg-black/60 border border-zinc-700 text-zinc-300 hover:bg-[#D2FF44] hover:text-black hover:border-[#D2FF44] hover:scale-110 transition-all shadow-lg opacity-0 group-hover/carousel:opacity-100"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          {/* CONTENT STRIP */}
          <div
            ref={scrollContainerRef}
            className="flex-1 w-full overflow-x-auto p-4 [&::-webkit-scrollbar]:hidden scrollbar-none"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="flex gap-4 min-w-max">
              {takes.length === 0 && (
                <div className="text-zinc-600 text-xs italic p-4">
                  No takes generated yet. Hit "Generate Take" to begin.
                </div>
              )}

              {takes.map((take, idx) => {
                const isMain = shot.video_url === take.video_url;
                const isPlaying = activeVideo === take.video_url;

                return (
                  <div
                    key={take.id}
                    onClick={() => setActiveVideo(take.video_url)}
                    className={`w-48 aspect-video bg-black rounded-lg border-2 relative cursor-pointer group flex-shrink-0 overflow-hidden transition-all ${
                      isPlaying
                        ? "border-[#D2FF44] shadow-[0_0_15px_rgba(210,255,68,0.15)]"
                        : "border-zinc-800 hover:border-zinc-500"
                    }`}
                  >
                    <video
                      src={take.video_url}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    <div className="absolute top-1 left-1 bg-black/80 text-[9px] text-white px-1.5 rounded font-mono">
                      TAKE {takes.length - idx}
                    </div>
                    {isMain && (
                      <div className="absolute top-1 right-1 bg-[#D2FF44] text-black text-[9px] px-1.5 rounded font-bold flex items-center gap-1">
                        <CheckCircle size={8} /> MAIN
                      </div>
                    )}

                    {/* HOVER ACTION ICONS */}
                    <div className="absolute bottom-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 p-1 rounded backdrop-blur-sm z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTake(take);
                        }}
                        className="p-1 text-zinc-400 hover:text-[#D2FF44] hover:bg-zinc-800 rounded transition-colors"
                        title="Set as Main"
                      >
                        <CheckCircle size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStitch(take);
                        }}
                        className="p-1 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded transition-colors"
                        title="Stitch / Extend"
                      >
                        <CornerDownRight size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          initiateDeleteTake(take);
                        }}
                        className="p-1 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM DELETE TAKE MODAL */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-zinc-950 border-[#D2FF44] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Trash2 className="text-[#D2FF44]" /> Delete Take?
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will permanently delete the video file from your disk. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteTake}
              className="bg-[#D2FF44] text-black font-bold"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW: CONFIRM DELETE SHOT MODAL */}
      <Dialog
        open={isDeleteShotModalOpen}
        onOpenChange={setIsDeleteShotModalOpen}
      >
        <DialogContent className="bg-zinc-950 border-[#D2FF44] text-white sm:max-w-md shadow-[0_0_30px_rgba(210,255,68,0.2)]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-[#D2FF44] mb-2">
              <AlertTriangle
                size={24}
                className="fill-current text-black stroke-[#D2FF44]"
              />
              <DialogTitle className="text-xl font-bold text-white">
                Delete Shot #{shot?.id}?
              </DialogTitle>
            </div>
            <DialogDescription className="text-zinc-400">
              This will permanently delete the entire shot and all{" "}
              {takes.length} takes from your disk.
              <br />
              <br />
              <span className="text-red-500 font-bold uppercase">
                Warning:
              </span>{" "}
              You will be returned to the Scene Builder.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteShotModalOpen(false)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteShot}
              className="bg-[#D2FF44] hover:bg-[#bce63b] text-black font-bold border border-[#D2FF44]"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
