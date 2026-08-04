import base64


def normalize_image_payload(payload):
    image_base64 = payload.get("imageBase64") or payload.get("image")
    if not image_base64:
        raise ValueError("IMAGE_BASE64_REQUIRED")
    if "," in image_base64 and image_base64.strip().startswith("data:"):
        image_base64 = image_base64.split(",", 1)[1]
    base64.b64decode(image_base64, validate=True)
    return image_base64
