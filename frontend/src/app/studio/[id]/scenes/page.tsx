"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clapperboard,
  Plus,
  Loader2,
  ArrowLeft,
  Search,
  MoreVertical,
  Trash2,
  Calendar,
  Film,
  Layout, // Added Layout icon
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription, // Added DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

// Import from API
import { getProject, getScene, createScene, Scene, Project } from "@/lib/api";

export default function ScenesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSceneName, setNewSceneName] = useState("");
  const [newSceneDesc, setNewSceneDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function loadData() {
    try {
      const [pData, sData] = await Promise.all([getProject(id), getScene(id)]);
      setProject(pData);
      setScenes(sData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  const handleCreate = async () => {
    if (!newSceneName) return;
    setIsCreating(true);
    try {
      await createScene(id, newSceneName, newSceneDesc);
      await loadData();
      setIsCreateOpen(false);
      setNewSceneName("");
      setNewSceneDesc("");
    } catch (e) {
      alert("Failed to create scene");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredScenes = scenes.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-[#D2FF44]/30 flex flex-col">
      {/* HEADER */}
      <header className="h-20 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link
            href={`/studio/${id}`}
            className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="h-8 w-px bg-zinc-800" />
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Clapperboard className="text-[#D2FF44]" /> Scenes & Sequences
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest -mt-1">
              {project?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              size={14}
            />
            <Input
              placeholder="Search scenes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border-zinc-800 pl-9 focus:border-[#D2FF44] h-10 transition-all"
            />
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-[#D2FF44] text-black font-bold hover:bg-[#bce63b] h-10 px-6 shadow-[0_0_15px_rgba(210,255,68,0.2)]"
          >
            <Plus size={18} className="mr-2" /> New Scene
          </Button>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-[#D2FF44]">
            <Loader2 className="animate-spin mr-2" /> Loading Storyboard...
          </div>
        ) : filteredScenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500 opacity-50 select-none border-2 border-dashed border-zinc-800 rounded-2xl">
            <Film size={64} className="mb-4 text-zinc-700" />
            <h2 className="text-xl font-bold">No Scenes Yet</h2>
            <p className="text-sm mt-2">Break down your script into scenes.</p>
            <Button
              variant="link"
              onClick={() => setIsCreateOpen(true)}
              className="text-[#D2FF44] mt-4"
            >
              Create Scene 1
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredScenes.map((scene, index) => {
              const coverShot =
                scene.shots && scene.shots.length > 0
                  ? scene.shots.find((s) => s.keyframe_url)
                  : null;

              return (
                <div
                  key={scene.id}
                  onClick={() =>
                    router.push(`/studio/${id}/scenes/${scene.id}`)
                  }
                  className="group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-[#D2FF44] hover:shadow-[0_0_30px_rgba(210,255,68,0.15)] transition-all cursor-pointer flex flex-col h-64"
                >
                  {/* COVER IMAGE */}
                  <div className="flex-1 bg-black relative overflow-hidden">
                    {coverShot ? (
                      <img
                        src={coverShot.keyframe_url!}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900/50">
                        <Clapperboard
                          size={32}
                          className="text-zinc-800 group-hover:text-zinc-700 transition-colors"
                        />
                      </div>
                    )}

                    {/* Number Badge */}
                    <div className="absolute top-3 left-3 bg-black/80 backdrop-blur border border-white/10 text-white text-xs font-bold px-2 py-1 rounded">
                      SCENE {index + 1}
                    </div>

                    {/* Action Arrow */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-[#D2FF44] text-black rounded-full p-1.5">
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>

                  {/* META */}
                  <div className="p-4 border-t border-zinc-800 bg-zinc-900 group-hover:bg-zinc-800/50 transition-colors relative z-10">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white text-lg truncate pr-4 group-hover:text-[#D2FF44] transition-colors">
                          {scene.name}
                        </h3>
                        <p className="text-xs text-zinc-500 line-clamp-1 mt-1 h-4">
                          {scene.description || "No description"}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="text-zinc-500 hover:text-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-zinc-950 border-zinc-800 text-white">
                          <DropdownMenuItem
                            className="text-red-500"
                            onClick={(e) => {
                              e.stopPropagation(); /* Add delete logic */
                            }}
                          >
                            <Trash2 size={14} className="mr-2" /> Delete Scene
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Film size={10} />{" "}
                        {scene.shots ? scene.shots.length : 0} Shots
                      </span>
                      {scene.shots?.some((s) => s.status === "complete") && (
                        <span className="flex items-center gap-1 text-[#D2FF44]">
                          <Calendar size={10} /> In Progress
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MATCHED CREATE SCENE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newSceneName || isCreating}
              className="bg-[#D2FF44] text-black font-bold hover:bg-[#bce63b]"
            >
              {isCreating ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                "Create Scene"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
