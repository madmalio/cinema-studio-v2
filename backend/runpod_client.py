import json
import random
import time
import uuid
import urllib.request
import urllib.parse
import os
import argparse

# CONFIG
OUTPUT_DIR = "generated"

# HEADERS
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# --- 1. THE GEAR TRANSLATOR ---
GEAR_PROMPTS = {
    "Arri Alexa 65": "shot on Arri Alexa 65, large format sensor, 65mm depth of field, high dynamic range, soft highlight roll-off, Arri color science, extremely detailed 8k",
    "Arri Alexa 35": "shot on Arri Alexa 35, Super 35 format, organic film-like texture, cinematic skin tones, wide dynamic range, Reveal Color Science",
    "RED V-Raptor XL": "shot on RED V-Raptor XL, 8k VistaVision, crisp digital sharpness, high contrast, vibrant saturated colors, modern commercial look",
    "Sony Venice 2": "shot on Sony Venice 2, full frame, dual base ISO, clean low light, natural skin tones, smooth highlight rolloff, modern cinematic aesthetic",
    "Panavision DXL2": "shot on Panavision DXL2, large format, warm cinematic feel, Light Iron color science, rich textures",
    "IMAX 70mm Film": "shot on IMAX 15/70mm film, massive resolution, shallow depth of field, organic film grain, incredible detail, epic scale",
    "Kodak Vision3 500T": "shot on Kodak Vision3 500T 5219, tungsten balanced film stock, noticeable grain structure, halation around highlights, rich blacks, nostalgic film look",
    "Kodak Portra 400": "shot on Kodak Portra 400 film, fine grain, warm skin tones, vibrant natural colors, daylight balanced, soft contrast",
    "16mm Bolex": "shot on 16mm Bolex camera, heavy film grain, vintage texture, soft focus edges, retro aesthetic, low fidelity charm",
    
    # --- LENSES ---
    "Panavision C-Series": "Panavision C-Series Anamorphic lens, distinct blue horizontal flares, oval bokeh, barrel distortion, vintage anamorphic character",
    "Cooke Anamorphic /i": "Cooke Anamorphic /i lens, 'The Cooke Look', warm color rendering, smooth focus falloff, painterly bokeh, pleasing skin tones",
    "Atlas Orion": "Atlas Orion Anamorphic lens, silver/blue flares, modern anamorphic look, sharp center, character-rich edges",
    "Cooke S4/i Prime": "Cooke S4/i Prime lens, gentle sharpness, warm contrast, smooth background blur, three-dimensional subject separation",
    "Arri/Zeiss Master Prime": "Arri/Zeiss Master Prime lens, clinically sharp, high contrast, zero distortion, perfect optical performance, clean modern look",
    "Angenieux Optimo": "Angenieux Optimo Zoom lens, cinematic warmth, organic sharpness, creamy bokeh, versatile modern cinema look",
    "Canon K35 Vintage": "Canon K35 Vintage lens (1970s), low contrast, glowing highlights, soft flares, expressive vintage character, slightly warm",
    "Leica Summilux-C": "Leica Summilux-C lens, natural color reproduction, creamy out-of-focus areas, sharp but gentle, humanistic look",
    "Petzval 85 Art": "Lomo Petzval 85 Art lens, extreme swirly bokeh, center sharpness, vignetting, dreamlike quality, distinct 19th-century portrait look",
    "16mm Vintage Look": "vintage 16mm lens, soft corners, chromatic aberration, low contrast, nostalgic feel"
}

def get_gear_prompt(camera_name, lens_name):
    cam_text = GEAR_PROMPTS.get(camera_name, "")
    lens_text = GEAR_PROMPTS.get(lens_name, "")
    combined = []
    if cam_text: combined.append(cam_text)
    if lens_text: combined.append(lens_text)
    return ", ".join(combined)

# --- 2. API FUNCTIONS (Dynamic URL) ---

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

def download_file(url, output_path):
    """Helper to download the image from ComfyUI to local disk"""
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req) as response:
            data = response.read()
            with open(output_path, "wb") as f:
                f.write(data)
        return True
    except Exception as e:
        print(f"Error downloading file: {e}")
        return False

# --- 3. MAIN EXECUTION ---

def generate_cinematic_image(prompt, aspect_ratio, camera, lens, focal_length, chroma, base_url="http://127.0.0.1:8188"):
    # Ensure output directory exists
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    # 1. Load Workflow
    try:
        with open("flux_dev_t5fp16.json", "r") as f:
            workflow = json.load(f)
    except FileNotFoundError:
        print("Error: flux_dev_t5fp16.json not found.")
        return {"error": "Workflow file not found"}

    # 2. Key Nodes (MATCHING YOUR JSON IDs)
    clip_text_node_id = "43"   # CLIP Text Encode
    seed_node_id = "45"        # RandomNoise
    image_size_node_id = "44"  # EmptySD3LatentImage
    save_node_id = "39"        # Save Image

    # 3. Construct Prompt
    tech_specs = get_gear_prompt(camera, lens)
    full_prompt = f"{prompt}, {tech_specs}, {focal_length} focal length"
    if chroma:
        full_prompt += ", green screen background, chroma key, flat lighting, evenly lit"
    else:
        full_prompt += ", cinematic lighting, photorealistic, 8k, detailed texture"

    # 4. Inject
    workflow[clip_text_node_id]["inputs"]["text"] = full_prompt

    if seed_node_id in workflow:
        seed = random.randint(1, 1000000000000)
        workflow[seed_node_id]["inputs"]["noise_seed"] = seed

    # Aspect Ratio
    width, height = 1024, 1024
    if aspect_ratio == "16:9":
        width, height = 1344, 768
    elif aspect_ratio == "2.39:1":
        width, height = 1536, 640 
    elif aspect_ratio == "4:3":
        width, height = 1152, 896

    workflow[image_size_node_id]["inputs"]["width"] = width
    workflow[image_size_node_id]["inputs"]["height"] = height

    if save_node_id in workflow:
        workflow[save_node_id]["inputs"]["filename_prefix"] = "studio_render"

    print(f"🚀 Sending Prompt to {base_url}: {full_prompt[:50]}...")
    
    # 5. Queue
    try:
        response = queue_prompt(workflow, base_url)
    except Exception as e:
        return {"error": f"Connection failed: {e}"}

    prompt_id = response['prompt_id']
    
    # 6. Poll
    while True:
        history = get_history(prompt_id, base_url)
        if prompt_id in history:
            outputs = history[prompt_id]['outputs']
            for node_id in outputs:
                node_output = outputs[node_id]
                if 'images' in node_output:
                    image_info = node_output['images'][0]
                    
                    # Construct Remote URL
                    remote_url = f"{base_url}/view?filename={image_info['filename']}&subfolder={image_info['subfolder']}&type={image_info['type']}"
                    
                    # Generate Local Filename
                    local_filename = f"flux_{uuid.uuid4().hex[:8]}.png"
                    local_path = os.path.join(OUTPUT_DIR, local_filename)
                    
                    print(f"⬇️ Downloading to {local_path}...")
                    
                    # Download and Save
                    if download_file(remote_url, local_path):
                        # Return the LOCAL web path
                        return {"status": "success", "image_url": f"/generated/{local_filename}", "asset_id": prompt_id}
                    else:
                        return {"error": "Failed to save image locally"}
                        
            break
        time.sleep(1)
        
    return {"error": "Timeout"}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", type=str, default="http://127.0.0.1:8188", help="ComfyUI API URL")
    parser.add_argument("--prompt", type=str, required=True)
    parser.add_argument("--ratio", type=str, default="16:9")
    parser.add_argument("--camera", type=str, default="Arri Alexa 35")
    parser.add_argument("--lens", type=str, default="Cooke S4/i Prime")
    
    args = parser.parse_args()
    
    result = generate_cinematic_image(args.prompt, args.ratio, args.camera, args.lens, "50mm", False, args.url)
    print(json.dumps(result))