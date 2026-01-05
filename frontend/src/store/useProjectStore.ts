import { create } from "zustand";

// 1. Define what a "Project" looks like
export interface Project {
  id: string;
  name: string;
  aspectRatio: string;
  genre: string;
  lastModified: string;
  thumbnail: string; // URL to a placeholder image
  sceneCount: number;
}

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  addProject: (project: Project) => void;
  setActiveProject: (id: string) => void;
}

// 2. Create the Store with MOCK DATA
export const useProjectStore = create<ProjectState>((set) => ({
  activeProjectId: null,
  projects: [
    {
      id: "1",
      name: "Neon Detective",
      aspectRatio: "2.39:1",
      genre: "Cyberpunk",
      lastModified: "2 hours ago",
      thumbnail:
        "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=800&q=80",
      sceneCount: 12,
    },
    {
      id: "2",
      name: "Forest of Whispers",
      aspectRatio: "16:9",
      genre: "Fantasy",
      lastModified: "1 day ago",
      thumbnail:
        "https://images.unsplash.com/photo-1511497584788-876760111969?w=800&q=80",
      sceneCount: 5,
    },
    {
      id: "3",
      name: "Mars Outpost 9",
      aspectRatio: "2.39:1",
      genre: "Sci-Fi",
      lastModified: "3 days ago",
      thumbnail:
        "https://images.unsplash.com/photo-1614728853913-1e221a65d601?w=800&q=80",
      sceneCount: 8,
    },
  ],
  addProject: (project) =>
    set((state) => ({ projects: [project, ...state.projects] })),
  setActiveProject: (id) => set({ activeProjectId: id }),
}));
