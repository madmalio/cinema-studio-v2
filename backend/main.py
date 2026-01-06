from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import sqlite3
import os

# --- IMPORTS FROM YOUR ENGINES ---
# 1. The Local Image Engine (Flux on your RTX 3060)
from runpod_client import generate_cinematic_image 

# 2. The Cloud Video Engine (Wan 2.1 on Fal.ai)
from video_engine import generate_video_from_image

app = FastAPI()

# 1. SETUP CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"], # Allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. MOUNT STATIC FOLDER
# This allows the frontend to see your generated images/videos at http://localhost:8000/generated/filename.png
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
    type: str  # "image"
    prompt: str
    camera: str = "Arri Alexa 65"
    lens: str = "Anamorphic"
    focal_length: str = "35mm"

# NEW: Model for Video Requests
class AnimateRequest(BaseModel):
    asset_id: int
    prompt: str

class AssetUpdate(BaseModel):
    name: str

# --- PROJECT ROUTES ---

@app.get("/")
def read_root():
    return {"message": "Cinema Studio Backend v3.0 (Hybrid Local/Cloud)"}

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
    # Ensure assets table exists just in case
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
        # Convert URL to file path
        # Example: http://localhost:8000/generated/abc.png -> generated/abc.png
        image_url = asset['image_path']
        filename = image_url.split("/")[-1] # Gets "abc.png"
        file_path = os.path.join("generated", filename)
        
        # 2. DELETE THE FILE FROM DISK
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

# --- GENERATOR ENGINES ---

# 1. LOCAL IMAGE GENERATION (RTX 3060)
@app.post("/generate")
def generate_asset(request: GenerateRequest):
    print(f"🎨 Received Image Request: {request.prompt}")
    
    try:
        conn = get_db_connection()
        project = conn.execute('SELECT aspect_ratio FROM projects WHERE id = ?', (request.project_id,)).fetchone()
        conn.close()
        
        ratio = project['aspect_ratio'] if project and 'aspect_ratio' in project.keys() else "16:9"

        # Call the Local Engine (runpod_client.py)
        image_path = generate_cinematic_image(
            prompt=request.prompt, 
            aspect_ratio=ratio,
            camera=request.camera,
            lens=request.lens,
            focal_length=request.focal_length
        )
        
        full_image_url = f"http://127.0.0.1:8000{image_path}"
        
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

# 2. CLOUD VIDEO GENERATION (Wan 2.1 via Fal.ai)
@app.post("/animate")
def animate_asset(request: AnimateRequest):
    print(f"🎥 Animation Request for Asset ID: {request.asset_id}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. FIND THE LOCAL IMAGE
    asset = cursor.execute("SELECT * FROM assets WHERE id = ?", (request.asset_id,)).fetchone()
    
    if not asset:
        conn.close()
        raise HTTPException(status_code=404, detail="Asset not found")
        
    # Convert web URL back to local system path for uploading
    full_url = asset['image_path']
    filename = full_url.split("/")[-1]
    local_path = os.path.join("generated", filename)

    if not os.path.exists(local_path):
        conn.close()
        raise HTTPException(status_code=404, detail=f"File not found on disk: {local_path}")

    # 2. GENERATE VIDEO
    try:
        # Call the Cloud Engine (video_engine.py)
        video_web_path = generate_video_from_image(local_path, request.prompt)
        full_video_url = f"http://127.0.0.1:8000{video_web_path}"

        # 3. SAVE TO DB
        # Save as a new "video" asset
        cursor.execute(
            '''
            INSERT INTO assets (project_id, type, name, prompt, image_path)
            VALUES (?, ?, ?, ?, ?)
            ''',
            (asset['project_id'], "video", f"Video of {asset['name']}", request.prompt, full_video_url)
        )
        conn.commit()
        new_id = cursor.lastrowid
        
        return {"success": True, "video_url": full_video_url, "asset_id": new_id}

    except Exception as e:
        print(f"❌ Video Error: {e}")
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)