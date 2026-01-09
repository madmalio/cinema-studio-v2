import os
from dotenv import load_dotenv
load_dotenv()
import sqlite3
import cv2 # <--- NEW IMPORT
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# --- IMPORTS ---
from runpod_client import generate_cinematic_image 
from local_video import generate_wan_video 
from director import get_director_prompt 

# CONFIG
OUTPUT_DIR = "generated"

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)
app.mount("/generated", StaticFiles(directory=OUTPUT_DIR), name="generated")

def get_db_connection():
    conn = sqlite3.connect('studio.db')
    conn.row_factory = sqlite3.Row
    return conn

# --- DB INIT ---
def init_db():
    conn = get_db_connection()
    conn.execute('''CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, aspect_ratio TEXT DEFAULT '16:9', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS assets (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, type TEXT, name TEXT, prompt TEXT, image_path TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS scenes (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, name TEXT, description TEXT, order_index INTEGER, FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS shots (id INTEGER PRIMARY KEY AUTOINCREMENT, scene_id INTEGER, prompt TEXT, reference_asset_id INTEGER, status TEXT, keyframe_url TEXT, video_url TEXT, order_index INTEGER, FOREIGN KEY(scene_id) REFERENCES scenes(id) ON DELETE CASCADE)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS takes (id INTEGER PRIMARY KEY AUTOINCREMENT, shot_id INTEGER, video_url TEXT, prompt TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(shot_id) REFERENCES shots(id) ON DELETE CASCADE)''')
    
    try:
        conn.execute("ALTER TABLE scenes ADD COLUMN description TEXT")
    except sqlite3.OperationalError:
        pass
    conn.commit()
    conn.close()

init_db()

# --- MODELS ---
class Project(BaseModel):
    name: str
    description: str
    aspect_ratio: str = "16:9"

class ProjectUpdate(BaseModel):
    name: str
    description: str
    aspect_ratio: str

class GenerateRequest(BaseModel):
    project_id: int
    type: str
    prompt: str
    name: str = "New Asset"
    camera: str = "Arri Alexa 35"
    lens: str = "Anamorphic"
    focal_length: str = "35mm"
    chroma_key: bool = False

class DirectorRequest(BaseModel):
    prompt: str
    style: str = "Cinematic"
    camera_move: str = "Push In"

class ShotAnimateRequest(BaseModel):
    prompt: str
    style: str = "Cinematic"
    camera_move: str = "Push In"

class AssetUpdate(BaseModel):
    name: str

class Scene(BaseModel):
    name: str
    description: str | None = ""

class ShotRequest(BaseModel):
    scene_id: int
    prompt: str
    cast_id: int | None = None
    loc_id: int | None = None

class ShotUpdate(BaseModel):
    keyframe_url: str | None = None
    video_url: str | None = None
    status: str | None = None

class SelectTakeRequest(BaseModel):
    video_url: str

class StitchRequest(BaseModel):
    source_video_url: str | None = None

# --- ROUTES ---
@app.get("/")
def read_root():
    return {"message": "Cinema Studio Backend v7.8 (Stitch Mode Enabled)"}

# ... [KEEP ALL STANDARD PROJECT/SCENE/ASSET ROUTES HERE] ...
# (I am condensing them to save space, but DO NOT DELETE THEM from your file)
@app.get("/projects")
def get_projects():
    conn = get_db_connection()
    projects = conn.execute('SELECT * FROM projects ORDER BY created_at DESC').fetchall()
    conn.close()
    return {"projects": projects}

@app.get("/projects/{project_id}")
def get_project(project_id: int):
    conn = get_db_connection()
    project = conn.execute('SELECT * FROM projects WHERE id = ?', (project_id,)).fetchone()
    conn.close()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return dict(project)

@app.post("/projects")
def create_project(project: Project):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO projects (name, description, aspect_ratio) VALUES (?, ?, ?)', (project.name, project.description, project.aspect_ratio))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {"project_id": new_id, "message": "Project created"}

@app.delete("/projects/{project_id}")
def delete_project(project_id: int):
    conn = get_db_connection()
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    conn.commit()
    conn.close()
    return {"message": "Project deleted"}

@app.put("/projects/{project_id}")
def update_project(project_id: int, project: ProjectUpdate):
    conn = get_db_connection()
    conn.execute("UPDATE projects SET name = ?, description = ?, aspect_ratio = ? WHERE id = ?", (project.name, project.description, project.aspect_ratio, project_id))
    conn.commit()
    conn.close()
    return {"message": "Updated"}

@app.get("/projects/{project_id}/assets")
def get_project_assets(project_id: int):
    conn = get_db_connection()
    assets = conn.execute('SELECT * FROM assets WHERE project_id = ? ORDER BY id DESC', (project_id,)).fetchall()
    conn.close()
    return {"assets": assets}

@app.put("/assets/{asset_id}")
def update_asset(asset_id: int, asset: AssetUpdate):
    conn = get_db_connection()
    conn.execute("UPDATE assets SET name = ? WHERE id = ?", (asset.name, asset_id))
    conn.commit()
    conn.close()
    return {"message": "Asset updated"}

@app.delete("/assets/{asset_id}")
def delete_asset(asset_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    asset = cursor.execute("SELECT image_path FROM assets WHERE id = ?", (asset_id,)).fetchone()
    if asset:
        try:
            os.remove(os.path.join(OUTPUT_DIR, asset['image_path'].split("/")[-1]))
        except: pass
    cursor.execute("DELETE FROM assets WHERE id = ?", (asset_id,))
    conn.commit()
    conn.close()
    return {"message": "Asset deleted"}

@app.get("/projects/{project_id}/scenes")
def get_scenes(project_id: int):
    conn = get_db_connection()
    scenes = conn.execute('SELECT * FROM scenes WHERE project_id = ? ORDER BY order_index ASC', (project_id,)).fetchall()
    results = []
    for scene in scenes:
        shots = conn.execute('SELECT * FROM shots WHERE scene_id = ? ORDER BY order_index ASC', (scene['id'],)).fetchall()
        results.append({**dict(scene), "shots": shots})
    conn.close()
    return {"scenes": results}

@app.post("/projects/{project_id}/scenes")
def create_scene(project_id: int, scene: Scene):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO scenes (project_id, name, description) VALUES (?, ?, ?)', (project_id, scene.name, scene.description))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {"id": new_id, "name": scene.name, "description": scene.description, "shots": []}

@app.post("/shots")
def create_shot(shot: ShotRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO shots (scene_id, prompt, reference_asset_id, status) VALUES (?, ?, ?, "pending")', (shot.scene_id, shot.prompt, shot.cast_id or shot.loc_id))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {"id": new_id, "status": "pending"}

@app.put("/shots/{shot_id}")
def update_shot(shot_id: int, update: ShotUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    if update.keyframe_url:
        cursor.execute("UPDATE shots SET keyframe_url = ?, status = 'ready_for_video' WHERE id = ?", (update.keyframe_url, shot_id))
    if update.video_url:
        cursor.execute("UPDATE shots SET video_url = ?, status = 'complete' WHERE id = ?", (update.video_url, shot_id))
    conn.commit()
    conn.close()
    return {"success": True}

@app.post("/generate")
def generate_asset(request: GenerateRequest):
    try:
        conn = get_db_connection()
        project = conn.execute('SELECT aspect_ratio FROM projects WHERE id = ?', (request.project_id,)).fetchone()
        conn.close()
        ratio = project['aspect_ratio'] if project else "16:9"
        
        final_prompt = request.prompt
        if request.chroma_key:
            final_prompt += ", solid hex code #00FF00 green background, chroma key, flat studio lighting, no shadows on wall, separation from background"

        image_path = generate_cinematic_image(prompt=final_prompt, aspect_ratio=ratio, camera=request.camera, lens=request.lens, focal_length=request.focal_length)
        full_image_url = f"http://127.0.0.1:8000{image_path}"
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO assets (project_id, type, name, prompt, image_path) VALUES (?, ?, ?, ?, ?)', (request.project_id, request.type, request.name, request.prompt, full_image_url))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        return {"success": True, "image_url": full_image_url, "asset_id": new_id}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/shots/{shot_id}/takes")
def get_shot_takes(shot_id: int):
    conn = get_db_connection()
    takes = conn.execute('SELECT * FROM takes WHERE shot_id = ? ORDER BY created_at DESC', (shot_id,)).fetchall()
    conn.close()
    return {"takes": takes}

@app.post("/shots/{shot_id}/select_take")
def select_take(shot_id: int, req: SelectTakeRequest):
    conn = get_db_connection()
    conn.execute("UPDATE shots SET video_url = ? WHERE id = ?", (req.video_url, shot_id))
    conn.commit()
    conn.close()
    return {"success": True}

@app.delete("/takes/{take_id}")
def delete_take(take_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    take = cursor.execute("SELECT video_url FROM takes WHERE id = ?", (take_id,)).fetchone()
    if take and take['video_url']:
        try: os.remove(os.path.join(OUTPUT_DIR, take['video_url'].split("/")[-1]))
        except: pass
    cursor.execute("DELETE FROM takes WHERE id = ?", (take_id,))
    conn.commit()
    conn.close()
    return {"success": True}

@app.post("/director/enhance")
def enhance_prompt_endpoint(request: DirectorRequest):
    try:
        enhanced_text = get_director_prompt(request.prompt, request.style, request.camera_move)
        return {"success": True, "enhanced_prompt": enhanced_text}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/shots/{shot_id}/animate")
def animate_shot_endpoint(shot_id: int, request: ShotAnimateRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    shot = cursor.execute("SELECT * FROM shots WHERE id = ?", (shot_id,)).fetchone()
    if not shot or not shot['keyframe_url']:
        conn.close()
        return {"success": False, "error": "Shot has no keyframe"}
    
    filename = shot['keyframe_url'].split("/")[-1]
    local_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(local_path):
        conn.close()
        return {"success": False, "error": "Source file missing"}
    
    try:
        video_web_path = generate_wan_video(local_image_path=local_path, prompt=request.prompt, style=request.style, camera=request.camera_move)
        full_video_url = f"http://127.0.0.1:8000{video_web_path}"
        cursor.execute("UPDATE shots SET video_url = ?, status = 'complete' WHERE id = ?", (full_video_url, shot_id))
        cursor.execute("INSERT INTO takes (shot_id, video_url, prompt) VALUES (?, ?, ?)", (shot_id, full_video_url, request.prompt))
        conn.commit()
        return {"success": True, "video_url": full_video_url}
    except Exception as e:
        print(f"Sequencer Error: {e}")
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

# --- NEW STITCH ENDPOINT ---
@app.post("/shots/{shot_id}/stitch")
def stitch_shot_endpoint(shot_id: int, request: StitchRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Determine which video to use
    video_url_to_use = request.source_video_url
    
    # If frontend didn't send one, fallback to the Main Shot
    if not video_url_to_use:
        shot = cursor.execute("SELECT * FROM shots WHERE id = ?", (shot_id,)).fetchone()
        if shot and shot['video_url']:
            video_url_to_use = shot['video_url']
    
    # Validate we found a video
    if not video_url_to_use:
        conn.close()
        return {"success": False, "error": "No video selected to stitch from"}
    
    try:
        # Extract Last Frame using OpenCV
        video_filename = video_url_to_use.split("/")[-1]
        local_video_path = os.path.join(OUTPUT_DIR, video_filename)
        
        if not os.path.exists(local_video_path):
             return {"success": False, "error": f"Video file not found: {video_filename}"}

        cap = cv2.VideoCapture(local_video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.set(cv2.CAP_PROP_POS_FRAMES, total_frames - 1)
        ret, frame = cap.read()
        cap.release()
        
        if not ret:
            return {"success": False, "error": "Could not extract last frame"}
            
        # Save as new Image
        # We append a random ID or timestamp to ensure uniqueness if needed, 
        # but here we use the previous shot ID + frame count
        new_filename = f"stitch_from_{shot_id}_{total_frames}.jpg"
        new_file_path = os.path.join(OUTPUT_DIR, new_filename)
        cv2.imwrite(new_file_path, frame)
        new_keyframe_url = f"http://127.0.0.1:8000/generated/{new_filename}"
        
        # Get Scene ID to keep it in the same bucket
        shot_data = cursor.execute("SELECT scene_id FROM shots WHERE id = ?", (shot_id,)).fetchone()
        scene_id = shot_data['scene_id'] if shot_data else 1

        # Create New Shot
        cursor.execute('''
            INSERT INTO shots (scene_id, prompt, keyframe_url, status)
            VALUES (?, ?, ?, 'ready_for_video')
        ''', (scene_id, f"Continuation of Shot #{shot_id}...", new_keyframe_url))
        
        new_shot_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {"success": True, "new_shot_id": new_shot_id}
        
    except Exception as e:
        print(f"Stitch Error: {e}")
        return {"success": False, "error": str(e)}
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)