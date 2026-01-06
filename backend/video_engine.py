import os
import fal_client
import uuid
import requests

# 🔑 SETUP: Ensure your key is set
os.environ["FAL_KEY"] = "1d56b569-fafc-4ee9-9b29-ed52f7c21ad2:17d5da3120464da1a870de2ee77b0571"

def generate_video_from_image(local_image_path, prompt):
    print(f"🚀 Starting Video Generation for: {local_image_path}")

    # 1. UPLOAD (The Toss)
    print("☁️ Uploading image to cloud...")
    url = fal_client.upload_file(local_image_path)
    print(f"✅ Uploaded: {url}")

    # 2. GENERATE (The Spin)
    print(f"🎬 Sending prompt to Wan 2.1: {prompt}")
    handler = fal_client.submit(
        "fal-ai/wan-i2v",  # <--- UPDATED MODEL ID
        arguments={
            "image_url": url,
            "prompt": prompt,
            "aspect_ratio": "16:9", 
            "resolution": "720p"
        }
    )

    # 3. DOWNLOAD (The Catch)
    print("⏳ Waiting for video...")
    result = handler.get()
    
    # Wan 2.1 returns the video in 'video' -> 'url'
    if 'video' in result:
        video_url = result['video']['url']
    else:
        # Fallback in case the API structure changes
        print(f"⚠️ Unexpected result format: {result}")
        raise ValueError("No video URL returned from Fal.ai")
        
    print(f"✨ Video Generated on Cloud: {video_url}")

    # Now we pull it back to your hard drive
    local_filename = f"{uuid.uuid4()}.mp4"
    save_path = os.path.join("generated", local_filename)
    
    print("⬇️ Downloading to local disk...")
    response = requests.get(video_url)
    with open(save_path, 'wb') as f:
        f.write(response.content)
        
    print(f"✅ Saved locally at: {save_path}")
    
    return f"/generated/{local_filename}"