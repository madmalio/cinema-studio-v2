import sqlite3
import os
import shutil
from fastapi import UploadFile
from models import Character

DB_PATH = "studio.db"
FACES_DIR = "assets/faces"

# Ensure the faces directory exists
if not os.path.exists(FACES_DIR):
    os.makedirs(FACES_DIR)

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def add_character(name: str, description: str, face_file: UploadFile) -> Character:
    # 1. Save the Face Image locally
    file_extension = face_file.filename.split(".")[-1]
    safe_filename = f"{name.replace(' ', '_').lower()}_ref.{file_extension}"
    file_path = os.path.join(FACES_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(face_file.file, buffer)

    # 2. Save to SQLite
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO characters (name, description, face_path) VALUES (?, ?, ?)", 
        (name, description, file_path)
    )
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return Character(id=new_id, name=name, description=description, face_path=file_path)

def get_all_characters():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM characters ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_character_by_id(char_id: int):
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
    conn.close()
    if row:
        return dict(row)
    return None