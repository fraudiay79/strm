const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

module.exports = {
  site: 'ishow.gr',
  channels: 'ishow.gr.channels.xml',
  days: 7,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel, date }) {
    const daysOfWeek = {
      0: '0',
      1: '1',
      2: '2',
      3: '3',
      4: '4',
      5: '5',
      6: '6'
    }
    const day = date.day()
    return `https://www.ishow.gr/ShowTodayChannelProgramm.asp?cid=${channel.site_id}&gotoDay=${daysOfWeek[day]}`;
  },
  parser: function({ content, date }) {
    const programs = [];
    const $ = cheerio.load(content);
    const items = $('tr.progTr');
    items.each((i, item) => {
      const prev = programs[programs.length - 1];
      const $item = $(item);
      let start = parseStart($item, date);
      if (prev) {
        if (start.isBefore(prev.start)) {
          start = start.add(1, 'd');
          date = date.add(1, 'd');
        }
        prev.stop = start;
      }
      const stop = start.add(30, 'm');
      programs.push({
        title: $item.find('.grandTitle a').text(),
        description: $item.find('.subTitle').text(),
        category: $item.attr('class').match(/genre\d+/g).join(', '),
        start: start.format('YYYY-MM-DDTHH:mm:ss'),
        stop: stop.format('YYYY-MM-DDTHH:mm:ss')
      });
    });

    return programs;
  },
  async channels() {
    try {
      const response = await axios.get(`https://www.ishow.gr/channels.asp`);
      return response.data.items.map(item => {
        return {
          lang: 'el',
          name: item.localized[0].title,
          site_id: item.assetId
        };
      });
    } catch (error) {
      console.error('Error fetching channels:', error);
      return [];
    }
  }
};

function parseItems(content) {
  const $ = cheerio.load(content);
  return $('tr.progTr').toArray();
}

function parseStart($item, date) {
  const timeText = $item.find('.progTdTime').text().trim();
  const [hours, minutes] = timeText.split(':').map(Number);
  const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

  const dateString = `${date.format('YYYY-MM-DD')} ${formattedTime}`;

  return dayjs.tz(dateString, 'YYYY-MM-DD HH:mm:ss', 'Europe/Athens');
}
