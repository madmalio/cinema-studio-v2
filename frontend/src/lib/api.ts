const API_BASE = "http://localhost:8000";

// --- 1. CONFIG & HEADERS ---

function getHeaders() {
  const headers: Record<string, string> = {};

  if (typeof window !== "undefined") {
    const customUrl = localStorage.getItem("COMFY_API_URL");
    if (customUrl) {
      headers["x-comfy-url"] = customUrl;
    }
  }
  return headers;
}

function getJsonHeaders() {
  return {
    ...getHeaders(),
    "Content-Type": "application/json",
  };
}

// --- 2. TYPES ---

export interface Project {
  id: number;
  name: string;
  description: string;
  aspect_ratio: string;
  created_at: string;
}

export interface Asset {
  id: number;
  project_id: number;
  type: "cast" | "scene" | "prop";
  name: string;
  image_path: string;
  prompt: string;
}

export interface Scene {
  id: number;
  project_id: number;
  name: string;
  description: string;
  shots: Shot[];
}

export interface Shot {
  id: number;
  scene_id: number;
  prompt: string;
  status: "pending" | "ready_for_video" | "complete";
  keyframe_url: string | null;
  video_url: string | null;
  order_index: number;
}

export interface Take {
  id: number;
  shot_id: number;
  video_url: string;
  prompt: string;
  created_at: string;
}

export interface Character {
  id: number;
  name: string;
  description: string;
  face_path: string;
}

// --- 3. PROJECT API (The Missing Piece) ---

export async function getProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/projects`);
  const data = await res.json();
  return data.projects || []; // Backend returns { projects: [...] } or list
}

export async function getProject(id: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/${id}`);
  return res.json();
}

export async function createProject(
  name: string,
  aspectRatio: string,
  description: string = "",
) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify({ name, aspect_ratio: aspectRatio, description }),
  });
  return res.json();
}

export async function deleteProject(id: number) {
  await fetch(`${API_BASE}/projects/${id}`, { method: "DELETE" });
}

// --- 4. ASSET API ---

export async function getProjectAssets(projectId: string): Promise<Asset[]> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/assets`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.assets || [];
}

export async function deleteAsset(assetId: number) {
  await fetch(`${API_BASE}/assets/${assetId}`, { method: "DELETE" });
}

export async function updateAsset(assetId: number, name: string) {
  await fetch(`${API_BASE}/assets/${assetId}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify({ name }),
  });
}

// --- 5. SCENE API ---

export async function getScene(projectId: string): Promise<Scene[]> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/scenes`);
  const data = await res.json();
  return data.scenes || [];
}

export async function createScene(
  projectId: string,
  name: string,
  description: string,
) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/scenes`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify({ name, description }),
  });
  return res.json();
}

export async function reorderScenes(sceneId: number, shotIds: number[]) {
  await fetch(`${API_BASE}/scenes/${sceneId}/reorder`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify({ shot_ids: shotIds }),
  });
}

// --- 6. SHOT & TAKE API ---

export async function createShot(sceneId: number, prompt: string) {
  const res = await fetch(`${API_BASE}/shots`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify({ scene_id: sceneId, prompt }),
  });
  return res.json();
}

export async function updateShot(
  shotId: number,
  data: { keyframe_url?: string; video_url?: string },
) {
  await fetch(`${API_BASE}/shots/${shotId}`, {
    method: "PUT",
    headers: getJsonHeaders(),
    body: JSON.stringify(data),
  });
}

export async function deleteShot(shotId: number) {
  await fetch(`${API_BASE}/shots/${shotId}`, { method: "DELETE" });
}

export async function getShotTakes(shotId: number): Promise<Take[]> {
  const res = await fetch(`${API_BASE}/shots/${shotId}/takes`);
  const data = await res.json();
  return data.takes || [];
}

export async function selectTake(shotId: number, videoUrl: string) {
  await fetch(`${API_BASE}/shots/${shotId}/select_take`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify({ video_url: videoUrl }),
  });
}

export async function deleteTake(takeId: number) {
  await fetch(`${API_BASE}/takes/${takeId}`, { method: "DELETE" });
}

// --- 7. GENERATOR API (Flux + Wan + Dynamic URL) ---

export async function generateAsset(payload: {
  project_id: number;
  type: string;
  name: string;
  prompt: string;
  camera?: string;
  lens?: string;
  focal_length?: string;
  chroma?: boolean;
}) {
  const res = await fetch(`${API_BASE}/generate`, {
    method: "POST",
    headers: getJsonHeaders(), // Includes x-comfy-url
    body: JSON.stringify({
      ...payload,
      camera: payload.camera || "Arri Alexa 35",
      lens: payload.lens || "Cooke S4/i Prime",
      focal_length: payload.focal_length || "50mm",
      chroma_key: payload.chroma || false,
    }),
  });
  return res.json();
}

export async function generateVideo(prompt: string) {
  const res = await fetch(`${API_BASE}/generate/video`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify({ prompt }),
  });
  return res.json();
}

export async function animateShot(
  shotId: number,
  prompt: string,
  style: string,
  cameraMove: string,
) {
  const res = await fetch(`${API_BASE}/shots/${shotId}/animate`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify({ prompt, style, camera_move: cameraMove }),
  });
  return res.json();
}

export async function stitchShot(shotId: number, sourceVideoUrl?: string) {
  const res = await fetch(`${API_BASE}/shots/${shotId}/stitch`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify({ source_video_url: sourceVideoUrl }),
  });
  return res.json();
}

export async function enhancePrompt(
  prompt: string,
  style: string,
  cameraMove: string,
) {
  const res = await fetch(`${API_BASE}/director/enhance`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify({ prompt, style, camera_move: cameraMove }),
  });
  return res.json();
}

// --- 8. CHARACTER API ---

export async function createCharacter(formData: FormData) {
  const res = await fetch(`${API_BASE}/characters`, {
    method: "POST",
    headers: getHeaders(), // No Content-Type (FormData handles it)
    body: formData,
  });
  return res.json();
}

export async function getCharacters(): Promise<Character[]> {
  const res = await fetch(`${API_BASE}/characters`);
  const data = await res.json();
  return data.characters || [];
}
