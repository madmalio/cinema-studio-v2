"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Wand2, Dice5, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function GeneratorPage({
  params,
}: {
  params: Promise<{ id: string; type: string }>;
}) {
  const { id, type } = use(params);

  // State for Project Details
  const [projectName, setProjectName] = useState<string>(`Project #${id}`);
  const [loading, setLoading] = useState(true);

  // Capitalize for display (cast -> Cast, loc -> Location)
  const typeLabel =
    type === "loc" ? "Location" : type.charAt(0).toUpperCase() + type.slice(1);

  // FETCH PROJECT NAME
  useEffect(() => {
    async function fetchProjectName() {
      try {
        const res = await fetch(`http://127.0.0.1:8000/projects/${id}`);
        if (res.ok) {
          const data = await res.json();
          // If the backend returns a name, use it. Otherwise keep the ID fallback.
          if (data.name) setProjectName(data.name);
        }
      } catch (error) {
        console.error("Failed to fetch project name", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProjectName();
  }, [id]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans selection:bg-[#D2FF44]/30">
      {/* 1. Header */}
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

            {/* DYNAMIC TITLE HERE */}
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
              {loading ? "Loading..." : projectName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Cancel
          </Button>
          {/* Secondary Action Style */}
          <Button className="bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 font-bold text-xs">
            <Save size={14} className="mr-2" /> Save Asset
          </Button>
        </div>
      </header>

      {/* 2. Main Content - Split Screen */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Controls */}
        <div className="w-[400px] border-r border-zinc-800 p-6 flex flex-col gap-6 bg-zinc-900/20 overflow-y-auto">
          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Name
            </label>
            <Input
              placeholder={`e.g. ${
                type === "cast" ? "Detective Miller" : "Cyberpunk Bar"
              }`}
              className="bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-[#D2FF44] focus-visible:border-[#D2FF44]"
            />
          </div>

          {/* Prompt Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Prompt Description
              </label>
              <span className="text-[10px] text-zinc-600">0/1000</span>
            </div>

            <Textarea
              className="h-40 bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-[#D2FF44] focus-visible:border-[#D2FF44] resize-none"
              placeholder="Describe the visual details, lighting, style, and mood..."
            />

            {/* Utility Button: Dark style */}
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-zinc-900/50 border-dashed border-zinc-700 text-zinc-400 hover:text-[#D2FF44] hover:border-[#D2FF44] hover:bg-zinc-900 transition-all"
            >
              <Sparkles size={14} className="mr-2" /> Enhance Prompt with AI
            </Button>
          </div>

          {/* Type Specific Controls */}
          {type === "cast" && (
            <div className="p-4 border border-zinc-800 rounded-lg bg-zinc-900/40">
              <h3 className="text-xs font-bold text-zinc-300 mb-3 uppercase tracking-wider">
                Character Traits
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {["Caucasian", "30s", "Cybernetic", "Moody"].map((trait) => (
                  <button
                    key={trait}
                    className="px-3 py-2 text-xs border border-zinc-800 bg-zinc-950 rounded-md text-zinc-400 hover:border-[#D2FF44] hover:text-white transition-all text-left truncate"
                  >
                    {trait}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Action: The "Yellow" Button */}
          <Button
            size="lg"
            className="mt-auto w-full bg-[#D2FF44] hover:bg-[#bce63b] text-black font-bold shadow-[0_0_15px_rgba(210,255,68,0.15)] transition-all active:scale-[0.98]"
          >
            <Dice5 size={18} className="mr-2" />
            GENERATE PREVIEW
          </Button>
        </div>

        {/* Right: Preview Area */}
        <div className="flex-1 bg-black flex items-center justify-center relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 to-black">
          <div className="text-center space-y-4 opacity-40 select-none">
            <div className="w-24 h-24 border-2 border-dashed border-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-zinc-700">
              <Wand2 size={32} />
            </div>
            <p className="text-sm font-medium text-zinc-500">
              Configure settings to generate preview
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
