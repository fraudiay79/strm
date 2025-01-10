const chai = require('chai');
const nock = require('nock');
const { expect } = chai;
const yourModule = require('./yourModule'); // Adjust the path to where your module is located

describe('EPG Parser Module', () => {
  const API_ENDPOINT = 'https://tv-mk-prod.yo-digital.com';
  
  beforeEach(() => {
    nock(API_ENDPOINT)
      .persist()
      .get('/mk-bifrost/epg/channel?natco_code=mk')
      .reply(200, {
        channels: [
          {
            station_id: '19346',
            title: 'Channel 1'
          },
          {
            station_id: '19225',
            title: 'Channel 2'
          },
          {
            station_id: '19103',
            title: 'Channel 3'
          }
        ]
      });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should return the correct channels', async () => {
    const channels = await yourModule.channels();
    expect(channels).to.deep.equal([
      { lang: 'mk', site_id: '19346', name: 'Channel 1' },
      { lang: 'mk', site_id: '19225', name: 'Channel 2' },
      { lang: 'mk', site_id: '19103', name: 'Channel 3' }
    ]);
  });

  it('should parse EPG data correctly', async () => {
    const content = JSON.stringify({
      "next_offset": 18,
      "current_offset": 15,
      "channels": {
        "19346": [
          {
            "program_id": "mkt001_3139303437ThirdParty323238363238303130",
            "series_id": null,
            "season_id": null,
            "season_number": null,
            "season_display_number": ".",
            "episode_name": null,
            "episode_number": null,
            "show_type": "TVShow",
            "description": "ART KINO 3 16:00 09-01-2025",
            "full_description": null,
            "start_time": "2025-01-09T15:00:00Z",
            "end_time": "2025-01-09T19:00:00Z",
            "genres": [],
            "release_year": null,
            "cta": {
              "title": "title",
              "deeplink": "magiotv://details/mkt001_3139303437ThirdParty323238363238303130?startTime=2025-01-09T15:00:00Z&endTime=2025-01-09T19:00:00Z&stationId=19346"
            },
            "ratings": "",
            "is_adult": false,
            "image": null,
            "is_recording_available_content": true,
            "is_catchup_enabled": false,
            "station_id": null,
            "entitlements": {
              "trickplayNPVR": true,
              "trickplayLinear": true,
              "trickplayCatchUp": true,
              "hasTimeshift": true,
              "hasStartOver": true,
              "hasRewind": true
            },
            "media_id": null,
            "listing_guid": null,
            "glf_station_id": "910",
            "glf_program_id": "228628010",
            "catchup_id": "19346_2025-01-09T15:00:00Z_2025-01-09T19:00:00Z",
            "catchup_key": "19346_2025-01-09T15:00:00Z",
            "is_blackout": null,
            "slot_type": "schedule",
            "playback_restrictions": {
              "restrictions": ["cast"]
            },
            "content_flags": ["av", "cx", "dl"],
            "runtime_seconds": null,
            "metadata": null,
            "poster_image_url": null,
            "airing_type": "default"
          }
        ]
      }
    });
    
    const result = await yourModule.parser({ content, channel: { site_id: '19346' }, date: dayjs() });
    expect(result).to.deep.equal([
      {
        title: "ART KINO 3 16:00 09-01-2025",
        description: null,
        subtitle: null,
        season: null,
        episode: null,
        start: dayjs.utc("2025-01-09T15:00:00Z"),
        stop: dayjs.utc("2025-01-09T19:00:00Z"),
        image: null
      }
    ]);
  });
});
