import os
import json
from google import genai
from google.genai import types

# Load API key
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

def format_llm_response(text):
    """Attempt to parse the LLM's raw text as JSON, or salvage the data if it responds with raw text or a markdown block."""
    original_text = text
    text = text.strip()
    
    # Very aggressive markdown stripping for Gemini
    if "```json" in text:
        text = text.split("```json")[1]
    if "```" in text:
        text = text.split("```")[0]
        
    text = text.strip()

    try:
        parsed = json.loads(text)
        print("[AI Agent] Successfully parsed JSON response.")
        return parsed
    except json.JSONDecodeError as e:
        print(f"[AI Agent] Failed to parse JSON. Error: {e}")
        print(f"[AI Agent] Raw output from model: {original_text[:200]}...") # Print first 200 chars for debugging
        # Fallback if the LLM didn't return perfect JSON
        return {
            "explanation": "The AI provided a response, but it was not in the expected JSON format. Please try again.",      
            "suggestion": "Failed to parse AI response. Sometimes the model outputs markdown instead of raw JSON.",
            "fixed_code": original_text
        }

def generate_ai_fix(code_snippet, issue_description, language, file_path):      
    prompt = f"""
You are a senior software engineer. Explain the issue, suggest improvements, and provide a corrected version of the code.

File: {file_path}
Language: {language}
Issue: {issue_description}

Original Code:
```{language}
{code_snippet}
```

Return your response strictly in the following JSON format. Do not use markdown code blocks or any other formatting around the JSON.
{{
    "explanation": "A clean, human-readable string explaining why the issue occurs. Do not include markdown code blocks or raw code snippets in this field. Keep it conversational and neat.",
    "suggestion": "A clean, step-by-step human-readable string suggesting how to fix or improve the code. Do not include markdown code blocks or raw code snippets here.",        
    "fixed_code": "The raw fixed source code as a string, with proper newlines and indentation. No markdown code blocks."
}}
"""
    if not GEMINI_API_KEY:
        # MOCK RESPONSE if no key is given
        print("[AI Agent] Warning: GEMINI_API_KEY not found. Returning mock data.")
        return {
            "explanation": f"This is a mocked explanation for the issue: {issue_description}.",
            "suggestion": "Mock suggestion: Review the hardcoded values or complexity.",
            "fixed_code": f"// Mocked fix for {file_path}\n{code_snippet}\n// --- Fixed ---"
        }

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        # Using a reliable model like gemini-2.5-flash
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        print(f"[AI Agent] Received response for {file_path}")
        return format_llm_response(response.text)
    except Exception as e:
        print(f"[AI Agent] Error: {e}")
        return {
            "explanation": f"Error communicating with AI: {str(e)}",
            "suggestion": "Please check backend logs or your API Key.",
            "fixed_code": code_snippet
        }
