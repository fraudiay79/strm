const dayjs = require('dayjs');
const axios = require('axios');

const BASIC_TOKEN =
  'MjdlMTFmNWUtODhlMi00OGU0LWJkNDItOGUxNWFiYmM2NmY1OjEyejJzMXJ3bXdhZmsxMGNkdzl0cjloOWFjYjZwdjJoZDhscXZ0aGc=';

let session;

module.exports = {
  site: 'telemach.me',
  days: 3,
  url({ channel, date }) {
    const countries = {
      ba: { communityId: '12', languageId: '59', lang: 'bs' },
      me: { communityId: '5', languageId: '10001', lang: 'cnr' },
      rs: { communityId: '1', languageId: '404', lang: 'sr' },
      si: { communityId: '8', languageId: '386', lang: 'sl' }
    }
    const config = countries[channel.site_id]
      if (!config) {
        throw new Error(`No configuration found for site ID: ${channel.site_id}`)
      }
    return `https://api-web.ug-be.cdn.united.cloud/v1/public/events/epg?fromTime=${date.format(
      'YYYY-MM-DDTHH:mm:ss-00:00'
    )}&toTime=${date
      .add(1, 'days')
      .subtract(1, 's')
      .format('YYYY-MM-DDTHH:mm:ss-00:00')}&communityId=${config.communityId}&languageId=${config.languageId}&cid=${channel.site_id}`
  },
  request: {
    async headers() {
      if (!session) {
        session = await loadSessionDetails();
        if (!session || !session.access_token) return null
      }

      return {
        Authorization: `Bearer ${session.access_token}`
      };
    }
  },
  parser({ content }) {
    try {
      const programs = [];
      const data = JSON.parse(content);
      for (const channelId in data) {
        if (Array.isArray(data[channelId])) {
          data[channelId].forEach(item => {
            programs.push({
              title: item.title,
              description: item.shortDescription,
              icon: parseImage(item),
              season: item.seasonNumber,
              episode: item.episodeNumber,
              start: dayjs(item.startTime),
              stop: dayjs(item.endTime)
            });
          });
        }
      }

      return programs;
    } catch (error) {
      console.error('Error parsing content:', error);
      return [];
    }
  },
  async channels() {
    const countries = {
      ba: { communityId: '12', languageId: '59', lang: 'bs' },
      me: { communityId: '5', languageId: '10001', lang: 'cnr' },
      rs: { communityId: '1', languageId: '404', lang: 'sr' },
      si: { communityId: '8', languageId: '386', lang: 'sl' }
    }
    const session = await loadSessionDetails();
    if (!session || !session.access_token) return null;

    let channels = [];
    for (let country in countries) {
      const config = countries[country];
      const lang = config.lang;

      try {
        const data = await axios.get(
          `https://api-web.ug-be.cdn.united.cloud/v1/public/channels?channelType=TV&communityId=${config.communityId}&languageId=${config.languageId}&imageSize=L`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          }
        );

        const channelData = data.data.map(item => ({
          lang,
          site_id: item.id,
          name: item.name
        }));

        channels = [...channels, ...channelData];
      } catch (error) {
        console.error(`Error fetching channels for ${country}:`, error);
      }
    }

    return channels;
  }
};

function parseImage(item) {
  const baseURL = 'https://images-web.ug-be.cdn.united.cloud';

  return Array.isArray(item?.images) && item.images[0] ? `${baseURL}${item.images[0].path}` : null;
}

function loadSessionDetails() {
  return axios
    .post(
      'https://api-web.ug-be.cdn.united.cloud/oauth/token?grant_type=client_credentials',
      {},
      {
        headers: {
          Authorization: `Basic ${BASIC_TOKEN}`
        }
      }
    )
    .then(r => r.data)
    .catch(error => {
      console.error('Error loading session details:', error);
      return null;
    });
}
