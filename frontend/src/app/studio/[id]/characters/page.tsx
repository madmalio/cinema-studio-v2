"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Plus,
  Loader2,
  ArrowLeft,
  Search,
  MoreVertical,
  Trash2,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getProjectAssets, deleteAsset, Asset } from "@/lib/api";

export default function CharactersListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [characters, setCharacters] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  async function loadCharacters() {
    try {
      const assets = await getProjectAssets(id);
      // Filter only for 'cast' type assets
      const cast = assets.filter((a) => a.type === "cast");
      setCharacters(cast);
    } catch (e) {
      console.error("Failed to load characters", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCharacters();
  }, [id]);

  const handleDelete = async (e: React.MouseEvent, assetId: number) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this character?")) {
      await deleteAsset(assetId);
      loadCharacters();
    }
  };

  const filteredChars = characters.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-[#D2FF44]/30 flex flex-col">
      {/* HEADER */}
      <header className="h-20 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/studio/${id}`)}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <ArrowLeft size={20} className="mr-2" /> Back
          </Button>
          <div className="h-8 w-px bg-zinc-800" />
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="text-[#D2FF44]" /> Cast & Characters
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              size={14}
            />
            <Input
              placeholder="Search cast..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border-zinc-800 pl-9 focus:border-[#D2FF44] h-10"
            />
          </div>
          <Button
            onClick={() => router.push(`/studio/${id}/generate/cast`)}
            className="bg-[#D2FF44] text-black font-bold hover:bg-[#bce63b] h-10 px-6 shadow-[0_0_15px_rgba(210,255,68,0.2)]"
          >
            <Plus size={18} className="mr-2" /> New Character
          </Button>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-[#D2FF44]">
            <Loader2 className="animate-spin mr-2" /> Loading Cast...
          </div>
        ) : filteredChars.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500 opacity-50 select-none">
            <User size={64} className="mb-4" />
            <h2 className="text-xl font-bold">No Characters Found</h2>
            <p className="text-sm mt-2">
              Create a new character to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {/* CREATE NEW CARD */}
            <div
              onClick={() => router.push(`/studio/${id}/generate/cast`)}
              className="aspect-[3/4] border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-4 text-zinc-600 hover:text-[#D2FF44] hover:border-[#D2FF44] hover:bg-zinc-900/50 transition-all cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center group-hover:bg-[#D2FF44] group-hover:text-black transition-colors">
                <Plus size={32} />
              </div>
              <span className="font-bold text-sm">Add New Cast</span>
            </div>

            {/* CHARACTER CARDS */}
            {filteredChars.map((char) => (
              <div
                key={char.id}
                onClick={() =>
                  router.push(`/studio/${id}/characters/${char.id}`)
                }
                className="group relative aspect-[3/4] bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-[#D2FF44] hover:shadow-[0_0_30px_rgba(210,255,68,0.15)] transition-all cursor-pointer"
              >
                <img
                  src={char.image_path}
                  alt={char.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="font-bold text-white text-lg leading-tight mb-1">
                        {char.name}
                      </h3>
                      <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
                        Asset ID: {char.id}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="text-zinc-400 hover:text-white p-1 hover:bg-white/10 rounded"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-zinc-950 border-zinc-800 text-white">
                        <DropdownMenuItem
                          className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                          onClick={(e) => handleDelete(e, char.id)}
                        >
                          <Trash2 size={14} className="mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
