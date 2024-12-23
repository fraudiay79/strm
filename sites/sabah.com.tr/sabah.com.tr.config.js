const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

module.exports = {
  site: 'sabah.com.tr',
  days: 1,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    headers: {
      'Accept-Encoding': 'gzip, deflate, br, zstd'
    }
  },
  url({ channel }) {
    return `https://www.sabah.com.tr/yayin-akisi/${channel.site_id}`;
  },
  async parser({ content, date }) {
    const $ = cheerio.load(content);
    const programs = [];

    $('div.tvGuide ul li').each((index, element) => {
      const time = $(element).find('span').first().text().trim();
      const title = $(element).find('span').last().text().trim();

      // Ensure the date and time strings are correctly formatted
      const startTime = dayjs.tz(`${date.format('YYYY-MM-DD')} ${time}`, 'YYYY-MM-DD HH:mm', 'Asia/Istanbul').toISOString();
      let endTime = null;

      if (programs.length > 0) {
        const previousProgram = programs[programs.length - 1];
        previousProgram.stop = startTime;
        endTime = dayjs.tz(startTime).add(1, 'hour').toISOString(); // Assuming each program lasts 1 hour
      }

      programs.push({
        title,
        start: startTime,
        stop: endTime
      });
    });

    // Set stop time for the last program (assuming it ends after an hour as default)
    if (programs.length > 0 && !programs[programs.length - 1].stop) {
      const lastProgram = programs[programs.length - 1];
      lastProgram.stop = dayjs(lastProgram.start).add(1, 'hour').toISOString();
    }

    return programs;
  },
  async channels() {
    const response = await axios.get('https://www.sabah.com.tr/yayin-akisi/star-tv', {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br, zstd'
      }
    });
    const $ = cheerio.load(response.data);
    const channels = [];

    $('div.sliderWrapper.tv-category ul.items li').each((index, element) => {
      const $element = $(element);
      const name = $element.find('img').attr('alt');
      const site_id = $element.find('a').attr('href').split('/').pop();
      const logo = $element.find('img').attr('src');

      channels.push({
        lang: 'tr',
        name: name,
        site_id: site_id,
        logo: logo
      });
    });

    return channels;
  }
};
