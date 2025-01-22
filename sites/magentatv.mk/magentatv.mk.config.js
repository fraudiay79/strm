const doFetch = require('@ntlab/sfetch')
const axios = require('axios')
const dayjs = require('dayjs')
const _ = require('lodash')

const cached = {}

module.exports = {
  site: 'magentatv.mk',
  url({ date }) {
    return `https://tv-mk-prod.yo-digital.com/mk-bifrost/epg/channel/schedules?date=${date.format(
      'YYYY-MM-DD'
    )}&hour_offset=0&hour_range=3&channelMap_id&filler=true&app_language=mk&natco_code=mk`
  },
  request: {
    headers: {
      app_key: 'webq1ptdD5Gy4IatUZRiTezSu6sNc57A',
      app_version: '02.0.1091',
      'device-id': 'c36eef8a-96ed-4e8e-af1b-0998d444ab46',
      'x-request-session-id': 'dad2295d-bdc2-4ab9-b300-401a95ce9927',
      'x-request-tracking-id': '0c4ccdb3-8707-4cb8-babb-e8f0d4acec5c',
      'x-user-agent': 'web|web|Chrome-131|02.0.1091|1'
    },
    cache: {
      ttl: 24 * 60 * 60 * 1000 // 1 day
    }
  },
  async parser({ content, channel, date }) {
    const data = parseData(content)
    if (!data) return []

    let items = parseItems(data, channel)
    if (!items.length) return []

    const queue = [3, 6, 9, 12, 15, 18, 21]
      .map(offset => {
        const url = module.exports.url({ date }).replace('hour_offset=0', `hour_offset=${offset}`)
        const params = module.exports.request

        if (cached[url]) {
          items = items.concat(parseItems(cached[url], channel))

          return null
        }

        return { url, params }
      })
      .filter(Boolean)

    await doFetch(queue, (_req, _data) => {
      if (_data) {
        cached[_req.url] = _data

        items = items.concat(parseItems(_data, channel))
      }
    })

    items = _.sortBy(items, i => dayjs(i.start_time).valueOf())

    return items.map(item => ({
      title: item.description,
      categories: Array.isArray(item.genres) ? item.genres.map(g => g.name) : [],
      season: item.season_number,
      episode: item.episode_number ? parseInt(item.episode_number) : null,
      date: item['release_year'] ? item['release_year'].toString() : null,
      start: item.start_time,
      stop: item.end_time
    }))
  },
  async channels() {
    const data = await axios
      .get(
        'https://tv-mk-prod.yo-digital.com/mk-bifrost/epg/channel?channelMap_id=&includeVirtualChannels=false&natco_key=HEEb5emU9KZG4prn2NaUkiv96g3IxpS6&app_language=mk&natco_code=mk',
        module.exports.request
      )
      .then(r => r.data)
      .catch(console.error)

    return data.channels.map(channel => ({
      lang: 'mk',
      name: channel.title,
      site_id: channel.station_id
    }))
  }
}

function parseData(content) {
  try {
    const data = JSON.parse(content)

    return data || null
  } catch {
    return null
  }
}

function parseItems(data, channel) {
  if (!data.channels || !Array.isArray(data.channels[channel.site_id])) return []

  return data.channels[channel.site_id]
}
