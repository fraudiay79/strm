const { parser, url, channels } = require('./cosmotetv.gr.config.js');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const timezone = require('dayjs/plugin/timezone');
const axios = require('axios');

dayjs.extend(utc);
dayjs.extend(customParseFormat);
dayjs.extend(timezone);

jest.mock('axios');

const date = dayjs.utc('2024-12-26', 'YYYY-MM-DD').startOf('d');
const channel = { site_id: 'vouli', xmltv_id: 'HellenicParliamentTV.gr' };

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

it('can generate valid url', () => {
  const startOfDay = dayjs(date).startOf('day').utc().unix();
  const endOfDay = dayjs(date).endOf('day').utc().unix();
  expect(url({ date, channel })).toBe(`https://mwapi-prod.cosmotetvott.gr/api/v3.4/epg/listings/el?from=${startOfDay}&to=${endOfDay}&callSigns=${channel.site_id}&endingIncludedInRange=false`);
});

it('can parse response', () => {
  const content = JSON.stringify(mockEpgData);
  const result = parser({ date, content }).map(p => {
    p.start = dayjs(p.start).toISOString();
    p.stop = dayjs(p.stop).toISOString();
    return p;
  });

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

it('can handle empty guide', () => {
  const result = parser({ date, channel, content: '{"date":"2024-12-26","categories":[],"channels":[]}' });
  expect(result).toMatchObject([]);
});
