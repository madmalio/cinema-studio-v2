import os
from google import genai

# CONFIG
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
client = None

if GEMINI_API_KEY:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        print("✅ Director Engine: ONLINE")
    except Exception as e:
        print(f"⚠️ Director Engine: OFFLINE ({e})")

def get_director_prompt(user_prompt: str, style: str = "Cinematic", camera: str = "Push In") -> str:
    """
    Translates commands into Wan 2.2 prompts, separating Context (World) from Action (Movement).
    """
    
    # 1. PARSE CONTEXT VS ACTION
    # We look for the [CONTEXT: ...] tag coming from the Stitch/Scene logic
    scene_context = ""
    shot_action = user_prompt

    if "[CONTEXT:" in user_prompt and "]" in user_prompt:
        try:
            # Split "CONTEXT: dark alley] Man walks..." into two parts
            parts = user_prompt.split("]", 1)
            # Clean up the brackets and label
            scene_context = parts[0].replace("[CONTEXT:", "").strip()
            shot_action = parts[1].strip()
        except:
            # Fallback if formatting is weird
            pass

    # 2. THE DICTIONARY (Camera Moves)
    camera_descriptions = {
        "Push In": "Slow dolly in. Forward tracking shot. The camera moves physically closer with a steady, cinematic pace.",
        "Pull Out": "Slow dolly out. Backward tracking shot. The camera retreats smoothly, revealing the environment.",
        "Static": "Tripod shot. The camera is completely locked off and stable.",
        "Handheld": "Handheld documentary style. Subtle organic camera shake and breathing motion.",
        "Pan Right": "Camera truck right. A lateral tracking shot moving parallel to the subject. Smooth, sliding motion.",
        "Pan Left": "Camera truck left. A lateral tracking shot sliding to the left. The background passes by smoothly.",
        "Orbit": "Slow arc shot. The camera gently circles around the subject. A subtle orbital movement showcasing depth.",
        "Tilt Up": "Camera tilts up. A slow vertical scan starting low and revealing the subject upwards.",
        "Tilt Down": "Camera tilts down. A slow vertical scan starting high and lowering the gaze.",
        "Crane Up": "Boom up. The camera physically rises straight up, establishing a higher vantage point.",
        "Crane Down": "Boom down. The camera physically lowers, settling into the scene.",
        "Zoom In": "Smooth optical zoom in. The camera body stays still while the lens magnifies the subject. Background compression increases.",
        "Dutch Angle": "Dutch angle. The camera is tilted on its roll axis, creating a diagonal composition. Uneasy tension.",
        "Low Angle": "Low angle shot. The camera looks up at the subject from a low vantage point, making them appear powerful.",
        "Drone Overhead": "Top-down God's Eye view. The camera looks straight down. Geometric composition.",
        "Drone Orbit": "Large-scale drone orbit. The camera circles the subject from a high angle, capturing the vast environment.",
        "Drone Fly Through": "FPV Drone flight. The camera flies aggressively through the space with high speed and fluidity.",
    }

    # Resolve Motion
    motion_desc = camera_descriptions.get(camera, camera)

    # 3. CONSTRUCT THE INSTRUCTION
    # We now feed the AI two separate pieces of data.
    context_instruction = ""
    if scene_context:
        context_instruction = (
            f"SCENE CONTEXT (THE WORLD - DO NOT CHANGE): {scene_context}\n"
            f"Constraint: You MUST maintain the lighting, weather, and atmosphere described in the CONTEXT.\n"
        )

    system_instruction = (
        f"You are a Prompt Engineer for Wan 2.2 Video AI. \n"
        f"{context_instruction}"
        f"SHOT ACTION (THE SUBJECT/MOVEMENT): {shot_action}\n"
        f"Style: {style}\n"
        f"Required Camera Motion: {motion_desc}\n\n"
        f"TASK: Write a single, vivid paragraph (40-60 words). \n"
        f"CRITICAL RULES:\n"
        f"1. CONTINUITY: If a Context is provided, keep it strictly consistent. Only animate the Action.\n"
        f"2. MOVEMENT: You MUST include the camera description '{motion_desc}' verbatim.\n"
        f"3. SPEED: Describe movement as 'slow', 'measured', or 'cinematic'. Avoid 'rushing'.\n"
        f"4. NO PREAMBLE. Return ONLY the final prompt."
    )

    # 4. FALLBACK
    fallback = f"Continuous single shot. {motion_desc} {user_prompt} in {style} style."

    if not client:
        return fallback

    # 5. GENERATE
    models_to_try = ['gemini-2.0-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash']
    
    for model in models_to_try:
        try:
            response = client.models.generate_content(model=model, contents=system_instruction)
            if response.text:
                cleaned = response.text.strip().replace('"', '')
                print(f"🧠 [Director]: {cleaned}")
                return cleaned
        except Exception:
            continue

    return fallback