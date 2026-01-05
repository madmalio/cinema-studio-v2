"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Share2, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock function to simulate fetching data
// In reality, you'd fetch based on imageId
const getMockImage = (imageId: string) => {
  return {
    id: imageId,
    // Just a placeholder, replace with real logic
    url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=1200&h=800&fit=crop",
    prompt:
      "A cinematic shot of a character in a sci-fi setting, dramatic lighting, 8k resolution",
    type: "Cast Member",
  };
};

export default function CinematicPage({
  params,
}: {
  params: Promise<{ id: string; imageId: string }>;
}) {
  const { id: projectId, imageId } = use(params);
  const image = getMockImage(imageId);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* 1. Navbar */}
      <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/90 to-transparent">
        <Link
          href={`/studio/${projectId}`}
          className="flex items-center gap-2 text-zinc-400 hover:text-[#D2FF44] transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-bold uppercase tracking-wider">
            Back to Studio
          </span>
        </Link>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white"
          >
            <Share2 size={20} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-transparent border-zinc-700 hover:bg-zinc-800 text-zinc-300"
          >
            <Download size={16} className="mr-2" /> Save
          </Button>
        </div>
      </nav>

      {/* 2. Main Stage */}
      <main className="flex-1 flex items-center justify-center p-4 h-screen">
        <div className="relative w-full h-full max-h-[85vh] flex items-center justify-center">
          {/* Main Image */}
          <img
            src={image.url}
            alt="Cinematic View"
            className="max-w-full max-h-full object-contain shadow-2xl drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]"
          />
        </div>
      </main>

      {/* 3. Footer Info */}
      <footer className="fixed bottom-0 w-full p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="max-w-4xl mx-auto text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-[#D2FF44]">
            <Info size={12} />
            <span>ID: {imageId}</span>
          </div>
          <p className="text-zinc-300 font-light text-lg">"{image.prompt}"</p>
        </div>
      </footer>
    </div>
  );
}
