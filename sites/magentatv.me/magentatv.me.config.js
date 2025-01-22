const doFetch = require('@ntlab/sfetch')
const axios = require('axios')
const dayjs = require('dayjs')
const _ = require('lodash')

const cached = {}

module.exports = {
  site: 'magentatv.me',
  url({ date }) {
    return `https://tv-me-prod.yo-digital.com/me-bifrost/epg/channel/schedules?date=${date.format(
      'YYYY-MM-DD'
    )}&hour_offset=0&hour_range=3&channelMap_id&filler=true&app_language=me&natco_code=me`
  },
  request: {
    headers: {
      app_key: 'erYJuNj5fnVXtRgjkr4scxbr3oEkM4I4',
      app_version: '02.0.1080',
      'device-id': '8488f633-0b0e-4481-a2f8-688e7c74fe1b',
      'x-request-session-id': 'feb671dc-6869-40b0-9e94-b625e79dc5ff',
      'x-request-tracking-id': '1cd8c4ec-5ef0-4aea-84d4-66020d480fdc',
      'x-user-agent': 'web|web|Chrome-131|02.0.1080|1'
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
        'https://tv-me-prod.yo-digital.com/me-bifrost/epg/channel?channelMap_id=&natco_key=ANKB5xVVywklLUd9WtEOh8eyLnlAypTM&app_language=me&natco_code=me',
        module.exports.request
      )
      .then(r => r.data)
      .catch(console.error)

    return data.channels.map(channel => ({
      lang: 'me',
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
