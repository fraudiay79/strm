import os
import requests
import json

API_KEY = os.getenv("TMDB_API_KEY")
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

KIDS_LIST_FILE = os.path.join(SCRIPT_DIR, "test.json")

OUTPUT_DIR_KIDS = os.path.join(SCRIPT_DIR, "test")
os.makedirs(OUTPUT_DIR_KIDS, exist_ok=True)

OUTPUT_FILE = os.path.join(OUTPUT_DIR_KIDS, "test_movies.json")

def load_json_file(file_path):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return {}

    with open(file_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
            return data if isinstance(data, (dict, list)) else {}
        except json.JSONDecodeError:
            print(f"Error: Failed to parse {file_path}.")
            return {}

KIDS = load_json_file(KIDS_LIST_FILE)

SQUARED_LETTERS = {chr(i): chr(0x1F130 + (i - 65)) for i in range(65, 91)}

def get_squared_letter(name):
    words = name.split()
    first_letter = words[1][0].upper() if words[0].lower() in ["the", "a"] and len(words) > 1 else words[0][0].upper()
    return "⛝" if first_letter.isdigit() else SQUARED_LETTERS.get(first_letter, "")

def fetch_movie_data(movie_name, movie_id):
    squared_letter = get_squared_letter(movie_name)
    base_url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={API_KEY}&append_to_response=credits,videos"

    try:
        response = requests.get(base_url)
        response.raise_for_status()
        data = response.json()

        trailer_key = next(
            (video["key"] for video in data.get("videos", {}).get("results", []) if video["type"] == "Trailer" and video["site"] == "YouTube"), 
            ""
        )

        return {
            "name": movie_name,
            "category": f"{squared_letter}",
            "info": {
                "poster": f"https://image.tmdb.org/t/p/w220_and_h330_face{data.get('poster_path', '')}",
                "bg": f"https://image.tmdb.org/t/p/w500_and_h282_face{data.get('backdrop_path', '')}",
                "plot": data.get("overview", ""),
                "director": [crew["name"] for crew in data.get("credits", {}).get("crew", []) if crew["job"] == "Director"],
                "cast": [actor["name"] for actor in data.get("credits", {}).get("cast", [])[:6]],
                "trailer": trailer_key,
                "rating": f"{data.get('vote_average', 0):.1f}",
                "year": data.get("release_date", "").split("-")[0] if data.get("release_date") else None
            },
            "video": "",
            "drm": "clearkey",
            "drmkey": ""
        }

    except requests.RequestException as e:
        print(f"Error fetching {movie_name}: {e}")
        return None

movies_data = [data for name, id in KIDS.items() if (data := fetch_movie_data(name, id))]

# Save the output to a JSON file
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(movies_data, f, indent=2)

print(f"Saved {len(movies_data)} movies to {OUTPUT_FILE}")
