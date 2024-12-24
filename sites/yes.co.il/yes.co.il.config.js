const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const cheerio = require('cheerio');

dayjs.extend(utc);
dayjs.extend(timezone);

module.exports = {
  site: 'yes.co.il',
  timezone: 'UTC',
  maxdays: 7,
  cultureinfo: 'he-IL',
  charset: 'utf-8',
  titlematchfactor: 90,
  episodesystem: 'onscreen',
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    headers: {
      'Accept-Language': 'he-IL',
      'Origin': 'https://www.yes.co.il',
      'Accept-Encoding': 'gzip, deflate, br'
    }
  },
  urldateFormat: 'YYYY-MM-DD',
  url({ channel, date }) {
    const formattedDate = dayjs(date).format(this.urldateFormat);
    return `https://svc.yes.co.il/api/content/broadcast-schedule/channels/${channel.site_id}?date=${formattedDate}&ignorePastItems=true`;
  },
  async parser({ content }) {
    const data = JSON.parse(content);
    const programs = [];
    
    data.items.forEach(item => {
      const start = dayjs(item.starts).toISOString();
      const stop = dayjs(item.ends).toISOString();
      const title = item.title;
      const description = item.description;
      const icon = item.imageUrl;

      programs.push({
        start,
        stop,
        title,
        description,
        icon
      });
    });

    return programs;
  },
  async channels() {
    const response = await axios.get('https://svc.yes.co.il/api/content/broadcast-schedule/channels?page=0&pageSize=200', {
      headers: {
        'Accept-Language': 'he-IL',
        'Origin': 'https://www.yes.co.il',
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });

    const data = response.data;
    const channels = [];

    data.items.forEach(item => {
      channels.push({
        lang: 'he',
        name: item.channelName.replace('|', '’'),
        site_id: item.channelId,
        logo: `https://www.yes.co.il${item.imageUrl}`
      });
    });

    return channels;
  }
};
