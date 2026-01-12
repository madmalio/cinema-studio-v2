import sqlite3
import os

# CONFIGURATION
DB_NAME = "studio.db"

def create_database():
    # Only run this if you want to wipe/reset. 
    # Otherwise, you can run just the new table creation block in a separate script.
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    print(f"📂 Connected to database: {DB_NAME}")

    # ... [Keep your existing tables: projects, assets, scenes, shots] ...

    # ==========================================
    # NEW TABLE: CHARACTERS (The Identity Engine)
    # ==========================================
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,           -- e.g., "Detective Miller"
        description TEXT,             -- e.g., "Middle aged, mustache, rugged" (The Flux Prompt Base)
        face_path TEXT,               -- e.g., "/assets/faces/miller_crop.jpg" (The ReActor Source)
        voice_id TEXT,                -- Future proofing for TTS
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    print("✅ Table 'characters' check/create complete.")

    conn.commit()
    conn.close()
    print("🎉 Database setup updated.")

if __name__ == "__main__":
    create_database()