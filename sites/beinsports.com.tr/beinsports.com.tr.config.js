const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

module.exports = {
  site: 'beinsports.com.tr',
  days: 7, // Adjust the number of days as needed
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    headers: {
      'Accept-Encoding': 'gzip, deflate, br'
    }
  },
  urldateFormat: 'dddd', // Weekday name in Turkish
  weekdays: ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'],
  url({ channel, weekdays }) {
    return `https://beinsports.com.tr/yayin-akisi/${channel.site_id}/${day}`;
  },
  async parser({ content, date }) {
    const $ = cheerio.load(content);
    const programs = [];

    $('a.show-upcoming.live').each((index, element) => {
      const $element = $(element);
      const time = $element.find('time').text().trim();
      const startTime = dayjs.tz(`${date.format('YYYY-MM-DD')} ${time}`, 'YYYY-MM-DD hh:mm A', 'Asia/Istanbul').format();
      const endTime = dayjs(startTime).add(1, 'hour').toISOString(); // Assuming each program is 1 hour long
      const title = $element.find('h3').text().trim();
      const seriesInfo = $element.find('h4').text().trim().match(/(.*) • (\d{4})/);
      const category = seriesInfo ? seriesInfo[1] : null;
      const year = seriesInfo ? seriesInfo[2] : null;
      const episodeTitle = $element.find('h5').text().trim();
      const seasonEpisodeInfo = $element.find('h6').text().trim().match(/Season (\d+) • Episode (\d+)/);
      const seasonNumber = seasonEpisodeInfo ? seasonEpisodeInfo[1] : null;
      const episodeNumber = seasonEpisodeInfo ? seasonEpisodeInfo[2] : null;
      const description = $element.find('p').text().trim();
      const href = $element.attr('href');

      programs.push({
        start: startTime,
        stop: endTime,
        title,
        category,
        year,
        episodeTitle,
        seasonNumber,
        episodeNumber,
        description,
        url: href
      });
    });

    return programs;
  },
  async channels() {
    const response = await axios.get('https://beinsports.com.tr/yayin-akisi/', {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });
    const $ = cheerio.load(response.data);
    const channels = [];

    $('h3.grow.leading-tight').each((index, element) => {
      const siteId = $(element).find('a').attr('href').match(/https:\/\/beinsports\.com\.tr\/(.*)/)[1];
      const name = $(element).text().trim();

      channels.push({
        lang: 'tr',
        name: name,
        site_id: siteId
      });
    });

    return channels;
  }
};
