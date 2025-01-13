const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

module.exports = {
  site: 'cignalplay.com',
  days: 7, // maxdays=7
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    headers: {
      'Accept-Encoding': 'gzip, deflate, br'
    }
  },
  url({ channel, date }) {
    const start = date.format('YYYY-MM-DD[T]HH:mm:ss[Z]')
    const end = date.add(1, 'day').format('YYYY-MM-DD[T]HH:mm:ss[Z]')
    return `https://live-data-store-cdn.api.pldt.firstlight.ai/content/epg?start=${start}&end=${end}&reg=ph&dt=all&client=pldt-cignal-web&pageNumber=1&pageSize=100`
},
  async parser({ content, channel }) {
    const shows = [];
    let data;

    try {
      if (content.trim().length === 0) {
        throw new Error('Empty response content');
      }
      data = JSON.parse(content);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return shows; // Return empty shows array if parsing fails
    }

    data.forEach(item => {
      if (item.cid === channel.site_id) {
        const show = {
          title: item.lon.n || '',
          startTime: dayjs(item.sc_st_dt).utc().format(),
          endTime: dayjs(item.sc_ed_dt).utc().format(),
          description: item.lod.n || 'No description available',
          category: item.genre || ''
        };
        shows.push(show);
      }
    });

    return shows;
  },
  async channels() {
    const url = 'https://live-data-store-cdn.api.pldt.firstlight.ai/content/epg?start=2023-01-01T00:00:00Z&end=2023-01-02T00:00:00Z&reg=ph&dt=all&client=pldt-cignal-web&pageNumber=1&pageSize=100';
    const response = await axios.get(url, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });

    const data = response.data;
    const channels = [];

    data.forEach(item => {
      channels.push({
        lang: 'en',
        name: item.ch.acs ? item.ch.acs.replace(/_/g, ' ') : 'Unknown',
        site_id: item.cid
      });
    });

    return channels;
  }
};
