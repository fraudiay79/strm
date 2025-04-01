const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

module.exports = {
  site: 'tataplay.com',
  days: 2,
  url: function ({ date }) {
    return `https://tm.tapi.videoready.tv/content-detail/pub/api/v2/channels/schedule?date=${date.format('DD-MM-YYYY')}`;
  },
  request: {
    method: 'POST',
    headers: function() {
      return setHeaders();
    },
    data({ channel, date }) {
      return {
        id: channel.site_id
      };
    }
  },
  parser: function({ content }) {
    let programs = [];
    const items = parseItems(content);
    items.forEach(item => {
      programs.push({
        title: item.title,
        description: item.desc,
        icon: item.boxCoverImage,
        start: parseStart(item),
        stop: parseStop(item)
      });
    });
    return programs;
  },
  async channels() {
    const totalPages = await fetchPages();
    const channels = [];
    let newOffset = 0;
    console.log('before For ${totalPages}');
    for (let i = 0; i < totalPages; i += 20) {
      try {
        console.log('inside for');
        const resp = await axios.get(
          `https://tm.tapi.videoready.tv/portal-search/pub/api/v1/channels/schedule?date=&languageFilters=&genreFilters=&limit=20&offset=${newOffset}`,
          {
            headers: await setHeaders()
          }
        );
        console.log(resp.data);
        resp.data.data.channelList.forEach(channel => {
          if (channel.title !== '.') {
            channels.push({
              lang: 'en',
              site_id: channel.id,
              name: channel.title
            });
          }
        });
      } catch (error) {
        console.error(`Error fetching channels on page ${i + 20}:`, error.message);
      }
      newOffset += 20;
    }
    return channels;
  }
};

function parseStart(item) {
  return dayjs(item.startTime).format('YYYY-MM-DDTHH:mm:ss');
}

function parseStop(item) {
  return dayjs(item.endTime).format('YYYY-MM-DDTHH:mm:ss');
}

function parseItems(content) {
  try {
    const data = JSON.parse(content);
    const epg = data.data.epg;
    return epg;
  } catch (e) {
    return [];
  }
}

async function fetchPages() {
  const url = 'https://tm.tapi.videoready.tv/portal-search/pub/api/v1/channels/schedule?date=&languageFilters=&genreFilters=&limit=20&offset=0';
  const params = {
    headers: await setHeaders()
  };
  try {
    const response = await axios.get(url, params);
    console.log(response.data.data.total);
    return response.data.data.total;
  } catch (error) {
    console.error('Error fetching total pages:', error.message);
    return 0;
  }
}

function escapeAmpersands(text) {
  return text.replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;');
}

function setHeaders() {
  return {
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Origin': 'https://watch.tataplay.com',
    'Pragma': 'no-cache',
    'Referer': 'https://watch.tataplay.com/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'content-type': 'application/json',
    'locale': 'ENG',
    'platform': 'web',
    'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"'
  };
}
