const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

module.exports = {
  site: 'primetel.com.cy',
  days: 7,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    headers: {
      'Accept-Encoding': 'gzip, deflate',
      'X-Requested-With': 'XMLHttpRequest'
    }
  },
  url: function ({ date }) {
    const dayOfWeek = date.day() + 1; // Adding 1 because `day()` returns 0-6 for Sun-Sat
    return `https://primetel.com.cy/tv_guide_json/tv${dayOfWeek}.json`;
  },
  parser: function ({ date, content, channel }) {
  const shows = [];
  let data;

  try {
    if (content.trim().length === 0) {
      throw new Error('Empty response content');
    }

    if (!isJSON(content)) {
      throw new Error('Response is not in JSON format');
    }

    data = JSON.parse(content);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return shows; // Return empty shows array if parsing fails
  }

  const channels = Object.values(data);
  channels.forEach(epg => {
    if (epg.id === parseInt(channel.site_id)) {
      epg.pr.forEach(pr => {
        const show = {
          title: pr.title || '',
          start: dayjs.utc(pr.starting).toISOString(),
          stop: dayjs.utc(pr.ending).toISOString(),
          description: pr.description || 'No description available'
        };

        if (pr.description) {
          const seasonEpisodeMatch = pr.description.match(/Season#(\d+)Episode#(\d+)/);
          if (seasonEpisodeMatch) {
            show.episode = `S${seasonEpisodeMatch[1]}E${seasonEpisodeMatch[2]}`;
            show.description = show.description.replace(/Season#\d+Episode#\d+/, '').trim();
          }
          const synopsisMatch = pr.description.match(/.*?Synopsis:/);
          if (synopsisMatch) {
            show.subtitle = pr.description.split('Synopsis:')[0].trim();
            show.description = pr.description.split('Synopsis:')[1].trim();
          }
        }
        shows.push(show);
      });
    }
  });

  return shows;
},
  async channels() {
    const url = `https://primetel.com.cy/tv_guide_json/tv1.json`;
    try {
      const response = await axios.get(url, {
        headers: {
          'Accept-Encoding': 'gzip, deflate',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      const data = response.data;
      const channels = [];

      data.forEach(channel => {
        channels.push({
          lang: 'el',
          name: channel.ch || 'Unknown',
          site_id: channel.id.toString()
        });
      });

      return channels;
    } catch (error) {
      console.error('Error fetching channel data:', error);
      return [];
    }
  }
};

// Helper function to check if content is in JSON format
function isJSON(content) {
  try {
    JSON.parse(content);
    return true;
  } catch (error) {
    return false;
  }
}
