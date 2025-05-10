import os
import requests
import json

API_KEY = os.getenv("TMDB_API_KEY")  # Retrieve API key from environment variables
OUTPUT_DIR_SHOWS = "meta/shows"
OUTPUT_DIR_MOVIES = "meta/movies"

# Unicode squared letters mapping (A-Z)
SQUARED_LETTERS = {chr(i): chr(0x1F130 + (i - 65)) for i in range(65, 91)}

SHOWS = {
    "Supernatural": 1622,
    "Seinfeld": 1957, "Game of Thrones": 1399, "Band of Brothers": 4613, "House of the Dragon": 94997,
    "Chernobyl": 87108, "The Sopranos": 52814, "The Wire": 1438, "Sherlock": 19885, "The Tudors": 2942,
    "Firefly": 1437, "Spartacus": 46296, "The Pacific": 16997, "Dracula (2020)": 86850, "Dracula": 58928,
    "Gangs of London": 85021, "Broadchurch": 1427, "Rome": 1891, "Deadwood": 1406, "The Last of Us": 100088,
    "The Boys": 76479, "The Witcher": 71912, "Dune: Prophecy": 90228, "The Penguin": 194764, "Da Ali G Show": 4417,
    "The Office": 2996, "True Detective": 46648, "Taboo": 65708, "Dexter": 1405, "Black Sails": 47665,
    "The Night Of": 66276, "The Walking Dead: Daryl Dixon": 211684, "The Walking Dead: Dead City": 194583,
    "The Walking Dead: The Ones Who Live": 206586, "The Fall": 49010, "Copper": 44983, "Mr. Bean": 4327,
    "Blackadder": 7246, "Penny Dreadful": 54671, "The Night Manager": 61859, "Mad Men": 1104, "Tulsa King": 153312,
    "Killing Eve": 72750, "Halo": 52814, "Mayor of Kingstown": 97951, "Weeds": 186, "Luther": 1426, "Time": 126116,
    "Dead Set": 7831, "The Frankenstein Chronicles": 64421, "Outlander": 56570, "Peacemaker": 110492,
    "The Terror": 75191, "Succession": 76331, "Warrior": 73544, "The Couple Next Door": 223438,
    "The White Lotus": 111803
}

MOVIES = {
    "The Avengers": 24428, "The Dark Knight": 155, "Inception": 27205, "Interstellar": 157336,
    "Gladiator": 98, "Titanic": 597, "The Godfather": 238, "Pulp Fiction": 680,
    "Fight Club": 550, "Schindler's List": 424, "The Lord of the Rings: The Fellowship of the Ring": 120,
    "The Lord of the Rings: The Two Towers": 121, "The Lord of the Rings: The Return of the King": 122
}

os.makedirs(OUTPUT_DIR_SHOWS, exist_ok=True)
os.makedirs(OUTPUT_DIR_MOVIES, exist_ok=True)

def get_squared_letter(name):
    words = name.split()
    first_letter = words[1][0].upper() if words[0].lower() == "the" and len(words) > 1 else words[0][0].upper()
    return SQUARED_LETTERS.get(first_letter, "")

def fetch_show_data(show_name, show_id):
    squared_letter = get_squared_letter(show_name)
    base_url = f"https://api.themoviedb.org/3/tv/{show_id}?api_key={API_KEY}&append_to_response=credits"
    
    try:
        response = requests.get(base_url)
        response.raise_for_status()
        data = response.json()

        show_info = {
            "name": show_name,
            "category": f"{squared_letter} {show_name}",
            "info": {
                "poster": f"https://image.tmdb.org/t/p/w220_and_h330_face{data.get('poster_path', '')}",
                "bg": f"https://image.tmdb.org/t/p/w500_and_h282_face{data.get('backdrop_path', '')}",
                "plot": data.get("overview", ""),
                "rating": str(data.get("vote_average", "")),
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
                        "rating": str(ep.get("vote_average", "")),
                        "backdrop": f"https://image.tmdb.org/t/p/w500_and_h282_face{ep.get('still_path', '')}"
                    },
                    "video": "",
                    "drm": "",
                    "drmkey": ""
                }
                season_info["episodes"].append(episode_info)

            show_info["seasons"].append(season_info)

        output_file = os.path.join(OUTPUT_DIR_SHOWS, f"{show_name.lower().replace(' ', '_')}.json")
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(show_info, f, indent=2)

        print(f"Saved: {output_file}")

    except requests.RequestException as e:
        print(f"Error fetching {show_name}: {e}")

def fetch_movie_data(movie_name, movie_id):
    squared_letter = get_squared_letter(movie_name)
    base_url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={API_KEY}&append_to_response=credits,videos"
    
    try:
        response = requests.get(base_url)
        response.raise_for_status()
        data = response.json()

        trailer_key = ""
        for video in data.get("videos", {}).get("results", []):
            if video["type"] == "Trailer" and video["site"] == "YouTube":
                trailer_key = video["key"]
                break

        return {
            "name": movie_name,
            "category": f"{squared_letter} {movie_name}",
            "info": {
                "poster": f"https://image.tmdb.org/t/p/w220_and_h330_face{data.get('poster_path', '')}",
                "bg": f"https://image.tmdb.org/t/p/w500_and_h282_face{data.get('backdrop_path', '')}",
                "plot": data.get("overview", ""),
                "director": [
                    crew["name"] for crew in data.get("credits", {}).get("crew", []) if crew["job"] == "Director"
                ],
                "cast": [actor["name"] for actor in data.get("credits", {}).get("cast", [])[:6]],
                "trailer": trailer_key,
                "rating": str(data.get("vote_average", "")),
                "year": data.get("release_date", "").split("-")[0] if data.get("release_date") else None
            },
            "video": "",
            "drm": "",
            "drmkey": ""
        }

    except requests.RequestException as e:
        print(f"Error fetching {movie_name}: {e}")
        return None

# Fetch TV shows
for name, id in SHOWS.items():
    fetch_show_data(name, id)

# Fetch movies and store in a single JSON file
movies_data = [fetch_movie_data(name, id) for name, id in sorted(MOVIES.items()) if fetch_movie_data(name, id)]
output_file = os.path.join(OUTPUT_DIR_MOVIES, "movies.json")
with open(output_file, "w", encoding="utf-8") as f:
    json.dump({"movies": movies_data}, f, indent=2)

print(f"Saved combined movie data to {output_file}")
