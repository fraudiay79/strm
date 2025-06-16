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

def parse_movies_dict(raw_dict):
    parsed = {}
    for name, value in raw_dict.items():
        try:
            movie_id_str, drmkey, video = [v.strip() for v in value.split(",")]
            parsed[name] = {
                "id": int(movie_id_str),
                "drmkey": drmkey,
                "video": video
            }
        except ValueError:
            print(f"Skipping malformed entry: {name} -> {value}")
    return parsed

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
            "category": squared_letter,
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

        for season in range(1, data.get("number_of_seasons", 1) + 1):
            season_url = f"https://api.themoviedb.org/3/tv/{show_id}/season/{season}?api_key={API_KEY}"
            season_response = requests.get(season_url)
            season_response.raise_for_status()
            season_data = season_response.json()

            season_info = {
                "season": season,
                "info": {
                    "poster": f"https://image.tmdb.org/t/p/w220_and_h330_face{season_data.get('poster_path', '')}",
                    "bg": f"https://image.tmdb.org/t/p/w500_and_h282_face{season_data.get('backdrop_path', '')}",
                    "plot": season_data.get("overview", ""),
                    "year": season_data.get("air_date", "").split("-")[0] if season_data.get("air_date") else None,
                    "trailer": ""
                },
                "episodes": []
            }

            for ep in season_data.get("episodes", []):
                episode_info = {
                    "episode": ep.get("episode_number", ""),
                    "name": ep.get("name", ""),
                    "info": {
                        "poster": f"https://image.tmdb.org/t/p/w227_and_h127_bestv2{ep.get('still_path', '')}",
                        "plot": ep.get("overview", ""),
                        "duration": ep.get("runtime", 0) * 60 if ep.get("runtime") else None,
                        "rating": f"{ep.get('vote_average', 0):.1f}",
                        "backdrop": f"https://image.tmdb.org/t/p/w500_and_h282_face{ep.get('still_path', '')}"
                    },
                    "video": "",
                    "drm": "clearkey",
                    "drmkey": ""
                }
                season_info["episodes"].append(episode_info)

            show_info["seasons"].append(season_info)

        return show_info

    except requests.RequestException as e:
        print(f"Error fetching {show_name}: {e}")
        return None

def fetch_movie_data(movie_name, movie_id, movie_video, movie_drmkey):
    squared_letter = get_squared_letter(movie_name)
    base_url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={API_KEY}&append_to_response=credits,videos"

    try:
        response = requests.get(base_url)
        response.raise_for_status()
        data = response.json()

        trailer_key = next(
            (video["key"] for video in data.get("videos", {}).get("results", [])
             if video["type"] == "Trailer" and video["site"] == "YouTube"), 
            ""
        )

        return {
            "name": movie_name,
            "category": squared_letter,
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
            "video": movie_video,
            "drm": "clearkey",
            "drmkey": movie_drmkey
        }

    except requests.RequestException as e:
        print(f"Error fetching {movie_name}: {e}")
        return None

# Load data
SHOWS = load_json_file(SHOWS_LIST_FILE)
RAW_MOVIES = load_json_file(MOVIE_LIST_FILE)
MOVIES = parse_movies_dict(RAW_MOVIES)

# Fetch all data
shows_data = [fetch_show_data(name, id) for name, id in SHOWS.items() if fetch_show_data(name, id)]
movies_data = [
    fetch_movie_data(name, data["id"], data["video"], data["drmkey"]) 
    for name, data in MOVIES.items()
    if fetch_movie_data(name, data["id"], data["video"], data["drmkey"])
]

# Save combined JSON
with open(COMBINED_FILE, "w", encoding="utf-8") as f:
    json.dump(shows_data + movies_data, f, indent=2, separators=(',', ': '))

print(f"Saved combined media data to {COMBINED_FILE}")
