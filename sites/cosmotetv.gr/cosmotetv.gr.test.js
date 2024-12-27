const { parser, url, channels } = require('.cosmotetv.gr.config.js'); // Adjust the path to your module
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const timezone = require('dayjs/plugin/timezone');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

dayjs.extend(utc);
dayjs.extend(customParseFormat);
dayjs.extend(timezone);

jest.mock('axios');

const mockChannelData = {
  "channels": [
    {
      "guid": "XTV100000953",
      "title": "Promo HD",
      "callSign": "promohd",
      "logos": {
        "square": "https://tr.static.cdn.cosmotetvott.gr/ote-prod/channel_logos/promohd-normal.png"
      }
    },
    {
      "guid": "XTV100000954",
      "title": "ΒΟΥΛΗ HD",
      "callSign": "vouli",
      "logos": {
        "square": "https://tr.static.cdn.cosmotetvott.gr/ote-prod/channel_logos/vouli1-normal.png"
      }
    }
  ]
};

const mockEpgData = {
  "channels": [
    {
      "items": [
        {
          "startTime": "2024-12-26T22:00:00+00:00",
          "endTime": "2024-12-26T23:00:00+00:00",
          "title": "Sample Program 1",
          "description": "Description 1",
          "qoe": {
            "genre": "Genre 1"
          },
          "thumbnails": {
            "standard": "https://example.com/image1.jpg"
          }
        },
        {
          "startTime": "2024-12-26T23:00:00+00:00",
          "endTime": "2024-12-27T00:00:00+00:00",
          "title": "Sample Program 2",
          "description": "Description 2",
          "qoe": {
            "genre": "Genre 2"
          },
          "thumbnails": {
            "standard": "https://example.com/image2.jpg"
          }
        }
      ]
    }
  ]
};

describe('cosmotetv.gr module', () => {
  it('can generate valid url', () => {
    const date = dayjs('2024-12-26');
    const channel = { site_id: 'promohd' };
    const generatedUrl = url({ date, channel });
    expect(generatedUrl).toBe('https://mwapi-prod.cosmotetvott.gr/api/v3.4/epg/listings/el?from=1735250400&to=1735336799&callSigns=promohd&endingIncludedInRange=false');
  });

  it('can parse response', () => {
    const content = JSON.stringify(mockEpgData);
    const result = parser({ date: dayjs('2024-12-26'), content });
    expect(result).toMatchObject([
      {
        title: "Sample Program 1",
        description: "Description 1",
        category: "Genre 1",
        image: "https://example.com/image1.jpg",
        start: "2024-12-26T22:00:00.000Z",
        stop: "2024-12-26T23:00:00.000Z"
      },
      {
        title: "Sample Program 2",
        description: "Description 2",
        category: "Genre 2",
        image: "https://example.com/image2.jpg",
        start: "2024-12-26T23:00:00.000Z",
        stop: "2024-12-27T00:00:00.000Z"
      }
    ]);
  });

  it('can fetch channels', async () => {
    axios.get.mockResolvedValue({ data: mockChannelData });
    const result = await channels();
    expect(result).toMatchObject([
      {
        lang: 'el',
        site_id: "promohd",
        name: "Promo HD",
        //logo: "https://tr.static.cdn.cosmotetvott.gr/ote-prod/channel_logos/promohd-normal.png"
      },
      {
        lang: 'el',
        site_id: "vouli",
        name: "ΒΟΥΛΗ HD",
        //logo: "https://tr.static.cdn.cosmotetvott.gr/ote-prod/channel_logos/vouli1-normal.png"
      }
    ]);
  });

  it('handles error in fetching channels', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));
    const result = await channels();
    expect(result).toEqual([]);
  });
});
