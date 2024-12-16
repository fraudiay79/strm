process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const cheerio = require('cheerio');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

module.exports = {
  site: 'cyta.com.cy',
  days: 9, // maxdays=9
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    headers: {
      'Accept-Encoding': 'gzip, deflate'
    }
  },
  url({ date }) {
    const formattedDate = date.add(0, 'days').format('YYYY-MM-DD');
    return `https://data.cytavision.com.cy/epg/?site=cyprus&day=${formattedDate}&lang=el&package=all&category=all`;
  },
  async parser({ content, channel }) {
    const shows = [];
    const $ = cheerio.load(content);
    const rows = $('div.epgrow.clearfix').filter((index, element) => {
      return $(element).find('.channel-id').text().trim() === channel.site_id;
    });

    rows.each((index, row) => {
      const show = {
        title: $(row).find('span.program_title').text().trim(),
        start: dayjs($(row).find('h4').text().match(/\d{1,2}:\d{2}/)[0], 'HH:mm').utc().format(),
        description: $(row).find('div.program_desc').text().trim() || 'No description available'
      };
      shows.push(show);
    });

    return shows;
  },
  async channels() {
    const url = 'https://data.cytavision.com.cy/epg/?site=cyprus&day=2023-01-01&lang=en&package=all&category=all';
    const response = await axios.get(url, {
      headers: {
        'Accept-Encoding': 'gzip, deflate'
      }
    });
    const $ = cheerio.load(response.data);
    const channels = [];

    $('h1').each((index, element) => {
      const siteId = $(element).find('a').attr('href').match(/\/(\d+)\/$/)[1];
      const name = $(element).text().trim();

      channels.push({
        lang: 'el',
        name: name,
        site_id: siteId
      });
    });

    return channels;
  }
};
