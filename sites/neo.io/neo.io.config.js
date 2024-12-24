const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

module.exports = {
  site: 'neo.io',
  timezone: 'Europe/Ljubljana',
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    headers: {
      'Host': 'stargate.telekom.si',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'nl,en-US;q=0.7,en;q=0.3',
      'Content-Type': 'application/json',
      'X-AppLayout': '1',
      'x-language': 'sl',
      'Origin': 'https://neo.io',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-GPC': '1',
      'Connection': 'keep-alive'
    }
  },
  url({ req, start, end, channel, show }) {
    if (req === '1') {
      return 'https://stargate.telekom.si/api/titan.tv.WebEpg/ZapList';
    } else if (req === '2') {
      return 'https://stargate.telekom.si/api/titan.tv.ContentService/EpgContentDetails';
    } else if (req === '3') {
      return 'https://stargate.telekom.si/api/titan.tv.WebEpg/ZapList';
    } else {
      throw new Error('Invalid request type');
    }
  },
  async parser({ content, req, channel, start, end, show, cookie }) {
    if (req === '1') {
      const postdata = JSON.stringify({ includeRadioStations: true });
      const response = await axios.post(this.url({ req }), postdata, {
        headers: this.request.headers
      });

      const cookie = response.headers['set-cookie'][0].split(';')[0];

      const postdata2 = JSON.stringify({ ch_ext_id: channel, from: start, to: end });
      const response2 = await axios.post('https://stargate.telekom.si/api/titan.tv.WebEpg/GetWebEpgData', postdata2, {
        headers: { ...this.request.headers, 'Cookie': cookie }
      });

      return response2.data;
    } else if (req === '2') {
      const postdata = JSON.stringify({ show_id: show, timeshift: 0 });
      const response = await axios.post(this.url({ req }), postdata, {
        headers: { ...this.request.headers, 'Cookie': cookie }
      });

      return response.data;
    } else if (req === '3') {
      const postdata = JSON.stringify({ includeRadioStations: true });
      const response = await axios.post(this.url({ req }), postdata, {
        headers: this.request.headers
      });

      return response.data;
    } else {
      throw new Error('Invalid request type');
    }
  },
  async channels() {
    const response = await axios.post('https://stargate.telekom.si/api/titan.tv.WebEpg/ZapList', JSON.stringify({ includeRadioStations: true }), {
      headers: this.request.headers
    });

    return response.data.channel.map(channel => ({
      lang: 'sl',
      name: channel.title,
      site_id: channel.id
    }));
  }
};
