from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import uvicorn

# 1. INITIALIZE THE APP
app = FastAPI()

# 2. SETUP CORS (The "Doorman")
# This allows your Next.js frontend (port 3000) to talk to this backend (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, DELETE, etc.)
    allow_headers=["*"],
)

# 3. DATABASE HELPER
def get_db_connection():
    """Opens a connection to the local SQLite file."""
    conn = sqlite3.connect('studio.db')
    conn.row_factory = sqlite3.Row  # Allows accessing columns by name (row['name'])
    return conn

# 4. DATA MODELS (Pydantic)
# This defines what data we expect when creating a project
class ProjectCreate(BaseModel):
    name: str
    description: str

# ---------------------------------------------------------
# ROUTES (API ENDPOINTS)
# ---------------------------------------------------------

@app.get("/")
def read_root():
    """Health Check: Just to prove the server is running."""
    return {"status": "online", "message": "Cinema Studio AI Backend is running"}

@app.get("/projects")
def get_projects():
    """Fetch all projects from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get projects ordered by newest first
    cursor.execute('SELECT * FROM projects ORDER BY created_at DESC')
    projects = cursor.fetchall()
    
    conn.close()
    return {"projects": projects}

@app.post("/projects")
def create_project(project: ProjectCreate):
    """Create a new project in the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Insert the new project data
    cursor.execute(
        "INSERT INTO projects (name, description) VALUES (?, ?)",
        (project.name, project.description)
    )
    conn.commit()
    
    # Get the ID of the newly created row so we can redirect the user there
    new_id = cursor.lastrowid
    conn.close()
    
    return {"project_id": new_id, "message": "Project created successfully"}

@app.get("/projects/{project_id}")
def get_project(project_id: int):
    """Fetch a single project by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
    project = cursor.fetchone()
    
    conn.close()
    
    if project is None:
        return {"error": "Project not found"}
        
    return dict(project)

class ProjectUpdate(BaseModel):
    name: str
    description: str

@app.delete("/projects/{project_id}")
def delete_project(project_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Enable foreign key support to ensure assets get deleted too (if schema supports it)
    cursor.execute("PRAGMA foreign_keys = ON")
    
    cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    conn.commit()
    conn.close()
    
    return {"message": "Project deleted successfully"}

@app.put("/projects/{project_id}")
def update_project(project_id: int, project: ProjectUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE projects SET name = ?, description = ? WHERE id = ?",
        (project.name, project.description, project_id)
    )
    conn.commit()
    conn.close()
    
    return {"message": "Project updated successfully"}

# ---------------------------------------------------------
# RUNNER
# ---------------------------------------------------------
if __name__ == "__main__":
    # This allows you to run the server with: python main.py
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)