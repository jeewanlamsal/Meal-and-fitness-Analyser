import sys
import json
import os
import PIL.Image
from google import genai   # new SDK — replaces google.generativeai

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print(json.dumps({"error": "GEMINI_API_KEY not set"}))
    sys.exit(1)

# New SDK: client object replaces genai.configure()
client = genai.Client(api_key=API_KEY)

def analyze_meal(image_path):
    if not os.path.exists(image_path):
        print(json.dumps({"error": f"Image not found at {image_path}"}))
        return

    try:
        # Hardcoded model fallback list — same models your key supports
        models_to_try = [
            "gemini-3.8-flash",
            "gemini-3.7-flash",
            "gemini-3.6-flash",
            "gemini-3.5-flash",
            "gemini-flash-latest",
            "gemini-2.5-flash",
        ]

        img = PIL.Image.open(image_path)
        img.thumbnail((800, 800))

        prompt = """
        You are an expert nutritionist and visual analyzer. Analyze this image carefully.
        1. Identify all food items, beverages (e.g., water bottles, juices), and packaged goods.
        2. Read any visible text on packaging to accurately identify the product.
           You have deep knowledge of global and Nepali brands.
        3. Estimate standard portion sizes and aggregate total macros.
           If it is just water, calculate 0 calories.
        4. Visually estimate the total physical weight or volume (e.g., 500ml, 250g).
        5. Return ONLY a valid JSON object — no markdown, no explanation.

        Expected JSON format:
        {
            "detectedItems": ["Water Bottle", "Chia Seeds Box"],
            "totalCalories": 120,
            "totalProtein": 4,
            "totalCarbs": 12,
            "totalFats": 8,
            "estimatedWeight": "500ml"
        }
        """

        response = None
        last_error = ""

        for model_name in models_to_try:
            try:
                # New SDK: client.models.generate_content() replaces GenerativeModel()
                response = client.models.generate_content(
                    model=model_name,
                    contents=[prompt, img]   # PIL Image passes directly
                )
                if response and response.text:
                    break
            except Exception as model_err:
                err_str = str(model_err)
                last_error = err_str
                # Retry on quota, rate limit, or model-not-found errors
                if any(t in err_str for t in ["429", "404", "RESOURCE_EXHAUSTED", "NOT_FOUND"]):
                    continue
                else:
                    raise

        if not response or not response.text:
            print(json.dumps({"error": f"All models failed. Last: {last_error}"}))
            return

        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]

        print(json.dumps(json.loads(raw_text.strip())))

    except Exception as e:
        print(json.dumps({"error": f"API Error: {str(e)}"}))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        analyze_meal(sys.argv[1])
    else:
        print(json.dumps({"error": "No image input provided"}))