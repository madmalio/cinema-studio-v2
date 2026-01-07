from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import sqlite3
import os

# --- IMPORTS FROM YOUR ENGINES ---
# 1. The Local Image Engine (Flux on your RTX 3060)
from runpod_client import generate_cinematic_image 

# 2. The Local Video Engine (SVD on your RTX 3060)
# WE SWAPPED THIS: using local_video instead of video_engine to save money
from local_video import generate_local_video

app = FastAPI()

# 1. SETUP CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. MOUNT STATIC FOLDER
if not os.path.exists("generated"):
    os.makedirs("generated")
app.mount("/generated", StaticFiles(directory="generated"), name="generated")

# 3. DATABASE HELPER
def get_db_connection():
    conn = sqlite3.connect('studio.db')
    conn.row_factory = sqlite3.Row
    return conn

# --- DATA MODELS ---

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
    type: str  # "cast", "loc", "prop", or "shot"
    prompt: str
    camera: str = "Arri Alexa 35"
    lens: str = "Anamorphic"
    focal_length: str = "35mm"

class AnimateRequest(BaseModel):
    asset_id: int
    prompt: str

class AssetUpdate(BaseModel):
    name: str

# NEW: Scene & Shot Models
class Scene(BaseModel):
    name: str

class ShotRequest(BaseModel):
    scene_id: int
    prompt: str
    cast_id: int | None = None
    loc_id: int | None = None

class ShotUpdate(BaseModel):
    keyframe_url: str | None = None
    video_url: str | None = None
    status: str | None = None

# --- PROJECT ROUTES ---

@app.get("/")
def read_root():
    return {"message": "Cinema Studio Backend v4.0 (Scene Builder Edition)"}

@app.get("/projects")
def get_projects():
    conn = get_db_connection()
    # Ensure table exists
    conn.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            name TEXT, 
            description TEXT,
            aspect_ratio TEXT DEFAULT '16:9', 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
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
    
    # Ensure tables exist
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            name TEXT, 
            description TEXT,
            aspect_ratio TEXT DEFAULT '16:9', 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            type TEXT,
            name TEXT,
            prompt TEXT,
            image_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
    ''')
    
    cursor.execute('INSERT INTO projects (name, description, aspect_ratio) VALUES (?, ?, ?)', 
                   (project.name, project.description, project.aspect_ratio))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {"project_id": new_id, "message": "Project created"}

@app.delete("/projects/{project_id}")
def delete_project(project_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    conn.commit()
    conn.close()
    return {"message": "Project deleted"}

@app.put("/projects/{project_id}")
def update_project(project_id: int, project: ProjectUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE projects SET name = ?, description = ?, aspect_ratio = ? WHERE id = ?",
                   (project.name, project.description, project.aspect_ratio, project_id))
    conn.commit()
    conn.close()
    return {"message": "Updated"}

# --- ASSET ROUTES ---

@app.get("/projects/{project_id}/assets")
def get_project_assets(project_id: int):
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            type TEXT,
            name TEXT,
            prompt TEXT,
            image_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
    ''')
    assets = conn.execute('SELECT * FROM assets WHERE project_id = ? ORDER BY id DESC', (project_id,)).fetchall()
    conn.close()
    return {"assets": assets}

@app.put("/assets/{asset_id}")
def update_asset(asset_id: int, asset: AssetUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE assets SET name = ? WHERE id = ?", (asset.name, asset_id))
    conn.commit()
    conn.close()
    return {"message": "Asset updated"}

@app.delete("/assets/{asset_id}")
def delete_asset(asset_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. FIND THE FILE TO DELETE
    asset = cursor.execute("SELECT image_path FROM assets WHERE id = ?", (asset_id,)).fetchone()
    
    if asset:
        image_url = asset['image_path']
        filename = image_url.split("/")[-1]
        file_path = os.path.join("generated", filename)
        
        # 2. DELETE FROM DISK
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"🗑️ Deleted file: {file_path}")
            except Exception as e:
                print(f"⚠️ Failed to delete file: {e}")

    # 3. DELETE FROM DB
    cursor.execute("DELETE FROM assets WHERE id = ?", (asset_id,))
    conn.commit()
    conn.close()
    return {"message": "Asset deleted"}

# --- SCENE & SHOT ROUTES (THE STORYBOARD) ---

@app.get("/projects/{project_id}/scenes")
def get_scenes(project_id: int):
    conn = get_db_connection()
    # Ensure tables exist
    conn.execute('''CREATE TABLE IF NOT EXISTS scenes (
        id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, name TEXT, order_index INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.execute('''CREATE TABLE IF NOT EXISTS shots (
        id INTEGER PRIMARY KEY AUTOINCREMENT, scene_id INTEGER, prompt TEXT, reference_asset_id INTEGER, keyframe_url TEXT, video_url TEXT, status TEXT DEFAULT 'pending', order_index INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(scene_id) REFERENCES scenes(id) ON DELETE CASCADE
    )''')
    
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
    cursor.execute('INSERT INTO scenes (project_id, name) VALUES (?, ?)', (project_id, scene.name))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {"id": new_id, "name": scene.name, "shots": []}

@app.delete("/scenes/{scene_id}")
def delete_scene(scene_id: int):
    conn = get_db_connection()
    conn.execute("DELETE FROM scenes WHERE id = ?", (scene_id,))
    conn.commit()
    conn.close()
    return {"message": "Scene deleted"}

@app.post("/shots")
def create_shot(shot: ShotRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    # Create an empty slot in the timeline
    cursor.execute('''
        INSERT INTO shots (scene_id, prompt, reference_asset_id, status)
        VALUES (?, ?, ?, 'pending')
    ''', (shot.scene_id, shot.prompt, shot.cast_id or shot.loc_id))
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

# --- GENERATOR ENGINES ---

# 1. LOCAL IMAGE GENERATION (FLUX)
@app.post("/generate")
def generate_asset(request: GenerateRequest):
    print(f"🎨 Received Image Request: {request.prompt}")
    
    try:
        conn = get_db_connection()
        project = conn.execute('SELECT aspect_ratio FROM projects WHERE id = ?', (request.project_id,)).fetchone()
        conn.close()
        
        ratio = project['aspect_ratio'] if project and 'aspect_ratio' in project.keys() else "16:9"

        # Call Local Flux Engine
        image_path = generate_cinematic_image(
            prompt=request.prompt, 
            aspect_ratio=ratio,
            camera=request.camera,
            lens=request.lens,
            focal_length=request.focal_length
        )
        
        full_image_url = f"http://127.0.0.1:8000{image_path}"
        
        # We record it in Assets table even if it's for a shot (good for history)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            '''
            INSERT INTO assets (project_id, type, name, prompt, image_path)
            VALUES (?, ?, ?, ?, ?)
            ''',
            (request.project_id, request.type, "New Generation", request.prompt, full_image_url)
        )
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        
        return {"success": True, "image_url": full_image_url, "asset_id": new_id}

    except Exception as e:
        print(f"❌ Image Generation Error: {e}")
        return {"success": False, "error": str(e)}

# 2. ASSET ANIMATION (LOCAL SVD)
# Used by the "Animate" button in Asset Library
@app.post("/animate")
def animate_asset(request: AnimateRequest):
    print(f"🎥 Animation Request for Asset ID: {request.asset_id}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if we got a real ID or a dummy ID (like from SceneBoard hacks)
    if request.asset_id == 99999 and request.prompt.startswith("generated/"):
        # Handle direct path (SceneBoard quick fix)
        local_path = request.prompt
        # Fake asset obj for DB insert later
        asset = {'project_id': 1, 'name': 'Scene Shot'} 
    else:
        # Standard lookup
        asset = cursor.execute("SELECT * FROM assets WHERE id = ?", (request.asset_id,)).fetchone()
        if not asset:
            conn.close()
            raise HTTPException(status_code=404, detail="Asset not found")
            
        full_url = asset['image_path']
        filename = full_url.split("/")[-1]
        local_path = os.path.join("generated", filename)

    if not os.path.exists(local_path):
        conn.close()
        raise HTTPException(status_code=404, detail=f"File not found on disk: {local_path}")

    # GENERATE VIDEO LOCALLY
    try:
        video_web_path = generate_local_video(local_path)
        full_video_url = f"http://127.0.0.1:8000{video_web_path}"

        # Save as a new "video" asset
        cursor.execute(
            '''
            INSERT INTO assets (project_id, type, name, prompt, image_path)
            VALUES (?, ?, ?, ?, ?)
            ''',
            (asset['project_id'], "video", f"Video of {asset['name']}", "SVD Animation", full_video_url)
        )
        conn.commit()
        new_id = cursor.lastrowid
        
        return {"success": True, "video_url": full_video_url, "asset_id": new_id}

    except Exception as e:
        print(f"❌ Video Error: {e}")
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

# 3. SHOT ANIMATION (LOCAL SVD)
# Used by the Scene Board "Animate" button
@app.post("/shots/{shot_id}/animate")
def animate_shot_endpoint(shot_id: int):
    print(f"🎬 Animating Shot ID: {shot_id}")
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Get the Shot
    shot = cursor.execute("SELECT * FROM shots WHERE id = ?", (shot_id,)).fetchone()
    if not shot or not shot['keyframe_url']:
        conn.close()
        return {"success": False, "error": "No keyframe found to animate"}

    # 2. Get Local Path
    filename = shot['keyframe_url'].split("/")[-1]
    local_path = os.path.join("generated", filename)
    
    if not os.path.exists(local_path):
        conn.close()
        return {"success": False, "error": "Source image missing from disk"}
    
    # 3. Run Local Engine
    try:
        video_web_path = generate_local_video(local_path)
        full_video_url = f"http://127.0.0.1:8000{video_web_path}"
        
        # 4. Update Shot Record
        cursor.execute("UPDATE shots SET video_url = ?, status = 'complete' WHERE id = ?", (full_video_url, shot_id))
        conn.commit()
        
        return {"success": True, "video_url": full_video_url}
        
    except Exception as e:
        print(f"Animation Error: {e}")
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)