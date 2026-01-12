import json
import random
import time
import uuid
import urllib.request
import urllib.parse
import os

# CONFIGURATION
RUNPOD_URL = "http://127.0.0.1:8188" 
# RUNPOD_URL = "https://nqkx7k8pdp93jj-8188.proxy.runpod.net" 
WORKFLOW_FILE = "flux_dev_t5fp16.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# --- 1. THE GEAR TRANSLATOR ---
# This dictionary maps technical names to visual traits the AI understands best.
GEAR_PROMPTS = {
    # --- CAMERAS ---
    "Arri Alexa 65": "shot on Arri Alexa 65, large format sensor, 65mm depth of field, high dynamic range, soft highlight roll-off, Arri color science, extremely detailed 8k",
    "Arri Alexa 35": "shot on Arri Alexa 35, Super 35 format, organic film-like texture, cinematic skin tones, wide dynamic range, Reveal Color Science",
    "RED V-Raptor XL": "shot on RED V-Raptor XL, 8k VistaVision, crisp digital sharpness, high contrast, vibrant saturated colors, modern commercial look",
    "Sony Venice 2": "shot on Sony Venice 2, full frame sensor, clean shadows, true-to-life colors, dual ISO look, smooth gradients",
    "Panavision DXL2": "shot on Panavision DXL2, warm cinematic tones, large format depth, Light Iron color science, hollywood blockbuster aesthetic",
    "IMAX 70mm Film": "shot on IMAX 15/70mm film, massive scale, incredible resolution, fine film grain, deep depth of field, Christopher Nolan style, cinematic epic",
    "Kodak Vision3 500T": "shot on Kodak Vision3 500T film stock, tungsten balanced, distinct halation around lights, rich heavy film grain, vintage warmth, motion picture film look",
    "Kodak Portra 400": "shot on Kodak Portra 400 film, pastel color palette, warm highlights, fine grain, soft contrast, portrait photography aesthetic",
    "16mm Bolex": "shot on 16mm Bolex camera, heavy film grain, soft focus, noticeable vignette, low fidelity, vintage home movie aesthetic, light leaks",

    # --- LENSES ---
    
    # ANAMORPHIC (Aggressive Flare Tuning)
    "Panavision C-Series": "Panavision C-Series Anamorphic lens, distinct blue horizontal lens flare streaking across image, pronounced oval bokeh, barrel distortion, vintage cinematic, wide aspect ratio",
    "Cooke Anamorphic /i": "Cooke Anamorphic /i lens, strong warm horizontal golden flare, painterly oval bokeh, The Cooke Look, soft contrast, cinematic depth",
    "Atlas Orion": "Atlas Orion Anamorphic lens, heavy horizontal blue streak lens flare, JJ Abrams style lens flare, sci-fi aesthetic, cold contrast, bright streak across frame, distinct oval bokeh",

    # SPHERICAL (The "Clean/Vintage" Lenses)
    "Cooke S4/i Prime": "Cooke S4/i Prime lens, spherical, creamy smooth bokeh, warm skin tones, 'Cooke Look', gentle contrast, very natural depth",
    "Arri/Zeiss Master Prime": "Arri/Zeiss Master Prime lens, clinical sharpness, perfect resolution, high contrast, zero distortion, neutral colors, modern high-end commercial look",
    "Angenieux Optimo": "Angenieux Optimo Zoom lens, balanced cinematic contrast, organic sharpness, flattering skin texture, the Hollywood zoom look",
    "Canon K35 Vintage": "Vintage Canon K35 lens, low contrast, glowing highlights, golden warm flares, soft dreamy focus, organic imperfections, 1970s cinema look",
    "Leica Summilux-C": "Leica Summilux-C lens, creamy out-of-focus areas, sharp subject separation, micro-contrast, natural color rendition, f/1.4 shallow depth",

    # SPECIALTY
    "Petzval 85 Art": "Lomography Petzval 85 Art lens, extreme swirly bokeh, center sharpness, heavy vignette, radial blur background, vintage brass lens look, dreamlike distortion"
}

def queue_prompt(prompt_workflow):
    p = {"prompt": prompt_workflow, "client_id": str(uuid.uuid4())}
    data = json.dumps(p).encode('utf-8')
    req = urllib.request.Request(f"{RUNPOD_URL}/prompt", data=data, headers=HEADERS)
    return json.loads(urllib.request.urlopen(req).read())

def get_history(prompt_id):
    req = urllib.request.Request(f"{RUNPOD_URL}/history/{prompt_id}", headers=HEADERS)
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read())

def get_image(filename, subfolder, folder_type):
    data = {"filename": filename, "subfolder": subfolder, "type": folder_type}
    url_values = urllib.parse.urlencode(data)
    req = urllib.request.Request(f"{RUNPOD_URL}/view?{url_values}", headers=HEADERS)
    with urllib.request.urlopen(req) as response:
        return response.read()

def find_node_by_class(workflow, class_type):
    for node_id, node in workflow.items():
        if node.get("class_type") == class_type:
            return node_id
    return None

def generate_cinematic_image(prompt, aspect_ratio="16:9", camera="Arri Alexa 65", lens="Anamorphic", focal_length="35mm"):
    with open(WORKFLOW_FILE, "r") as f:
        workflow = json.load(f)

    text_node_id = find_node_by_class(workflow, "CLIPTextEncode")
    seed_node_id = find_node_by_class(workflow, "RandomNoise")
    image_size_node_id = find_node_by_class(workflow, "EmptySD3LatentImage")
    save_node_id = find_node_by_class(workflow, "SaveImage")

    if not text_node_id:
        raise ValueError("❌ Nodes not found in JSON")

    # --- 2. RETRIEVE "TRANSLATED" PROMPTS ---
    # If the exact gear isn't in our list, we fall back to just using the name.
    camera_desc = GEAR_PROMPTS.get(camera, f"shot on {camera}")
    lens_desc = GEAR_PROMPTS.get(lens, f"{lens} lens")

    # Combine into the Master Prompt
    full_prompt = (
        f"{prompt}. "
        f"Cinematography: {camera_desc}, {lens_desc}, {focal_length} focal length. "
        "Highly detailed, photorealistic, depth of field, color graded, 8k."
    )
    
    workflow[text_node_id]["inputs"]["text"] = full_prompt

    if seed_node_id:
        seed = random.randint(1, 1000000000000)
        workflow[seed_node_id]["inputs"]["noise_seed"] = seed

    # Aspect Ratio Logic
    width, height = 1024, 1024
    if aspect_ratio == "16:9":
        width, height = 1344, 768
    elif aspect_ratio == "2.39:1":
        width, height = 1536, 640 
    elif aspect_ratio == "4:3":
        width, height = 1152, 896

    workflow[image_size_node_id]["inputs"]["width"] = width
    workflow[image_size_node_id]["inputs"]["height"] = height

    if save_node_id:
        workflow[save_node_id]["inputs"]["filename_prefix"] = "temp_api_output"

    print(f"🚀 Sending Prompt: {full_prompt}")
    prompt_id = queue_prompt(workflow)['prompt_id']
    
    while True:
        history = get_history(prompt_id)
        if prompt_id in history:
            outputs = history[prompt_id]['outputs']
            for node_id in outputs:
                node_output = outputs[node_id]
                if 'images' in node_output:
                    image_data = node_output['images'][0]
                    image_bytes = get_image(image_data['filename'], image_data['subfolder'], image_data['type'])
                    
                    output_filename = f"generated/{prompt_id}.png"
                    with open(output_filename, "wb") as f:
                        f.write(image_bytes)
                    
                    return f"/generated/{prompt_id}.png"
        time.sleep(1)