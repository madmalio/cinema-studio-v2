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
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// Define Asset Interface
interface Asset {
  id: number;
  type: string;
  name: string;
  image_url: string; // The URL from the DB
}

export default function StudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  // State
  const [project, setProject] = useState<any>(null);
  const [assets, setAssets] = useState<Asset[]>([]); // <--- REAL DATA STATE
  const [loading, setLoading] = useState(true);
  const [activeShot, setActiveShot] = useState<string | null>(null);

  // FETCH DATA
  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Get Project Details
        const pRes = await fetch(`http://127.0.0.1:8000/projects/${id}`);
        if (pRes.ok) setProject(await pRes.json());

        // 2. Get Assets (We need to build this endpoint next!)
        // const aRes = await fetch(`http://127.0.0.1:8000/projects/${id}/assets`);
        // if (aRes.ok) setAssets(await aRes.json().assets);
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  // Filter assets by tab
  const castAssets = assets.filter((a) => a.type === "cast");
  const locAssets = assets.filter((a) => a.type === "loc");
  const propAssets = assets.filter((a) => a.type === "prop");

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden font-sans selection:bg-[#D2FF44]/30">
      {/* 1. LEFT SIDEBAR */}
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
                {project?.name || "Untitled Project"}
              </h2>
            )}
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Asset Library
            </p>
          </div>
        </div>

        <Tabs defaultValue="cast" className="flex-1 flex flex-col">
          <div className="px-4 pt-4">
            <TabsList className="w-full bg-zinc-950 border border-zinc-800 p-1">
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
              <TabsTrigger
                value="props"
                className="flex-1 text-xs font-bold text-zinc-500 data-[state=active]:bg-[#D2FF44] data-[state=active]:text-black"
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
                {/* REAL DATA MAPPING */}
                {castAssets.length > 0 ? (
                  castAssets.map((asset, i) => (
                    <Link key={i} href={`/studio/${id}/view/${asset.id}`}>
                      <div className="aspect-square rounded-md overflow-hidden border border-zinc-800 hover:border-[#D2FF44] cursor-pointer group relative transition-all">
                        <img
                          src={asset.image_url}
                          alt={asset.name}
                          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                        />
                        <p className="absolute bottom-1 left-1 text-[10px] font-bold text-white drop-shadow-md">
                          {asset.name}
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-2 py-8 text-center opacity-30 text-xs">
                    No actors yet
                  </div>
                )}
              </div>
            </TabsContent>

            {/* LOCATIONS TAB */}
            <TabsContent value="loc" className="mt-0 space-y-4">
              <Link href={`/studio/${id}/generate/loc`} className="block">
                <Button className="w-full bg-[#D2FF44] hover:bg-[#bce63b] text-black text-xs font-bold h-9 shadow-[0_0_10px_rgba(210,255,68,0.1)]">
                  <Plus size={14} className="mr-1" /> Generate Location
                </Button>
              </Link>
              <div className="grid grid-cols-2 gap-2">
                {/* REAL DATA MAPPING */}
                {locAssets.length > 0 ? (
                  locAssets.map((asset, i) => (
                    <Link key={i} href={`/studio/${id}/view/${asset.id}`}>
                      <div className="aspect-square rounded-md overflow-hidden border border-zinc-800 hover:border-[#D2FF44] cursor-pointer group relative transition-all">
                        <img
                          src={asset.image_url}
                          alt={asset.name}
                          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-2 py-8 text-center opacity-30 text-xs">
                    No locations yet
                  </div>
                )}
              </div>
            </TabsContent>

            {/* PROPS TAB */}
            <TabsContent value="props" className="mt-0 space-y-4">
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

      {/* CENTER: STAGE (Unchanged for now) */}
      <div className="flex-1 flex flex-col relative bg-zinc-950">
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

        {/* Timeline (Unchanged) */}
        <div className="h-52 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex flex-col z-10">
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
          <ScrollArea className="flex-1 w-full whitespace-nowrap p-4">
            <div className="flex gap-3 pb-2">
              {/* Timeline items logic can remain mocked for now */}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
