const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

module.exports = {
  site: 'teleprograma.com.ua',
  timezone: 'Europe/Kiev',
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    headers: {
      'Accept-Encoding': 'gzip, deflate, br'
    }
  },
  url({ date, channel }) {
    const formattedDate = dayjs(date).format('YYYY-MM-DD');
    return `https://teleprograma.com.ua/channels/${channel.site_id}/?date=${formattedDate}`;
  },
  parser: function ({ content, date }) {
    const $ = cheerio.load(content);
    const programs = [];

    $('.b-tv-channel-schedule__items .b-tv-channel-schedule__item').each((index, element) => {
    const time = $(element).find('.tv-event__time_single').text().trim();
    const title = $(element).find('.tv-event__title-inner').text().trim();
    const dateTimeString = `${date} ${time}`;

    try {
      const startTime = dayjs.tz(dateTimeString, 'YYYY-MM-DD HH:mm', 'Europe/Kiev').toISOString();
      let endTime = dayjs(startTime).add(1, 'hour').toISOString(); // Assuming each program lasts 1 hour

      if (programs.length > 0) {
        const previousProgram = programs[programs.length - 1];
        previousProgram.stop = startTime;
      }

      programs.push({
        title,
        start: startTime,
        stop: endTime
      });
    } catch (error) {
      console.error(`Failed to parse time for program "${title}" on ${dateTimeString}`);
    }
  });

  // Set stop time for the last program
  if (programs.length > 0 && !programs[programs.length - 1].stop) {
    const lastProgram = programs[programs.length - 1];
    lastProgram.stop = dayjs(lastProgram.start).add(1, 'hour').toISOString();
  }

  return programs;
},
  async channels() {
    const response = await axios.get('https://teleprograma.com.ua/', {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });
    const $ = cheerio.load(response.data);
    const channels = [];

    $('.tv-grid__item').each((index, element) => {
      const name = $(element).find('.tv-channel-title__text').text().trim();
      const linkElement = $(element).find('.tv-channel-title__link');
      if (linkElement.length > 0) {
        const href = linkElement.attr('href');
        if (href) {
          const siteId = href.split('/').filter(Boolean).pop();
          const logo = $(element).find('.b-tv-image__picture').css('background-image').replace(/url\(|\)/g, '');

          channels.push({
            lang: 'uk',
            name: name,
            site_id: siteId,
            logo: logo.startsWith('//') ? `https:${logo}` : logo
          });
        }
      }
    });

    return channels;
  }
};
