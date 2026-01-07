"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Film,
  Trash2,
  Play,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SceneBoard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();

  const [scenes, setScenes] = useState<any[]>([]);
  const [newSceneName, setNewSceneName] = useState("");
  const [loading, setLoading] = useState(true);

  // FETCH SCENES
  async function fetchScenes() {
    const res = await fetch(
      `http://127.0.0.1:8000/projects/${projectId}/scenes`
    );
    if (res.ok) {
      const data = await res.json();
      setScenes(data.scenes);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchScenes();
  }, [projectId]);

  // CREATE SCENE
  const handleAddScene = async () => {
    if (!newSceneName) return;
    await fetch(`http://127.0.0.1:8000/projects/${projectId}/scenes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSceneName }),
    });
    setNewSceneName("");
    fetchScenes();
  };

  // ADD SHOT TO SCENE
  const handleAddShot = async (sceneId: number) => {
    const prompt = window.prompt(
      "Describe this shot (e.g., 'Close up of gun on table'):"
    );
    if (!prompt) return;

    // Create the "Empty" Shot
    await fetch(`http://127.0.0.1:8000/shots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene_id: sceneId, prompt: prompt }),
    });
    fetchScenes();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-[#D2FF44]/30 flex flex-col">
      {/* HEADER */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/studio/${projectId}`)}
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="font-bold text-lg">Storyboard</h1>
        </div>
      </header>

      {/* SCENE CANVAS */}
      <div className="flex-1 overflow-x-auto p-8 flex gap-8">
        {/* CREATE NEW SCENE COLUMN */}
        <div className="w-80 shrink-0">
          <Card className="p-4 bg-zinc-900/50 border-dashed border-zinc-800 flex flex-col gap-4">
            <h3 className="font-bold text-zinc-500">New Scene</h3>
            <Input
              placeholder="Scene Name (e.g. The Chase)"
              value={newSceneName}
              onChange={(e) => setNewSceneName(e.target.value)}
              className="bg-zinc-950 border-zinc-800"
            />
            <Button
              onClick={handleAddScene}
              className="bg-[#D2FF44] text-black font-bold"
            >
              <Plus size={16} className="mr-2" /> Create Scene
            </Button>
          </Card>
        </div>

        {/* EXISTING SCENES (Horizontal Scroll) */}
        {scenes.map((scene) => (
          <div key={scene.id} className="w-96 shrink-0 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-xl">{scene.name}</h2>
              <Button
                variant="ghost"
                size="icon"
                className="text-zinc-600 hover:text-red-500"
              >
                <Trash2 size={16} />
              </Button>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-2 min-h-[500px] flex flex-col gap-3">
              {/* SHOTS LIST */}
              <ScrollArea className="flex-1">
                <div className="flex flex-col gap-3 p-2">
                  {scene.shots.map((shot: any, index: number) => (
                    <Card
                      key={shot.id}
                      className="bg-zinc-950 border-zinc-800 overflow-hidden group"
                    >
                      <div className="aspect-video bg-black relative flex items-center justify-center">
                        {shot.keyframe_url ? (
                          <img
                            src={shot.keyframe_url}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-zinc-700 flex flex-col items-center">
                            <ImageIcon size={24} className="mb-2" />
                            <span className="text-[10px] font-mono">
                              NO IMAGE
                            </span>
                          </div>
                        )}

                        {/* HOVER CONTROLS */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                          >
                            <ImageIcon size={14} className="mr-1" /> Gen Image
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-[#D2FF44] text-black"
                          >
                            <Play size={14} className="mr-1" /> Animate (SVD)
                          </Button>
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">
                            Shot {index + 1}
                          </span>
                          <span className="text-[10px] bg-zinc-800 px-1.5 rounded text-zinc-400">
                            {shot.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 line-clamp-2">
                          {shot.prompt}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              {/* ADD SHOT BUTTON */}
              <Button
                variant="outline"
                className="w-full border-dashed border-zinc-700 text-zinc-500 hover:text-white hover:bg-zinc-800"
                onClick={() => handleAddShot(scene.id)}
              >
                <Plus size={16} className="mr-2" /> Add Shot
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
