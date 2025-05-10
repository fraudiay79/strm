import os
import requests
import json

API_KEY = os.getenv("TMDB_API_KEY")  # Retrieve API key from environment variable
TV_ID = 1622  # Supernatural TV ID
TOTAL_SEASONS = 15
OUTPUT_DIR = "meta/shows"

os.makedirs(OUTPUT_DIR, exist_ok=True)  # Ensure the output directory exists

def fetch_show_data():
    if not API_KEY:
        print("Error: TMDB_API_KEY is not set. Please add it to the environment variables.")
        return

    show_info = {
        "name": "Supernatural",
        "category": "🄳 Supernatural",
        "info": {
            "poster": "https://media.themoviedb.org/t/p/w220_and_h330_face/KoYWXbnYuS3b0GyQPkbuexlVK9.jpg",
            "bg": "https://media.themoviedb.org/t/p/w500_and_h282_face/lirPqYLTtd6XZqGn4cS1wiesTq0.jpg",
            "plot": "When they were boys, Sam and Dean Winchester lost their mother to a mysterious and demonic supernatural force...",
            "rating": "8.3",
            "genre": ["drama", "mystery", "sci-fi & fantasy"]
        },
        "seasons": []
    }

    for season in range(1, TOTAL_SEASONS + 1):
        url = f"https://api.themoviedb.org/3/tv/{TV_ID}/season/{season}?api_key={API_KEY}"

        try:
            response = requests.get(url)
            response.raise_for_status()
            season_data = response.json()

            season_info = {
                "season": season,
                "info": {
                    "poster": f"https://image.tmdb.org/t/p/w220_and_h330_face{season_data.get('poster_path', '')}",
                    "bg": f"https://image.tmdb.org/t/p/w500_and_h282_face{season_data.get('backdrop_path', '')}",
                    "plot": season_data.get("overview", ""),
                    "cast": [actor["name"] for actor in season_data.get("credits", {}).get("cast", [])[:2]],
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
                        "director": [],
                        "duration": ep.get("runtime", 0) * 60 if ep.get("runtime") else None,
                        "rating": str(ep.get("vote_average", "")),
                        "backdrop": f"https://image.tmdb.org/t/p/w500_and_h282_face{ep.get('still_path', '')}"
                    },
                    "video": ""
                }
                season_info["episodes"].append(episode_info)

            show_info["seasons"].append(season_info)

        except requests.RequestException as e:
            print(f"Error fetching Season {season}: {e}")

    # Save JSON to file
    output_file = os.path.join(OUTPUT_DIR, "supernatural.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(show_info, f, indent=2)

    print(f"Data saved to {output_file}")

fetch_show_data()
