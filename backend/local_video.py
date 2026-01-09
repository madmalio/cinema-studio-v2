import json
import random
import time
import uuid
import urllib.request
import urllib.parse
import os

# CONFIG
COMFY_URL = "http://127.0.0.1:8188"
WORKFLOW_FILE = "wan_api.json"
OUTPUT_DIR = "generated"

def queue_prompt(prompt_workflow):
    p = {"prompt": prompt_workflow, "client_id": str(uuid.uuid4())}
    data = json.dumps(p).encode('utf-8')
    req = urllib.request.Request(f"{COMFY_URL}/prompt", data=data)
    return json.loads(urllib.request.urlopen(req).read())

def get_history(prompt_id):
    req = urllib.request.Request(f"{COMFY_URL}/history/{prompt_id}")
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read())

def get_video_file(filename, subfolder, folder_type):
    data = {"filename": filename, "subfolder": subfolder, "type": folder_type}
    url_values = urllib.parse.urlencode(data)
    req = urllib.request.Request(f"{COMFY_URL}/view?{url_values}")
    return urllib.request.urlopen(req).read()

def generate_wan_video(local_image_path, prompt, style="Cinematic", camera="Push In"):
    print(f"🎬 [Local Video] Starting Wan 2.2 render for: {local_image_path}")
    print(f"📝 [Manual Script]: {prompt}") 

    # 2. LOAD WORKFLOW
    if not os.path.exists(WORKFLOW_FILE):
        raise FileNotFoundError(f"Workflow file {WORKFLOW_FILE} not found!")

    with open(WORKFLOW_FILE, "r") as f:
        workflow = json.load(f)

    # 3. INJECT VALUES 
    abs_path = os.path.abspath(local_image_path)
    
    if "10" in workflow:
        workflow["10"]["inputs"]["image"] = abs_path
    
    if "5" in workflow:
        workflow["5"]["inputs"]["text"] = prompt

    # NEGATIVE PROMPT (CRITICAL UPDATE: NO CUTS)
    if "4" in workflow:
        workflow["4"]["inputs"]["text"] = (
            "jump cut, scene change, montage, split screen, multiple angles, "
            "morphing, distortion, text, watermark, bad quality, blurry, jerky movement"
        )

    if "3" in workflow:
        workflow["3"]["inputs"]["seed"] = random.randint(1, 10**14)
        workflow["3"]["inputs"]["cfg"] = 1.0 

    # 4. QUEUE
    print("🚀 [ComfyUI] Queuing task...")
    try:
        response = queue_prompt(workflow)
        prompt_id = response['prompt_id']
    except Exception as e:
        raise ConnectionError(f"Could not connect to ComfyUI at {COMFY_URL}. Is it running?")

    # 5. POLLING
    print(f"⏳ [ComfyUI] Rendering ID: {prompt_id}...")
    while True:
        try:
            history = get_history(prompt_id)
            if prompt_id in history:
                outputs = history[prompt_id]['outputs']
                
                if '8' in outputs:
                    video_data = outputs['8']['gifs'][0]
                    server_filename = video_data['filename']
                    
                    print(f"⬇️ Downloading {server_filename}...")
                    video_bytes = get_video_file(server_filename, video_data['subfolder'], video_data['type'])
                    
                    if not os.path.exists(OUTPUT_DIR):
                        os.makedirs(OUTPUT_DIR)

                    final_name = f"wan_{uuid.uuid4().hex[:8]}.mp4"
                    save_path = os.path.join(OUTPUT_DIR, final_name)
                    
                    with open(save_path, "wb") as f:
                        f.write(video_bytes)
                    
                    print(f"✅ Video Saved: {save_path}")
                    return f"/generated/{final_name}"
        except Exception as e:
            print(f"Polling error: {e}")
            
        time.sleep(2)