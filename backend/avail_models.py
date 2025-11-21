import google.generativeai as genai
import os

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

print("\nAvailable Gemini Models:\n")

for m in genai.list_models():
    print(m.name, " |  supports generateContent =", "generateContent" in m.supported_generation_methods)
