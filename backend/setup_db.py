import sqlite3
import os

# 1. DEFINE THE FILENAME
# This is the name of your "Notebook" file.
DB_NAME = "studio.db"

def create_database():
    # Check if database already exists so we don't overwrite it accidentally
    if os.path.exists(DB_NAME):
        print(f"⚠️  '{DB_NAME}' already exists.")
        response = input("Do you want to delete it and start fresh? (y/n): ")
        if response.lower() != 'y':
            print("Operation cancelled. Existing database kept safe.")
            return
        os.remove(DB_NAME)

    # 2. CONNECT (This creates the file if it doesn't exist)
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    print(f"📂 Created database file: {DB_NAME}")

    # 3. CREATE THE 'PROJECTS' TABLE (The Binders)
    # Storing: ID, Name, Description, and Creation Date
    cursor.execute('''
    CREATE TABLE projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    print("✅ Table 'projects' created.")

    # 4. CREATE THE 'ASSETS' TABLE (The Pages)
    # Storing: ID, Type (Cast/Loc/Prop), Name, Prompt, Image Path, and Project Link
    cursor.execute('''
    CREATE TABLE assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        type TEXT NOT NULL, 
        name TEXT NOT NULL,
        prompt TEXT,
        image_path TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )
    ''')
    print("✅ Table 'assets' created.")

    # 5. ADD SOME DUMMY DATA (Optional)
    # This helps us see something immediately in the app later.
    print("📝 Adding sample data...")
    
    # Create a project
    cursor.execute("INSERT INTO projects (name, description) VALUES (?, ?)", 
                   ("Sci-Fi Short Film", "A cyberpunk detective story."))
    project_id = cursor.lastrowid # Get the ID of the project we just made

    # Create an Asset (Cast)
    cursor.execute('''
        INSERT INTO assets (project_id, type, name, prompt, image_path)
        VALUES (?, ?, ?, ?, ?)
    ''', (project_id, "cast", "Detective Miller", "Gritty detective in rain", "/placeholder.jpg"))

    # 6. SAVE AND CLOSE
    conn.commit()
    conn.close()
    print("🎉 Database setup complete!")

if __name__ == "__main__":
    create_database()