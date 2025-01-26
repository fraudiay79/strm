const axios = require('axios');
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(timezone);

module.exports = {
  site: 'mtel.ba',
  days: 2,
  url: function ({ date, page }) {
    return `https://mtel.ba/hybris/ecommerce/b2c/v1/products/channels/epg?platform=tv-iptv&currentPage=${page}&date=${date.format('YYYY-MM-DD')}`;
  },
  request: {
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    }
  },
  parser: function ({ content, channel }) {
    let programs = [];
    const items = parseItems(content, channel);
    items.forEach(product => {
      product.programs.forEach(item => {
        programs.push({
          title: item.title,
          description: item.description,
          category: item.category,
          icon: item.picture ? item.picture.url : null,
          duration: item.durationMinutes,
          start: parseStart(item).toJSON(),
          stop: parseStop(item).toJSON()
        });
      });
    });
    return programs;
  },
  async channels() {
    let channels = [];
    const totalPages = 8;
    const pages = Array.from(Array(totalPages).keys());
    for (let page of pages) {
      const data = await axios
        .get(`https://mtel.ba/hybris/ecommerce/b2c/v1/products/channels/search`, {
          params: { pageSize: 20, currentPage: page, query: ':relevantno:tv-kategorija:tv-msat:tv-msat-paket:Svi+kanali' },
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
        .then(r => r.data)
        .catch(console.log);

      data.products.forEach(item => {
        channels.push({
          lang: 'bs',
          site_id: item.code,
          name: item.name
        });
      });
    }
    return channels;
  }
};

async function getTotalPageCount() {
  const data = await axios
    .get(`https://mtel.ba/hybris/ecommerce/b2c/v1/products/channels/search`, {
      params: { pageSize: 20, currentPage: 0, query: ':relevantno:tv-kategorija:tv-msat:tv-msat-paket:Svi+kanali' },
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    .then(r => r.data)
    .catch(console.log)

  return data.total_pages
}

function parseStart(item) {
  return dayjs.tz(item.start, 'Europe/Sarajevo');
}

function parseStop(item) {
  return dayjs.tz(item.end, 'Europe/Sarajevo');
}

function parseContent(content, channel) {
  const [, channelId] = channel.site_id.split('#');
  const data = JSON.parse(content);
  if (!data || !Array.isArray(data.products)) return null;
  return data.products.find(i => i.code === channelId);
}

function parseItems(content, channel) {
  const data = parseContent(content, channel);
  return data ? data.programs : [];
}
