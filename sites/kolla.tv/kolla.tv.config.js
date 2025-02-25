const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const axios = require('axios');
const https = require('https')
const httpsAgent = new https.Agent({ rejectUnauthorized: false })

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

module.exports = {
  site: 'kolla.tv',
  days: 7,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    method: 'GET',
    headers: {
      'Accept-Encoding': 'gzip, deflate, br'
    }
  },
  url: function ({ date, channel }) {
    const formattedDate = date.format('YYYYMMDD');
    return `https://www.kolla.tv/api/es/channels/listWithPrograms?page=0&day=${formattedDate}&active=true&channelFriendlyUrl=${channel.site_id}`;
  },
  parser: function ({ content }) {
    let programs = [];
    try {
      const data = JSON.parse(content);
      const items = data.programs || [];
      items.forEach(item => {
        const start = dayjs(item.startTime, 'YYYYMMDDHHmmss').utc().format('YYYY-MM-DDTHH:mm:ssZ');
        const stop = dayjs(item.endTime, 'YYYYMMDDHHmmss').utc().format('YYYY-MM-DDTHH:mm:ssZ');
        programs.push({
          title: item.name,
          description: item.description || 'No description available',
          director: item.director || '',
          actors: item.actor ? item.actor.split(', ') : [],
          episode: item.episodeNumber ? `S${item.seriesNumber}E${item.episodeNumber}` : '',
          country: item.countryCode || '',
          productionDate: item.productionYear || '',
          start,
          stop
        });
      });
    } catch (error) {
      console.error('Error parsing content:', error);
    }
    return programs;
  },
  async channels() {
    const axios = require('axios')
    const data = await axios
      .get(`https://www.kolla.tv/api/es/channels/listWithPrograms?day=0&active=true`)
      .then(r => r.data)
      .catch(console.log)

    return data.content.channels.map(item => {
      return {
        lang: 'sv',
        site_id: item.friendlyUrl,
        name: item.name
      }
    })
  }
}
