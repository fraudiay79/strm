const axios = require('axios');
const dayjs = require('dayjs');
const doFetch = require('@ntlab/sfetch');

const url = 'https://telecomtv.uz/uz/channels';

module.exports = {
  site: 'telecomtv.uz',
  channels: 'telecomtv.uz.channels.xml',
  days: 2,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel, date }) {
    return `https://uztel.server-api.lfstrm.tv/epg/v2/schedules/${channel.site_id}/spread?centralPageId=${date.format('YYYY-MM-DD')}t12d12h`;
  },
  parser: function ({ content }) {
    let programs = [];
    const data = JSON.parse(content);
    const pagesWithEvents = data.pagesWithEvents || [];

    pagesWithEvents.forEach(page => {
      const events = page.events || [];
      events.forEach(event => {
        const start = dayjs(event.scheduledFor.begin);
        const stop = dayjs(event.scheduledFor.end);

        programs.push({
          title: event.title,
          description: event.eventDescriptionMedium || '',
          start,
          stop
        });
      });
    });

    return programs;
  },
  async channels() {
    const tvAssetToken = await getTvAssetToken(url);
    if (!tvAssetToken) return null;
    const data = await axios
      .get(`https://uztel.server-api.lfstrm.tv/tv/v2/medias?tv-asset-token=${tvAssetToken}`, {
        headers: {
          'x-frontend-id': 1196,
          'x-service-id': 3,
          'x-system-id': 1
        }
      })
      .then(r => r.data)
      .catch(console.log);

    return data.channels.map(item => {
      return {
        lang: 'uz',
        site_id: item.id,
        name: item.title
      };
    });
  }
};

async function getTvAssetToken(url) {
  try {
    const response = await doFetch(url);
    const html = await response.text();

    const regex = /window\.__INITIAL_STATE__\s*=\s*({.*?});/;
    const match = html.match(regex);

    if (match && match[1]) {
      const initialState = JSON.parse(match[1]);
      const tvAssetToken = initialState.common.assetTokens.tvAssetToken.token;
      return tvAssetToken;
    }

    return null;
  } catch (error) {
    console.error('Error fetching the HTML:', error);
    return null;
  }
}
