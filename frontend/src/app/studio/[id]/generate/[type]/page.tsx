"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation"; // <--- Added this
import Link from "next/link";
import { ArrowLeft, Wand2, Dice5, Save, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function GeneratorPage({
  params,
}: {
  params: Promise<{ id: string; type: string }>;
}) {
  const router = useRouter(); // <--- Initialize Router
  const { id, type } = use(params);

  // Data State
  const [projectName, setProjectName] = useState<string>(`Project #${id}`);
  const [loadingProject, setLoadingProject] = useState(true);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");

  const typeLabel =
    type === "loc" ? "Location" : type.charAt(0).toUpperCase() + type.slice(1);

  // 1. Fetch Project Name
  useEffect(() => {
    async function fetchProjectName() {
      try {
        const res = await fetch(`http://127.0.0.1:8000/projects/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.name) setProjectName(data.name);
        }
      } catch (error) {
        console.error("Failed to fetch project", error);
      } finally {
        setLoadingProject(false);
      }
    }
    fetchProjectName();
  }, [id]);

  // 2. Mock Generation Handler
  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedImage(
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800&q=80"
      );
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans selection:bg-[#D2FF44]/30">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Link
            href={`/studio/${id}`}
            className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2">
              <Wand2 size={18} className="text-[#D2FF44]" />
              Generate {typeLabel}
            </h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
              {loadingProject ? "Loading..." : projectName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* CANCEL BUTTON: NOW WORKING */}
          <Button
            variant="ghost"
            onClick={() => router.push(`/studio/${id}`)}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Cancel
          </Button>

          <Button
            disabled={!generatedImage}
            className="bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 font-bold text-xs disabled:opacity-50"
          >
            <Save size={14} className="mr-2" /> Save Asset
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Controls */}
        <div className="w-[400px] border-r border-zinc-800 p-6 flex flex-col gap-6 bg-zinc-900/20 overflow-y-auto">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g. ${
                type === "cast" ? "Detective Miller" : "Cyberpunk Bar"
              }`}
              className="bg-zinc-900 border-zinc-800 text-zinc-200 focus-visible:ring-[#D2FF44]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Prompt
              </label>
              <span className="text-[10px] text-zinc-600">
                {prompt.length}/1000
              </span>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="h-40 bg-zinc-900 border-zinc-800 text-zinc-200 focus-visible:ring-[#D2FF44] resize-none"
              placeholder="Describe the visual details..."
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-zinc-900/50 border-dashed border-zinc-700 text-zinc-400 hover:text-[#D2FF44] hover:border-[#D2FF44]"
            >
              <Sparkles size={14} className="mr-2" /> Enhance Prompt with AI
            </Button>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt}
            size="lg"
            className="mt-auto w-full bg-[#D2FF44] hover:bg-[#bce63b] text-black font-bold shadow-[0_0_15px_rgba(210,255,68,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 animate-spin" /> GENERATING...
              </>
            ) : (
              <>
                <Dice5 size={18} className="mr-2" /> GENERATE PREVIEW
              </>
            )}
          </Button>
        </div>

        {/* Right: Preview Area */}
        <div className="flex-1 bg-black flex items-center justify-center relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 to-black">
          {/* Case 1: Loading */}
          {isGenerating && (
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <div className="w-16 h-16 border-4 border-[#D2FF44] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#D2FF44] font-mono text-sm tracking-widest uppercase">
                Rendering...
              </p>
            </div>
          )}

          {/* Case 2: Result */}
          {!isGenerating && generatedImage && (
            <img
              src={generatedImage}
              alt="Generated"
              className="max-h-[80vh] max-w-[90%] object-contain shadow-2xl border border-zinc-800 rounded-lg"
            />
          )}

          {/* Case 3: Empty State */}
          {!isGenerating && !generatedImage && (
            <div className="text-center space-y-4 opacity-40 select-none">
              <div className="w-24 h-24 border-2 border-dashed border-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-zinc-700">
                <Wand2 size={32} />
              </div>
              <p className="text-sm font-medium text-zinc-500">
                Configure settings to generate preview
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
