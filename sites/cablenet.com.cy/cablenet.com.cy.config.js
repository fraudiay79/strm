const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

module.exports = {
  site: 'cablenet.com.cy',
  days: 6,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ date }) {
    return `https://cablenet.com.cy/wp-content/plugins/tv-guide-plugin/data/epg${date.format('YYYY-MM-DD')}.json`;
  },
  parser: function ({ content }) {
    const parsedData = JSON.parse(content);
    const programs = [];

    Object.keys(parsedData).forEach(id => {
      const channel = parsedData[id];
      if (channel.pr) {
        channel.pr.forEach(item => {
          const program = {
            title: item.ti,
            start: parseDateTime(item.df),
            stop: parseDateTime(item.dt),
            description: item.sd || item.ld
          };
          programs.push(program);
        });
      }
    });

    return programs;
  },
  async channels() {
    const data = await axios
      .get(`https://cablenet.com.cy/wp-content/plugins/tv-guide-plugin/data/epg2024-12-05.json`)
      .then(r => r.data)
      .catch(console.error);

    const channelData = Object.keys(data).map(channelId => ({
      lang: 'el',
      name: data[channelId].ch,
      site_id: data[channelId].id
    }));

    return channelData;
  }
};

function parseDateTime(dateTime) {
  return dayjs(dateTime, 'YYYYMMDDHHmmss').format('YYYY-MM-DDTHH:mm:ssZ');
}
