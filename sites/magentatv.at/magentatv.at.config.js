const doFetch = require('@ntlab/sfetch')
const axios = require('axios')
const dayjs = require('dayjs')
const _ = require('lodash')

const cached = {}

module.exports = {
  site: 'magentatv.at',
  url({ date }) {
    return `https://tv-at-prod.yo-digital.com/at-bifrost/epg/channel/schedules?date=${date.format(
      'YYYY-MM-DD'
    )}&hour_offset=0&hour_range=3&channelMap_id&filler=true&app_language=de&natco_code=at`
  },
  request: {
    headers: {
      app_key: 'CTnKA63ruKM0JM1doxAXwwyQLLmQiEiy',
      app_version: '02.0.1050',
      'device-id': '5aa1283d-5229-4799-a383-0fe76efb9b24',
      'x-request-session-id': '64cbafc1-fce8-4dd1-a724-bc773d4da7b2',
      'x-request-tracking-id': 'cc72a98b-9182-487f-8329-bedf9a633827',
      'x-user-agent': 'web|web|Chrome-131|02.0.1050|1'
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
        'https://tv-at-prod.yo-digital.com/at-bifrost/epg/channel?channelMap_id=&natco_key=NZu7aIg1vFTNLwHcb0Kjhqk54ql9RJj5&app_language=de&natco_code=at',
        module.exports.request
      )
      .then(r => r.data)
      .catch(console.error)

    return data.channels.map(channel => ({
      lang: 'de',
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
