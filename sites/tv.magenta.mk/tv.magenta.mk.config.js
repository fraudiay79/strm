const axios = require('axios')
const crypto = require('crypto')
const dayjs = require('dayjs')

const API_ENDPOINT = 'https://tv-mk-prod.yo-digital.com/mk-bifrost'

const headers = {
  'Device-Id': crypto.randomUUID(),
  app_key: 'webq1ptdD5Gy4IatUZRiTezSu6sNc57A',
  app_version: '02.0.1091',
  'Origin': 'https://www.magentatv.mk',
  'x-request-session-id': crypto.randomUUID(),
  'X-User-Agent': 'web|web|Chrome-131|02.0.1091|1',
  'x-request-tracking-id': crypto.randomUUID()
}

module.exports = {
  site: 'tv.magenta.mk',
  days: 2,
  request: {
    headers,
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url: function ({ channel, date }) {
    return `${API_ENDPOINT}/epg/channel/schedules?date=${date.format('YYYY-MM-DD')}&hour_offset=${date.format('H')}&hour_range=3&filler=true&channelMap_id=${channel.site_id}&app_language=mk&natco_code=mk`
  },
  async parser({ content, channel, date }) {
  let programs = [];
  if (!content) return programs;

  let items = parseItems(JSON.parse(content), channel);
  if (!items.length) return programs;

  const promises = [3, 6, 9, 12, 15, 18, 21].map((i) =>
    axios.get(
      `${API_ENDPOINT}/epg/channel/schedules?channelMap_id=${channel.site_id}&date=${date.format(
        'YYYY-MM-DD'
      )}&hour_offset=${i}&hour_range=3&natco_code=mk`,
      { headers }
    )
  );

  const results = await Promise.allSettled(promises);

  results.forEach((r) => {
    if (r.status === 'fulfilled') {
      const parsed = parseItems(r.value.data, channel);
      items = items.concat(parsed);
    }
  });

  for (let item of items) {
    programs.push({
      title: item.description,
      description: item.full_description,
      subtitle: item.episode_name,
      season: item.season_number,
      episode: item.episode_number,
      start: dayjs.utc(item.start_time),
      stop: dayjs.utc(item.end_time),
    });
  }

  return programs;
},
  async channels() {
    const data = await axios
      .get(`${API_ENDPOINT}/epg/channel?natco_code=mk`, { headers })
      .then(r => r.data)
      .catch(console.log)

    return data.channels.map(item => {
      return {
        lang: 'mk',
        site_id: item.station_id,
        name: item.title
      }
    })
  }
}

function parseItems(data, channel) {
  if (!data || !data.channels) return []
  const channelData = data.channels[channel.site_id]
  if (!channelData) return []
  return channelData
}
