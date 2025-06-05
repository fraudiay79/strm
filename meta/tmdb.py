import os
import requests
import json

API_KEY = os.getenv("TMDB_API_KEY")
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

MOVIE_LIST_FILE = os.path.join(SCRIPT_DIR, "movie_list.json")
SHOWS_LIST_FILE = os.path.join(SCRIPT_DIR, "shows_list.json")

OUTPUT_DIR_SHOWS = os.path.join(SCRIPT_DIR, "shows")
OUTPUT_DIR_MOVIES = os.path.join(SCRIPT_DIR, "movies")
COMBINED_FILE = os.path.join(SCRIPT_DIR, "all_media.json")

os.makedirs(OUTPUT_DIR_SHOWS, exist_ok=True)
os.makedirs(OUTPUT_DIR_MOVIES, exist_ok=True)

SQUARED_LETTERS = {chr(i): chr(0x1F130 + (i - 65)) for i in range(65, 91)}

def load_json_file(file_path):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return {}

    with open(file_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
        except json.JSONDecodeError:
            print(f"Error: Failed to parse {file_path}.")
            return {}

SHOWS = load_json_file(SHOWS_LIST_FILE)
MOVIES = load_json_file(MOVIE_LIST_FILE)

def get_squared_letter(name):
    words = name.split()
    first_letter = words[1][0].upper() if words[0].lower() in ["the", "a"] and len(words) > 1 else words[0][0].upper()
    return "⛝" if first_letter.isdigit() else SQUARED_LETTERS.get(first_letter, "")

def fetch_show_data(show_name, show_id):
    squared_letter = get_squared_letter(show_name)
    base_url = f"https://api.themoviedb.org/3/tv/{show_id}?api_key={API_KEY}&append_to_response=credits"

    try:
        response = requests.get(base_url)
        response.raise_for_status()
        data = response.json()

        show_info = {
            "name": show_name,
            "category": f"{squared_letter}",
            "info": {
                "poster": f"https://image.tmdb.org/t/p/w220_and_h330_face{data.get('poster_path', '')}",
                "bg": f"https://image.tmdb.org/t/p/w500_and_h282_face{data.get('backdrop_path', '')}",
                "plot": data.get("overview", ""),
                "rating": f"{data.get('vote_average', 0):.1f}",
                "genre": [genre["name"].lower() for genre in data.get("genres", [])],
                "cast": [actor["name"] for actor in data.get("credits", {}).get("cast", [])[:5]]
            },
            "seasons": []
        }

        return show_info

    except requests.RequestException as e:
        print(f"Error fetching {show_name}: {e}")
        return None

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
            }
        }

    except requests.RequestException as e:
        print(f"Error fetching {movie_name}: {e}")
        return None

shows_data = [fetch_show_data(name, id) for name, id in SHOWS.items() if fetch_show_data(name, id)]
movies_data = [fetch_movie_data(name, id) for name, id in MOVIES.items() if fetch_movie_data(name, id)]

# Save JSON with standard formatting
with open(COMBINED_FILE, "w", encoding="utf-8") as f:
    json.dump(shows_data + movies_data, f, indent=2, ensure_ascii=False)

# Post-process the JSON file to adjust formatting for director and cast
with open(COMBINED_FILE, "r", encoding="utf-8") as f:
    formatted_json = f.read()

# Replace newlines inside director and cast lists
formatted_json = formatted_json.replace('"director": [\n    ', '"director": [')
formatted_json = formatted_json.replace('",\n    "', '","')
formatted_json = formatted_json.replace('\n  ],', '],')

formatted_json = formatted_json.replace('"cast": [\n    ', '"cast": [')
formatted_json = formatted_json.replace('",\n    "', '","')
formatted_json = formatted_json.replace('\n  ],', '],')

# Write the adjusted JSON back to the file
with open(COMBINED_FILE, "w", encoding="utf-8") as f:
    f.write(formatted_json)

print(f"Saved formatted media data to {COMBINED_FILE}")
