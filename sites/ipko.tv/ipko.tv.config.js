const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const fetch = require('node-fetch');
const { upperCase } = require('lodash');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

module.exports = {
  site: 'ipko.tv',
  timezone: 'Europe/Belgrade',
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    headers: {
      'Host': 'stargate.ipko.tv',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'nl,en-US;q=0.7,en;q=0.3',
      'Content-Type': 'application/json',
      'X-AppLayout': '1',
      'x-language': 'sq',
      'Origin': 'https://ipko.tv',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-GPC': '1',
      'Connection': 'keep-alive'
    }
  },
  url(channel, start, end) {
    const url = "https://stargate.ipko.tv/api/titan.tv.WebEpg/GetWebEpgData";
    const postdata = JSON.stringify({
      ch_ext_id: channel,
      from: start,
      to: end
    });
    return { url, postdata };
  },
  parseEpg(data) {
    const epg = {
      days: [],
      channels: []
    };

    // Parse days
    data.days.forEach(day => {
      epg.days.push({
        start: day.start,
        end: day.end,
        dayString: day.day_string
      });
    });

    // Parse channels
    data.channels.forEach(channel => {
      const parsedChannel = {
        channelId: channel.channel_id,
        channelLogo: channel.channel_logo,
        channelName: channel.channel_name,
        shows: []
      };

      // Parse shows for each channel
      channel.shows.forEach(show => {
        parsedChannel.shows.push({
          title: show.title,
          showStart: show.show_start,
          showEnd: show.show_end,
          timestamp: show.timestamp,
          showId: show.show_id,
          thumbnail: show.thumbnail,
          category: show.category,
          genre: show.genre,
          channelId: show.channel_id,
          isAdult: show.is_adult,
          isLive: show.is_live,
          year: show.year,
          pg: show.pg,
          hasMore: show.has_more,
          originalTitle: show.original_title,
          uniqueId: show.unique_id
        });
      });

      epg.channels.push(parsedChannel);
    });

    return epg;
  },
  async channels() {
    const response = await axios.post('https://stargate.ipko.tv/api/titan.tv.WebEpg/ZapList', JSON.stringify({ includeRadioStations: true }), {
      headers: this.request.headers
    });

    const data = response.data.data;

    return data.map(item => ({
      lang: 'sq',
      name: item.channel.title,
      site_id: item.channel.id,
      logo: item.channel.logo
    }));
  }
};
