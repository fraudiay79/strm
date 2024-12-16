const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const cheerio = require('cheerio');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const Channels = {
  HOTSenior: 575,
  Kan11: 839,
  Keshet12: 861,
  Reshet13: 863,
  Channel24: 578,
  ShoppingChannel21: 574,
  Makan33: 841,
  I24English: 907,
  France24: 468,
  BBCWorldNews: 441,
  Cnn: 451,
  Bloomberg: 443,
  DwNews: 771,
  Euronews: 335,
  Hot3: 477,
  IsraelPlus: 431,
  HomePlus: 567,
  One1: 685,
  Sport1: 580,
  Sport2: 581,
  Sport3: 826,
  Sport4: 828,
  Sport5: 582,
  Sport5Plus: 583,
  Sport5Gold: 428,
  Sport5PlusLive: 429,
  EuroSport1: 461,
  EuroSport2: 673,
  One2: 912,
  Hop: 591,
  HopYaldut: 592,
  DisneyJunior: 751,
  Kidz: 871,
  Disney: 566,
  Zoom: 738,
  Nick: 579,
  NickJunior: 710,
  Junior: 513,
  TeenNick: 792,
  Sport5HD: 544,
  SkyNews: 542,
  FoxNews: 465,
  FoxBusiness: 791,
  Mtv: 522
};

module.exports = {
  site: 'hot.net.il',
  days: 3, // Default days to grab
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel, date }) {
    const startDate = dayjs(date).subtract(1, 'day').format('DD/MM/YYYY');
    const endDate = dayjs(date).add(3, 'day').format('DD/MM/YYYY');
    const pageSize = 100;
    return `http://www.hot.net.il/PageHandlers/LineUpAdvanceSearch.aspx?text=&channel=${channel.site_id}&genre=-1&ageRating=-1&publishYear=-1&productionCountry=-1&startDate=${startDate}&endDate=${endDate}&currentPage=1&pageSize=${pageSize}&isOrderByDate=true&lcid=1037&pageIndex=1`;
  },
  async parser({ content }) {
    const shows = [];
    const $ = cheerio.load(content);
    const rows = $('tr.redtr_off');
    
    for (const row of rows) {
      const tds = $(row).find('td');
      const show = {
        title: $(tds[2]).text().trim(),
        startTime: dayjs($(tds[4]).text().split(',')[1].trim(), 'DD/MM/YYYY HH:mm').utc().format(),
        endTime: dayjs($(tds[4]).text().split(',')[1].trim(), 'DD/MM/YYYY HH:mm').add($(tds[5]).text().trim(), 'HH:mm').utc().format(),
        channel: $(tds[1]).text().trim(),
        description: ''
      };
      
      const onclick = $(row).attr('onclick');
      if (onclick && onclick.includes('=')) {
        const url = onclick.split('=')[1].replace(/'/g, '').trim();
        show.description = await getDescription(`https://www.hot.net.il${url}`);
      }

      shows.push(show);
    }

    return shows;
  },
  async channels() {
    const channels = [];
    for (const key in Channels) {
      if (Channels.hasOwnProperty(key)) {
        channels.push({
          lang: 'he',
          name: key,
          site_id: Channels[key].toString()
        });
      }
    }
    return channels;
  }
};

async function getDescription(url) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    return $('div.widgetHPTitle').next().text().trim();
  } catch (error) {
    console.error('Error fetching description:', error);
    return '';
  }
}
