const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(customParseFormat);
dayjs.extend(timezone);

function getBearerToken(req) {
    const authHeader = req?.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7, authHeader.length);
    }
    return null;
}

module.exports = {
  site: 'sportklub.n1info',
  days: 5,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    method: 'GET',
    headers: (req) => {
      const token = getBearerToken(req);
      console.log('Authorization token:', token); // Debugging line
      return {
        'referer': 'https://sportklub.n1info.rs/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Authorization': `Bearer ${token}`,
        'Connection': 'keep-alive',
        'Origin': 'https://sportklub.n1info.rs',
        'Sec-Ch-Ua': '"Not.A/Brand";v="24", "Chromium";v="131", "Google Chrome";v="131"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Mode': 'cors',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Site': 'cross-site'
      };
    }
  },
  url: function ({date, channel}) {
    const startOfDay = dayjs(date).startOf('day').utc().unix();
    const endOfDay = dayjs(date).endOf('day').utc().unix();
    return `https://api-web.ug-be.cdn.united.cloud/v1/public/events/epg?cid=${channel.site_id}&fromTime=${startOfDay}&toTime=${endOfDay}&communityIdentifier=sk_rs&languageId=404`;
  },
  parser: function ({ date, content }) {
    let programs = [];
    const data = JSON.parse(content);
    Object.keys(data).forEach(channelId => {
      const channelItems = data[channelId];
      channelItems.forEach(item => {
        const start = dayjs(item.startTime).utc().toISOString();
        const stop = dayjs(item.endTime).utc().toISOString();
        programs.push({
          title: item.title,
          description: item.shortDescription || 'No description available',
          image: item.images[0]?.path || '',
          start,
          stop
        });
      });
    });
    return programs;
  },
  async channels(req) {
    const axios = require('axios');
    try {
      const response = await axios.get('https://api-web.ug-be.cdn.united.cloud/v2/public/channels?imageSize=S&communityIdentifier=sk_rs&languageId=404', {
        headers: this.request.headers(req)
      });
      const data = response.data;

      if (Array.isArray(data)) {
        return data.map(item => ({
          lang: 'sr',
          site_id: item.id,
          name: item.name
          //logo: item.images.path
        }));
      } else {
        console.error('Unexpected response structure:', data);
        return [];
      }
    } catch (error) {
      console.error('Error fetching channel data:', error);
      return [];
    }
  }
};
