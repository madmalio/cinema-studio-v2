"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Users,
  Wand2,
  Play,
  Settings,
  Download,
  Plus,
  Box,
  Map,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// Mock Data for Assets (We will hook this up to the DB later)
const MOCK_CAST = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=200&h=200&fit=crop",
];

const MOCK_LOCATIONS = [
  "https://images.unsplash.com/photo-1514924013411-cbf25faa35ad?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=200&h=200&fit=crop",
];

export default function StudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  // State
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeShot, setActiveShot] = useState<string | null>(null);

  // FETCH PROJECT DETAILS
  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`http://127.0.0.1:8000/projects/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
        }
      } catch (error) {
        console.error("Failed to fetch project", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [id]);

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden font-sans selection:bg-[#D2FF44]/30">
      {/* 1. LEFT SIDEBAR: THE ASSET BIN */}
      <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
        {/* Header */}
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
            {/* DYNAMIC TITLE */}
            {loading ? (
              <div className="h-4 w-24 bg-zinc-800 animate-pulse rounded" />
            ) : (
              <h2 className="font-bold text-sm truncate w-40">
                {project?.name || "Untitled Project"}
              </h2>
            )}
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Asset Library
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="cast" className="flex-1 flex flex-col">
          <div className="px-4 pt-4">
            <TabsList className="w-full bg-zinc-950 border border-zinc-800 p-1">
              <TabsTrigger
                value="cast"
                className="flex-1 text-xs font-bold text-zinc-500 data-[state=active]:bg-[#D2FF44] data-[state=active]:text-black transition-all"
              >
                Cast
              </TabsTrigger>
              <TabsTrigger
                value="loc"
                className="flex-1 text-xs font-bold text-zinc-500 data-[state=active]:bg-[#D2FF44] data-[state=active]:text-black transition-all"
              >
                Locs
              </TabsTrigger>
              <TabsTrigger
                value="props"
                className="flex-1 text-xs font-bold text-zinc-500 data-[state=active]:bg-[#D2FF44] data-[state=active]:text-black transition-all"
              >
                Props
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 p-4">
            {/* CAST TAB */}
            <TabsContent value="cast" className="mt-0 space-y-4">
              <Link href={`/studio/${id}/generate/cast`} className="block">
                <Button className="w-full bg-[#D2FF44] hover:bg-[#bce63b] text-black text-xs font-bold h-9 shadow-[0_0_10px_rgba(210,255,68,0.1)]">
                  <Plus size={14} className="mr-1" /> Generate Actor
                </Button>
              </Link>

              <div className="grid grid-cols-2 gap-2">
                {MOCK_CAST.map((img, i) => (
                  <Link key={i} href={`/studio/${id}/view/cast-${i}`}>
                    <div className="aspect-square rounded-md overflow-hidden border border-zinc-800 hover:border-[#D2FF44] cursor-pointer group relative transition-all">
                      <img
                        src={img}
                        alt="Cast"
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                      />
                      <p className="absolute bottom-1 left-1 text-[10px] font-bold text-white drop-shadow-md">
                        Actor {i + 1}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </TabsContent>

            {/* LOCATIONS TAB */}
            <TabsContent value="loc" className="mt-0 space-y-4">
              {/* FIXED BUTTON: Now matches the Cast button style */}
              <Link href={`/studio/${id}/generate/loc`} className="block">
                <Button className="w-full bg-[#D2FF44] hover:bg-[#bce63b] text-black text-xs font-bold h-9 shadow-[0_0_10px_rgba(210,255,68,0.1)]">
                  <Plus size={14} className="mr-1" /> Generate Location
                </Button>
              </Link>

              <div className="grid grid-cols-2 gap-2">
                {MOCK_LOCATIONS.map((img, i) => (
                  <Link key={i} href={`/studio/${id}/view/loc-${i}`}>
                    <div className="aspect-square rounded-md overflow-hidden border border-zinc-800 hover:border-[#D2FF44] cursor-pointer group transition-all">
                      <img
                        src={img}
                        alt="Location"
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </TabsContent>

            {/* PROPS TAB */}
            <TabsContent value="props" className="mt-0 space-y-4">
              {/* FIXED BUTTON: Now matches the Cast button style */}
              <Link href={`/studio/${id}/generate/prop`} className="block">
                <Button className="w-full bg-[#D2FF44] hover:bg-[#bce63b] text-black text-xs font-bold h-9 shadow-[0_0_10px_rgba(210,255,68,0.1)]">
                  <Plus size={14} className="mr-1" /> Generate Prop
                </Button>
              </Link>
              <div className="flex flex-col items-center justify-center h-32 opacity-30">
                <Box size={24} className="mb-2" />
                <p className="text-xs">No props created</p>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      {/* 2. CENTER: THE STAGE (Director View) */}
      <div className="flex-1 flex flex-col relative bg-zinc-950">
        {/* Toolbar */}
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
              Flux Dev + Qwen 2.5
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-300"
            >
              <Download size={14} className="mr-2" /> Export
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-zinc-500 hover:text-white"
            >
              <Settings size={16} />
            </Button>
          </div>
        </div>

        {/* Viewport (The Canvas) */}
        <div className="flex-1 flex items-center justify-center p-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950">
          {activeShot ? (
            <img
              src={activeShot}
              className="max-h-full shadow-2xl rounded-lg border border-zinc-800 ring-1 ring-white/10"
              alt="Active Shot"
            />
          ) : (
            <div className="text-center space-y-4 opacity-30 select-none">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-zinc-700 flex items-center justify-center mx-auto text-zinc-600">
                <Users size={32} />
              </div>
              <p className="text-sm font-medium text-zinc-500">
                Drag an Asset here to start a scene
              </p>
            </div>
          )}
        </div>

        {/* 3. BOTTOM: THE TIMELINE */}
        <div className="h-52 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex flex-col z-10">
          {/* Timeline Header */}
          <div className="h-9 border-b border-zinc-800/50 flex items-center px-4 justify-between bg-zinc-950/50">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Timeline Sequence
              </span>
            </div>

            <Button
              size="sm"
              className="h-6 text-[10px] bg-[#D2FF44] hover:bg-[#bce63b] text-black font-bold rounded-full px-4 shadow-[0_0_15px_rgba(210,255,68,0.2)]"
            >
              <Play size={10} className="mr-1 fill-current" /> RENDER VIDEO
            </Button>
          </div>

          {/* Timeline Content */}
          <ScrollArea className="flex-1 w-full whitespace-nowrap p-4">
            <div className="flex gap-3 pb-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  onClick={() =>
                    setActiveShot(
                      `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80`
                    )
                  }
                  className="w-48 aspect-video bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-center shrink-0 hover:border-[#D2FF44] transition-all cursor-pointer group relative overflow-hidden"
                >
                  <span className="text-zinc-700 font-bold text-xs group-hover:text-white transition-colors">
                    Shot {i}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[#D2FF44] scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                </div>
              ))}

              <button className="w-24 aspect-video border-2 border-dashed border-zinc-800 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-[#D2FF44]/50 hover:bg-zinc-900 transition-all text-zinc-600 hover:text-[#D2FF44]">
                <Plus size={20} />
                <span className="text-[10px] font-bold uppercase">Add</span>
              </button>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
