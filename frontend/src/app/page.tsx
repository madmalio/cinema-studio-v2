"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Film,
  Clock,
  MoreVertical,
  Clapperboard,
  Loader2,
  Trash2,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
  thumbnail?: string;
  aspectRatio?: string;
  sceneCount?: number;
}

export default function LobbyPage() {
  const router = useRouter();

  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Edit/Delete Target State
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Form State
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [selectedRatio, setSelectedRatio] = useState("16:9");

  // 1. FETCH DATA
  const fetchProjects = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/projects");
      const data = await res.json();
      setProjects(data.projects);
    } catch (error) {
      console.error("Failed to load projects", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // 2. OPEN CREATE MODAL
  const openCreateModal = () => {
    setEditingProject(null);
    setProjectName("");
    setProjectDesc("");
    setIsProjectModalOpen(true);
  };

  // 3. OPEN EDIT MODAL
  const openEditModal = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingProject(project);
    setProjectName(project.name);
    setProjectDesc(project.description);
    setIsProjectModalOpen(true);
  };

  // 4. OPEN DELETE MODAL
  const openDeleteModal = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setIsDeleteModalOpen(true);
  };

  // 5. HANDLE SAVE (Create or Update)
  const handleSaveProject = async () => {
    if (!projectName) return;

    const url = editingProject
      ? `http://127.0.0.1:8000/projects/${editingProject.id}`
      : "http://127.0.0.1:8000/projects";

    const method = editingProject ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          description: projectDesc || "Untitled Genre",
        }),
      });

      if (res.ok) {
        if (!editingProject) {
          const data = await res.json();
          router.push(`/studio/${data.project_id}`);
        } else {
          await fetchProjects();
          setIsProjectModalOpen(false);
        }
      }
    } catch (error) {
      console.error("Failed to save project", error);
    }
  };

  // 6. HANDLE DELETE
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await fetch(`http://127.0.0.1:8000/projects/${projectToDelete.id}`, {
        method: "DELETE",
      });
      await fetchProjects();
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error("Failed to delete project", error);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-[#D2FF44]/30">
      {/* HERO HEADER */}
      <div className="relative h-[40vh] w-full border-b border-zinc-800 flex flex-col justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 z-0" />
        <div className="relative z-10 container mx-auto px-6 flex flex-col items-start gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D2FF44] rounded-lg shadow-[0_0_15px_rgba(210,255,68,0.2)]">
              <Clapperboard className="text-black fill-current" size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-[0.2em] text-zinc-300 uppercase">
              Cinema Studio{" "}
              <span className="text-[#D2FF44] text-xs align-top font-mono">
                v2.0
              </span>
            </h1>
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-white max-w-2xl leading-tight tracking-tight">
            Start your next <br />
            <span className="text-[#D2FF44]">Masterpiece.</span>
          </h2>

          <Button
            onClick={openCreateModal}
            size="lg"
            className="h-12 px-8 text-base font-black rounded-full bg-gradient-to-r from-[#D2FF44] to-[#E7FF86] text-black hover:scale-105 transition-transform shadow-[0_0_20px_rgba(210,255,68,0.3)] border-none"
          >
            <Plus className="mr-2" size={20} /> New Production
          </Button>
        </div>
      </div>

      {/* PROJECTS GRID */}
      <div className="container mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold text-zinc-400 flex items-center gap-2">
            <Clock size={18} /> Recent Projects
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-[#D2FF44]">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                onClick={() => router.push(`/studio/${project.id}`)}
                className="bg-zinc-900 border-zinc-800 overflow-hidden group hover:border-[#D2FF44]/50 transition-all cursor-pointer hover:shadow-2xl hover:shadow-black/50"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-zinc-950">
                  <img
                    src={
                      project.thumbnail ||
                      "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80"
                    }
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60 group-hover:opacity-100"
                  />
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-zinc-300 border border-white/10">
                    {project.aspectRatio || "16:9"}
                  </div>
                </div>

                {/* Info */}
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-zinc-100 text-lg line-clamp-1 group-hover:text-[#D2FF44] transition-colors">
                      {project.name}
                    </h4>

                    {/* MENU DROPDOWN */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="text-zinc-600 hover:text-white p-1 hover:bg-zinc-800 rounded transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-white">
                        <DropdownMenuItem
                          onClick={(e) => openEditModal(e, project)}
                          className="hover:bg-zinc-800 cursor-pointer focus:bg-zinc-800 focus:text-white"
                        >
                          <Pencil size={14} className="mr-2" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => openDeleteModal(e, project)}
                          className="text-red-500 hover:bg-red-900/20 focus:bg-red-900/20 focus:text-red-500 cursor-pointer"
                        >
                          <Trash2 size={14} className="mr-2" /> Delete Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-4 line-clamp-1">
                    {project.description || "Untitled Genre"}
                  </p>

                  <div className="flex items-center justify-between text-xs text-zinc-600 border-t border-zinc-800/50 pt-3 group-hover:border-zinc-700 transition-colors">
                    <span className="flex items-center gap-1.5">
                      <Film size={12} /> {project.sceneCount || 0} Shots
                    </span>
                    <span>
                      {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Create New Card */}
            {!loading && (
              <div
                onClick={openCreateModal}
                className="border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-4 text-zinc-600 hover:text-[#D2FF44] hover:border-[#D2FF44] hover:bg-zinc-900/30 transition-all cursor-pointer h-full min-h-[250px]"
              >
                <Plus size={40} strokeWidth={1} />
                <span className="text-sm font-medium">Create New</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. CREATE / EDIT MODAL */}
      <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md shadow-2xl shadow-black">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Clapperboard size={18} className="text-[#D2FF44]" />
              {editingProject ? "Edit Production" : "New Production"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-zinc-400 text-xs uppercase font-bold tracking-wider"
              >
                Project Name
              </Label>
              <Input
                id="name"
                placeholder="e.g. The Last Starship"
                className="bg-zinc-950 border-zinc-800 focus-visible:ring-[#D2FF44] text-white"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="genre"
                className="text-zinc-400 text-xs uppercase font-bold tracking-wider"
              >
                Genre / Description
              </Label>
              <Input
                id="genre"
                placeholder="e.g. Cyberpunk Noir"
                className="bg-zinc-950 border-zinc-800 focus-visible:ring-[#D2FF44] text-white"
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase font-bold tracking-wider">
                Aspect Ratio
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {["16:9", "2.39:1", "4:3"].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setSelectedRatio(ratio)}
                    className={`px-3 py-2 rounded-md text-sm font-bold border transition-all ${
                      selectedRatio === ratio
                        ? "bg-[#D2FF44] border-[#D2FF44] text-black"
                        : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600"
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsProjectModalOpen(false)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProject}
              className="bg-[#D2FF44] hover:bg-[#bce63b] text-black font-bold"
            >
              {editingProject ? "Save Changes" : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. DELETE CONFIRMATION MODAL - STYLED WITH ACID GREEN */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-zinc-950 border-[#D2FF44] text-white sm:max-w-md shadow-[0_0_30px_rgba(210,255,68,0.2)]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-[#D2FF44] mb-2">
              <AlertTriangle
                size={24}
                className="fill-current text-black stroke-[#D2FF44]"
              />
              <DialogTitle className="text-xl font-bold text-white">
                Delete Project?
              </DialogTitle>
            </div>
            <DialogDescription className="text-zinc-400">
              This action cannot be undone. This will permanently delete{" "}
              <span className="text-[#D2FF44] font-bold">
                "{projectToDelete?.name}"
              </span>{" "}
              and all its data.
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
              onClick={handleDeleteProject}
              className="bg-[#D2FF44] hover:bg-[#bce63b] text-black font-bold border border-[#D2FF44] shadow-[0_0_15px_rgba(210,255,68,0.1)]"
            >
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
