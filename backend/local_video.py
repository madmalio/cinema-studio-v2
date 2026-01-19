import json
import random
import time
import uuid
import urllib.request
import urllib.parse
import os

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}
OUTPUT_DIR = "generated"

def queue_prompt(prompt_workflow, base_url):
    p = {"prompt": prompt_workflow, "client_id": str(uuid.uuid4())}
    data = json.dumps(p).encode('utf-8')
    req = urllib.request.Request(f"{base_url}/prompt", data=data, headers=HEADERS)
    return json.loads(urllib.request.urlopen(req).read())

def get_history(prompt_id, base_url):
    req = urllib.request.Request(f"{base_url}/history/{prompt_id}", headers=HEADERS)
    try:
        return json.loads(urllib.request.urlopen(req).read())
    except:
        return {}

def get_file(filename, subfolder, folder_type, base_url):
    params = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": folder_type})
    with urllib.request.urlopen(f"{base_url}/view?{params}") as r:
        return r.read()

def generate_wan_video(prompt, server_url="http://127.0.0.1:8188"):
    try:
        with open("wan_api.json", "r") as f:
            workflow = json.load(f)
    except FileNotFoundError:
        print("Error: wan_api.json not found")
        return None

    # Update Nodes (Check IDs)
    prompt_node = "6" 
    seed_node = "3"

    if prompt_node in workflow:
        workflow[prompt_node]["inputs"]["text"] = prompt
    if seed_node in workflow:
        workflow[seed_node]["inputs"]["seed"] = random.randint(1, 10**14)

    try:
        resp = queue_prompt(workflow, server_url)
        prompt_id = resp['prompt_id']
    except Exception as e:
        print(f"Queue failed: {e}")
        return None

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    while True:
        history = get_history(prompt_id, server_url)
        if prompt_id in history:
            outputs = history[prompt_id].get("outputs", {})
            # Scan for GIF/Video
            video_data = None
            for nid, data in outputs.items():
                if "gifs" in data and data["gifs"]:
                    video_data = data["gifs"][0]
                    break
                # Fallback if your workflow uses 'images' for video save
                if "images" in data and data["images"]:
                    # Check extensions if necessary, or assume last image node is video
                    pass

            if video_data:
                fname = video_data["filename"]
                data = get_file(fname, video_data["subfolder"], video_data["type"], server_url)
                
                # Save locally
                save_name = f"wan_{uuid.uuid4().hex[:6]}.mp4"
                save_path = os.path.join(OUTPUT_DIR, save_name)
                with open(save_path, "wb") as f:
                    f.write(data)
                
                return save_path
            break
        time.sleep(2)
    
    return None