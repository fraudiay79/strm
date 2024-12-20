const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');

module.exports = {
  site: 'tvepg.eu',
  days: 3,
  request: {
    method: 'GET',
    headers: {
      Cookie: '_ga=GA1.1.1426004521.1734009509; PHPSESSID=1ufg352cdshd0gk713581donvd; cf_clearance=iruh.NRVwxH3ViwxbtzAVrD823RvzsxjhsB4_nMQUM8-1734010271-1.2.1.1-L3IMdwXKgDKL3bMnvfQGnxgYjKhDkKVK1GWgUO5NM_a_x7MTnuGLHaowGSY8_0c3rIcyp2MM2dd72edAWc8K1jW9Knawaj73aStzQPzXIsFSYp_YWCbVvnozTY2v81o6OiHe92ASXG.TG6sErzXxk61d4rt8uv.EdD5BpysDC.a_7rWHnLxNOmGS35Fa4o84GB1WEFRhZcMapMmXJnmH339AcUsQ1p8MzFMq8NVgA0iaYD.21F.Y7CQM7M5ybpgWu05n9.maRqLhR6iy05x5avuq.b0exx7weMnxlwkctENMWucamXB9XOgDRVYWi_wbxfA4D7rfRZpE_tCYO3.6kie1mRjs1cSIuIlfYe05sWrTZ3j3pPNGF6LWihKmJ4ShG3muFppyTu0utWTad5vX.P9sD7khXhPY1DzldLdXBWP72vbiVMys1jrcfA2LkQpp; _ga_RJP8YJF9ZP=GS1.1.1734009509.1.1.1734010918.59.0.0',
      Referer: 'https://tvepg.eu/en/albania',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    }
  },
  url({ channel, date }) {
    return `https://tvepg.eu/en/albania/channel/${channel.site_id}/epg?date=${date.format('YYYY-MM-DD')}`;
  },
  async parser({ content, date }) {
    const $ = cheerio.load(content);
    const programs = [];

    $('tr[itemprop="publication"]').each((index, element) => {
      const startTime = $(element).find('h5[itemprop="startDate"]').attr('content');
      const title = $(element).find('h6[itemprop="name"] a').text().trim();
      const description = $(element).find('span[itemprop="description"] .description-text').text().trim();

      const start = dayjs(startTime).utc().format();
      const stop = dayjs(start).add(1, 'hour').utc().format(); // assuming 1 hour duration, adjust accordingly

      programs.push({
        title,
        description,
        start,
        stop
      });
    });

    return programs;
  },
  async channels() {
    const url = 'https://tvepg.eu/en/albania/epg';
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const channels = [];

      $('ul.grid-left-channels li.amr-tvgrid-ceil-left').each((index, element) => {
      const link = $(element).find('a');
      const channelName = link.attr('title');
      const channelId = link.attr('href').split('/').slice(-1)[0].split('#')[0];

      if (channelName && channelId) {
        channels.push({
          lang: 'al',
          name: channelName,
          site_id: channelId
        });
      }
    });

    return channels;
  } catch (error) {
    console.error('Error fetching channel list:', error);
    return [];
  }
}
};
