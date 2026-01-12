const API_BASE = "http://localhost:8000";

// --- TYPES ------------------------------------------------------------------

export interface Project {
  id: number;
  name: string;
  description: string;
  aspect_ratio: string;
  created_at: string;
  thumbnail?: string;
  sceneCount?: number;
}

export interface Character {
  id: number;
  name: string;
  description: string;
  face_path: string;
}

export interface Asset {
  id: number;
  project_id: number;
  type: "cast" | "loc" | "prop";
  name: string;
  prompt: string;
  image_path: string;
}

export interface Scene {
  id: number;
  name: string;
  description: string;
  shots: Shot[];
}

export interface Shot {
  id: number;
  scene_id: number;
  order_index: number;
  prompt: string;
  status: "pending" | "ready" | "animating" | "complete";
  keyframe_url: string | null;
  video_url: string | null;
}

export interface Take {
  id: number;
  shot_id: number;
  video_url: string;
  prompt: string;
  created_at: string;
}

// --- PROJECT ENDPOINTS ------------------------------------------------------

export const getProjects = async (): Promise<Project[]> => {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error("Failed to fetch projects");
  const data = await res.json();
  return data.projects;
};

export const getProject = async (id: string | number): Promise<Project> => {
  const res = await fetch(`${API_BASE}/projects/${id}`);
  if (!res.ok) throw new Error("Project not found");
  return await res.json();
};

export const createProject = async (
  name: string,
  description: string,
  ratio: string
) => {
  const res = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, aspect_ratio: ratio }),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return await res.json();
};

export const updateProject = async (
  id: number,
  name: string,
  description: string,
  ratio: string
) => {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, aspect_ratio: ratio }),
  });
  return await res.json();
};

export const deleteProject = async (id: number) => {
  const res = await fetch(`${API_BASE}/projects/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete project");
  return await res.json();
};

// --- CHARACTER ENDPOINTS (The Identity Engine) ------------------------------

export const getCharacters = async (): Promise<Character[]> => {
  const res = await fetch(`${API_BASE}/characters`);
  if (!res.ok) throw new Error("Failed to fetch characters");
  const data = await res.json();
  return data.characters;
};

export const createCharacter = async (formData: FormData) => {
  const res = await fetch(`${API_BASE}/characters`, {
    method: "POST",
    body: formData, // Browser sets Content-Type to multipart/form-data automatically
  });
  if (!res.ok) throw new Error("Failed to create character");
  return await res.json();
};

export const getFaceImageUrl = (filename: string) => {
  // Helper to resolve the full URL for the frontend image tag
  if (!filename) return "";
  const cleanName = filename.split(/[/\\]/).pop();
  return `${API_BASE}/assets/faces/${cleanName}`;
};

// --- ASSET GENERATION & MANAGEMENT ------------------------------------------

export const getProjectAssets = async (
  projectId: string | number
): Promise<Asset[]> => {
  const res = await fetch(`${API_BASE}/projects/${projectId}/assets`);
  const data = await res.json();
  return data.assets;
};

export const generateAsset = async (payload: {
  project_id: number;
  type: string;
  name: string;
  prompt: string;
  camera?: string;
  lens?: string;
  focal_length?: string;
  chroma_key?: boolean;
}) => {
  const res = await fetch(`${API_BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
};

export const updateAsset = async (assetId: number, name: string) => {
  const res = await fetch(`${API_BASE}/assets/${assetId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to update asset");
  return await res.json();
};

export const deleteAsset = async (assetId: number) => {
  const res = await fetch(`${API_BASE}/assets/${assetId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete asset");
  return await res.json();
};

// --- SCENE & SEQUENCER ENDPOINTS --------------------------------------------

export const getScenes = async (
  projectId: string | number
): Promise<Scene[]> => {
  const res = await fetch(`${API_BASE}/projects/${projectId}/scenes`);
  const data = await res.json();
  return data.scenes;
};

export const createScene = async (
  projectId: string | number,
  name: string,
  description: string
) => {
  const res = await fetch(`${API_BASE}/projects/${projectId}/scenes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  return await res.json();
};

export const playScene = async (sceneId: number) => {
  const res = await fetch(`${API_BASE}/scenes/${sceneId}/play`);
  return await res.json(); // Returns { playlist: [...] }
};

export const reorderSceneShots = async (sceneId: number, shotIds: number[]) => {
  const res = await fetch(`${API_BASE}/scenes/${sceneId}/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shot_ids: shotIds }),
  });
  return await res.json();
};

// --- SHOT & DIRECTOR ENDPOINTS ----------------------------------------------

export const createShot = async (sceneId: number, prompt: string) => {
  const res = await fetch(`${API_BASE}/shots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scene_id: sceneId, prompt }),
  });
  return await res.json();
};

export const updateShot = async (
  shotId: number,
  payload: { keyframe_url?: string; status?: string }
) => {
  const res = await fetch(`${API_BASE}/shots/${shotId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
};

export const deleteShot = async (shotId: number) => {
  const res = await fetch(`${API_BASE}/shots/${shotId}`, { method: "DELETE" });
  return await res.json();
};

export const getTakes = async (shotId: number | string): Promise<Take[]> => {
  const res = await fetch(`${API_BASE}/shots/${shotId}/takes`);
  const data = await res.json();
  return data.takes;
};

// --- VIDEO & AI ACTIONS -----------------------------------------------------

export const enhancePrompt = async (
  prompt: string,
  style: string,
  camera: string
) => {
  const res = await fetch(`${API_BASE}/director/enhance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, style, camera_move: camera }),
  });
  return await res.json();
};

export const renderShot = async (
  shotId: number | string,
  prompt: string,
  style: string,
  camera: string
) => {
  const res = await fetch(`${API_BASE}/shots/${shotId}/animate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, style, camera_move: camera }),
  });
  return await res.json();
};

export const selectTake = async (shotId: number | string, videoUrl: string) => {
  const res = await fetch(`${API_BASE}/shots/${shotId}/select_take`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ video_url: videoUrl }),
  });
  return await res.json();
};

export const stitchTake = async (shotId: number | string, videoUrl: string) => {
  const res = await fetch(`${API_BASE}/shots/${shotId}/stitch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_video_url: videoUrl }),
  });
  return await res.json();
};

export const deleteTake = async (takeId: number) => {
  const res = await fetch(`${API_BASE}/takes/${takeId}`, { method: "DELETE" });
  return await res.json();
};
