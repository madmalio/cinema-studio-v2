import json
import random
import time
import uuid
import urllib.request
import urllib.parse
import urllib.error
import os
import mimetypes

# CONFIG
# COMFY_URL = "http://127.0.0.1:8188"
COMFY_URL = "https://nqkx7k8pdp93jj-8188.proxy.runpod.net"
WORKFLOW_FILE = "wan_api.json"
OUTPUT_DIR = "generated"

# HEADERS: keep matching your working client
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def _raise_http_error_with_body(e: urllib.error.HTTPError, context: str) -> None:
    body = ""
    try:
        body = e.read().decode("utf-8", errors="ignore")
    except Exception:
        body = "<unable to read error body>"
    raise RuntimeError(f"{context}: HTTP {e.code} {e.reason}\n{body}")


def queue_prompt(prompt_workflow):
    """
    POST /prompt with the ComfyUI API prompt JSON.
    """
    payload = {"prompt": prompt_workflow, "client_id": str(uuid.uuid4())}
    data = json.dumps(payload).encode("utf-8")

    headers = dict(HEADERS)
    headers["Content-Type"] = "application/json"

    req = urllib.request.Request(f"{COMFY_URL}/prompt", data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        _raise_http_error_with_body(e, "ComfyUI /prompt failed")


def get_history(prompt_id):
    req = urllib.request.Request(f"{COMFY_URL}/history/{prompt_id}", headers=HEADERS)
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read())


def get_file(filename, subfolder, folder_type):
    data = {"filename": filename, "subfolder": subfolder, "type": folder_type}
    url_values = urllib.parse.urlencode(data)
    req = urllib.request.Request(f"{COMFY_URL}/view?{url_values}", headers=HEADERS)
    with urllib.request.urlopen(req) as response:
        return response.read()


def _multipart_form_data(fields, files, boundary):
    """
    Build multipart/form-data body.

    fields: list of (name, value)
    files: list of (name, filename, content_type, bytes)
    """
    crlf = b"\r\n"
    body = bytearray()

    for (name, value) in fields:
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
        body.extend(str(value).encode())
        body.extend(crlf)

    for (name, filename, content_type, file_bytes) in files:
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(
            f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode()
        )
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode())
        body.extend(file_bytes)
        body.extend(crlf)

    body.extend(f"--{boundary}--\r\n".encode())
    return bytes(body)


def upload_image(local_image_path, subfolder=""):
    """
    Upload a local image to remote ComfyUI so the workflow can reference it by filename.

    ComfyUI commonly supports POST /upload/image with multipart/form-data.
    Response typically includes {"name": "...", "subfolder": "...", ...}
    """
    if not os.path.exists(local_image_path):
        raise FileNotFoundError(f"Image not found: {local_image_path}")

    filename = os.path.basename(local_image_path)
    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

    with open(local_image_path, "rb") as f:
        file_bytes = f.read()

    boundary = f"----ComfyBoundary{uuid.uuid4().hex}"
    fields = [
        ("overwrite", "true"),
        ("subfolder", subfolder),
        ("type", "input"),  # save into ComfyUI/input
    ]
    files = [
        ("image", filename, content_type, file_bytes),
    ]

    body = _multipart_form_data(fields, files, boundary)

    headers = dict(HEADERS)
    headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
    headers["Content-Length"] = str(len(body))

    req = urllib.request.Request(f"{COMFY_URL}/upload/image", data=body, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            try:
                return json.loads(raw)
            except Exception:
                # Some deployments return plain text; fail loudly with the payload
                raise RuntimeError(f"Unexpected upload response (not JSON): {raw[:500]!r}")
    except urllib.error.HTTPError as e:
        _raise_http_error_with_body(e, "ComfyUI /upload/image failed")


def find_first_image_input_node(workflow):
    """
    Try to find a node that likely accepts an image filename input.
    We keep your existing mapping ("10") but add a fallback for different JSONs.
    """
    # Prefer your original node id
    if "10" in workflow and isinstance(workflow["10"], dict):
        inputs = workflow["10"].get("inputs", {})
        if isinstance(inputs, dict) and "image" in inputs:
            return "10"

    # Fallback: search for a node whose inputs include "image"
    for node_id, node in workflow.items():
        if not isinstance(node, dict):
            continue
        inputs = node.get("inputs", {})
        if isinstance(inputs, dict) and "image" in inputs:
            return node_id

    return None


def pick_video_output(outputs):
    """
    Find the first output entry that looks like a video/gif result.
    ComfyUI video nodes often return 'gifs' or 'videos'.
    """
    for node_id, node_output in outputs.items():
        if not isinstance(node_output, dict):
            continue
        if "gifs" in node_output and node_output["gifs"]:
            return node_output["gifs"][0]
        if "videos" in node_output and node_output["videos"]:
            return node_output["videos"][0]
    return None


def generate_wan_video(local_image_path, prompt, style="Cinematic", camera="Push In"):
    print(f"🎬 [Local Video] Starting Wan 2.2 render for: {local_image_path}")
    print(f"📝 [Manual Script]: {prompt}")

    # 1) LOAD WORKFLOW
    if not os.path.exists(WORKFLOW_FILE):
        raise FileNotFoundError(
            f"Workflow file {WORKFLOW_FILE} not found! Please check backend folder."
        )

    with open(WORKFLOW_FILE, "r", encoding="utf-8") as f:
        workflow = json.load(f)

    # Guard: if you accidentally saved the normal workflow export, /prompt will 400
    if isinstance(workflow, dict) and "nodes" in workflow:
        raise ValueError(
            "wan_api.json looks like a normal ComfyUI WORKFLOW export (has 'nodes'). "
            "You need the API PROMPT export (Save/Export as API) for /prompt."
        )

    # 2) UPLOAD LOCAL IMAGE TO REMOTE COMFYUI
    print("⬆️  [ComfyUI] Uploading local image to remote input folder...")
    upload_resp = upload_image(local_image_path)
    uploaded_name = upload_resp.get("name") or upload_resp.get("filename") or os.path.basename(local_image_path)
    uploaded_subfolder = upload_resp.get("subfolder", "")

    # Some ComfyUI setups return name only; node expects just filename (typical).
    # If your workflow expects subfolder too, you'd edit that node accordingly.
    print(f"✅ [ComfyUI] Uploaded as: {uploaded_name} (subfolder='{uploaded_subfolder}')")

    # 3) INJECT VALUES
    image_node_id = find_first_image_input_node(workflow)
    if not image_node_id:
        raise ValueError("❌ Could not find an image input node in wan_api.json (expected an 'inputs.image').")

    workflow[image_node_id]["inputs"]["image"] = uploaded_name

    # Your existing prompt nodes
    if "5" in workflow:
        workflow["5"]["inputs"]["text"] = prompt

    if "4" in workflow:
        workflow["4"]["inputs"]["text"] = (
            "jump cut, scene change, montage, split screen, multiple angles, "
            "morphing, distortion, text, watermark, bad quality, blurry, jerky movement"
        )

    if "3" in workflow:
        workflow["3"]["inputs"]["seed"] = random.randint(1, 10**14)
        workflow["3"]["inputs"]["cfg"] = 1.0

    # 4) QUEUE
    print("🚀 [ComfyUI] Queuing task...")
    try:
        response = queue_prompt(workflow)
        prompt_id = response["prompt_id"]
    except Exception as e:
        print(f"❌ Connection Failed: {e}")
        raise ConnectionError(f"Sequencer Error: Could not connect to ComfyUI at {COMFY_URL}. Error: {e}")

    # 5) POLLING
    print(f"⏳ [ComfyUI] Rendering ID: {prompt_id}...")
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    while True:
        try:
            history = get_history(prompt_id)
            if prompt_id in history:
                outputs = history[prompt_id].get("outputs", {})
                video_item = pick_video_output(outputs)

                # Your original script assumed node '8' => gifs[0]
                # This version supports any node that returns gifs/videos.
                if video_item:
                    server_filename = video_item["filename"]
                    print(f"⬇️ Downloading {server_filename}...")
                    video_bytes = get_file(server_filename, video_item.get("subfolder", ""), video_item.get("type", "output"))

                    # Use server extension if possible
                    _, ext = os.path.splitext(server_filename)
                    if not ext:
                        ext = ".mp4"

                    final_name = f"wan_{uuid.uuid4().hex[:8]}{ext}"
                    save_path = os.path.join(OUTPUT_DIR, final_name)

                    with open(save_path, "wb") as f:
                        f.write(video_bytes)

                    print(f"✅ Video Saved: {save_path}")
                    return f"/generated/{final_name}"

        except Exception as e:
            print(f"Polling error: {e}")

        time.sleep(2)
