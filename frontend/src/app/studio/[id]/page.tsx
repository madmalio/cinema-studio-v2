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
  Trash2,
  AlertTriangle,
  MoreVertical,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Asset {
  id: number;
  type: string;
  name: string;
  image_path: string;
}

export default function StudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  // Data State
  const [project, setProject] = useState<any>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeShot, setActiveShot] = useState<string | null>(null);

  // Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Selection State
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [newName, setNewName] = useState("");

  // FETCH DATA
  async function fetchData() {
    try {
      const pRes = await fetch(`http://127.0.0.1:8000/projects/${id}`);
      if (pRes.ok) setProject(await pRes.json());

      const aRes = await fetch(`http://127.0.0.1:8000/projects/${id}/assets`);
      if (aRes.ok) {
        const data = await aRes.json();
        setAssets(data.assets);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [id]);

  // --- ACTIONS ---

  // 1. Prepare Edit
  const openEditModal = (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    setSelectedAsset(asset);
    setNewName(asset.name);
    setIsEditModalOpen(true);
  };

  // 2. Prepare Delete
  const openDeleteModal = (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    setSelectedAsset(asset);
    setIsDeleteModalOpen(true);
  };

  // 3. Confirm Edit (Rename)
  const handleRenameAsset = async () => {
    if (!selectedAsset || !newName) return;

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/assets/${selectedAsset.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        }
      );

      if (res.ok) {
        // Update local state without refreshing
        setAssets(
          assets.map((a) =>
            a.id === selectedAsset.id ? { ...a, name: newName } : a
          )
        );
        setIsEditModalOpen(false);
      }
    } catch (error) {
      console.error("Failed to rename", error);
    }
  };

  // 4. Confirm Delete
  const handleConfirmDelete = async () => {
    if (!selectedAsset) return;

    try {
      await fetch(`http://127.0.0.1:8000/assets/${selectedAsset.id}`, {
        method: "DELETE",
      });

      // Update local state
      setAssets(assets.filter((a) => a.id !== selectedAsset.id));
      if (activeShot === selectedAsset.image_path) setActiveShot(null);

      setIsDeleteModalOpen(false);
      setSelectedAsset(null);
    } catch (error) {
      console.error("Failed to delete", error);
    }
  };

  // Asset Card Component
  const AssetCard = ({ asset }: { asset: Asset }) => (
    <div
      onClick={() => setActiveShot(asset.image_path)}
      className="aspect-square rounded-md overflow-hidden border border-zinc-800 hover:border-[#D2FF44] cursor-pointer group relative transition-all"
    >
      <img
        src={asset.image_path}
        alt={asset.name}
        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-white truncate max-w-[70%]">
            {asset.name}
          </p>

          {/* KEBAB MENU */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 hover:bg-zinc-800 rounded-md text-zinc-300 hover:text-white transition-colors"
              >
                <MoreVertical size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-white min-w-[120px]">
              <DropdownMenuItem
                onClick={(e) => openEditModal(e, asset)}
                className="text-xs cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800 focus:text-white"
              >
                <Pencil size={12} className="mr-2" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => openDeleteModal(e, asset)}
                className="text-xs cursor-pointer text-red-500 hover:bg-red-900/20 focus:bg-red-900/20 focus:text-red-500"
              >
                <Trash2 size={12} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

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
            {/* TABS CONTENT */}
            <TabsContent value="cast" className="mt-0 space-y-4">
              <Link href={`/studio/${id}/generate/cast`} className="block">
                <Button className="w-full bg-[#D2FF44] hover:bg-[#bce63b] text-black text-xs font-bold h-9 shadow-[0_0_10px_rgba(210,255,68,0.1)]">
                  <Plus size={14} className="mr-1" /> Generate Actor
                </Button>
              </Link>
              <div className="grid grid-cols-2 gap-2">
                {castAssets.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="loc" className="mt-0 space-y-4">
              <Link href={`/studio/${id}/generate/loc`} className="block">
                <Button className="w-full bg-[#D2FF44] hover:bg-[#bce63b] text-black text-xs font-bold h-9 shadow-[0_0_10px_rgba(210,255,68,0.1)]">
                  <Plus size={14} className="mr-1" /> Generate Location
                </Button>
              </Link>
              <div className="grid grid-cols-2 gap-2">
                {locAssets.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="props" className="mt-0 space-y-4">
              <Link href={`/studio/${id}/generate/prop`} className="block">
                <Button className="w-full bg-[#D2FF44] hover:bg-[#bce63b] text-black text-xs font-bold h-9 shadow-[0_0_10px_rgba(210,255,68,0.1)]">
                  <Plus size={14} className="mr-1" /> Generate Prop
                </Button>
              </Link>
              <div className="grid grid-cols-2 gap-2">
                {propAssets.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} />
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      {/* CENTER STAGE */}
      <div className="flex-1 flex flex-col relative bg-zinc-950">
        <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/30 backdrop-blur-sm">
          {/* ... Header Content ... */}
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
                Select an Asset to view
              </p>
            </div>
          )}
        </div>

        {/* Timeline */}
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
            {/* Timeline Content */}
          </ScrollArea>
        </div>
      </div>

      {/* MODAL: DELETE CONFIRMATION */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-zinc-950 border-[#D2FF44] text-white sm:max-w-md shadow-[0_0_30px_rgba(210,255,68,0.2)]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-[#D2FF44] mb-2">
              <AlertTriangle
                size={24}
                className="fill-current text-black stroke-[#D2FF44]"
              />
              <DialogTitle className="text-xl font-bold text-white">
                Delete Asset?
              </DialogTitle>
            </div>
            <DialogDescription className="text-zinc-400">
              This action cannot be undone. This will permanently delete{" "}
              <span className="text-[#D2FF44] font-bold">
                "{selectedAsset?.name}"
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteModalOpen(false)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-[#D2FF44] hover:bg-[#bce63b] text-black font-bold border border-[#D2FF44]"
            >
              Delete Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDIT NAME */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil size={18} className="text-[#D2FF44]" /> Edit Asset Details
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-zinc-500">
                Asset Name
              </Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-zinc-950 border-zinc-800 focus-visible:ring-[#D2FF44]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsEditModalOpen(false)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameAsset}
              className="bg-[#D2FF44] hover:bg-[#bce63b] text-black font-bold"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
