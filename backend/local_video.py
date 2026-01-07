import json
import random
import time
import uuid
import urllib.request
import urllib.parse
import os
import shutil

# CONFIG
COMFY_URL = "http://127.0.0.1:8188"
WORKFLOW_FILE = "svd_workflow.json"
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
    # This downloads the file from ComfyUI's internal folder
    data = {"filename": filename, "subfolder": subfolder, "type": folder_type}
    url_values = urllib.parse.urlencode(data)
    req = urllib.request.Request(f"{COMFY_URL}/view?{url_values}")
    return urllib.request.urlopen(req).read()

def upload_image_to_comfy(local_path):
    # SVD needs the image INSIDE ComfyUI first. We upload it via API.
    with open(local_path, "rb") as f:
        files = {"image": f}
        # We upload to the 'input' folder of ComfyUI
        req = requests.post(f"{COMFY_URL}/upload/image", files=files)
        return req.json() # Returns {'name': 'filename.png', ...}

import requests # Make sure to import this at top

def generate_local_video(local_image_path, prompt=""):
    print(f"🎬 Starting LOCAL SVD Video for: {local_image_path}")

    # 1. Load Workflow
    with open(WORKFLOW_FILE, "r") as f:
        workflow = json.load(f)

    # 2. Upload Image to ComfyUI (Required for SVD)
    # ComfyUI API needs the file to be in its 'input' ecosystem to load it
    print("📤 Sending image to ComfyUI...")
    upload_resp = upload_image_to_comfy(local_image_path)
    server_filename = upload_resp["name"] # The name ComfyUI assigned it

    # 3. Update Workflow Nodes
    # Node 23 is "Load Image"
    workflow["23"]["inputs"]["image"] = server_filename
    
    # Node 27 is KSampler - Randomize Seed
    workflow["27"]["inputs"]["seed"] = random.randint(1, 1000000000)

    # Node 26 is Video Combine - Set Prefix
    unique_prefix = f"svd_{uuid.uuid4().hex[:8]}"
    workflow["26"]["inputs"]["filename_prefix"] = unique_prefix

    # 4. Queue It
    print("🚀 Queuing SVD task...")
    response = queue_prompt(workflow)
    prompt_id = response['prompt_id']

    # 5. Wait for Result
    print(f"⏳ Rendering (This takes 30-60s on RTX 3060)... ID: {prompt_id}")
    while True:
        history = get_history(prompt_id)
        if prompt_id in history:
            outputs = history[prompt_id]['outputs']
            
            # Find the Video Save Node (Node 26)
            if '26' in outputs:
                video_data = outputs['26']['gifs'][0] # VHS output calls them gifs/videos
                server_video_name = video_data['filename']
                
                # Download it back to our App folder
                print(f"⬇️ Downloading {server_video_name}...")
                video_bytes = get_video_file(server_video_name, video_data['subfolder'], video_data['type'])
                
                final_filename = f"{unique_prefix}.mp4"
                save_path = os.path.join(OUTPUT_DIR, final_filename)
                
                with open(save_path, "wb") as f:
                    f.write(video_bytes)
                
                print(f"✅ Saved locally: {save_path}")
                return f"/generated/{final_filename}"
        
        time.sleep(2)