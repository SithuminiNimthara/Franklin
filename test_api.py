import requests
import os

URL = "http://localhost:8001/classify"
IMG_PATH = "d:/FranklinNew/Franklin/Models/Disease_Detection/support_set/healthy/ht1.jpg"

if not os.path.exists(IMG_PATH):
    print(f"Test image not found at {IMG_PATH}")
    # Try to find any jpg in support set
    for root, dirs, files in os.walk("d:/FranklinNew/Franklin/Models/Disease_Detection/support_set"):
        for f in files:
            if f.endswith(".jpg"):
                IMG_PATH = os.path.join(root, f)
                break
        if os.path.exists(IMG_PATH): break

print(f"Testing URL {URL} with image {IMG_PATH}")
try:
    with open(IMG_PATH, "rb") as f:
        files = {"file": f}
        print("Sending request...")
        resp = requests.post(URL, files=files)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
except Exception as e:
    print(f"Test failed: {e}")
