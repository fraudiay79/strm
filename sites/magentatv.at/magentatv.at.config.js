const axios = require('axios')
const crypto = require('crypto')
const dayjs = require('dayjs')

const API_ENDPOINT = 'https://tv-at-prod.yo-digital.com/at-bifrost'

const headers = {
  app_key: 'CTnKA63ruKM0JM1doxAXwwyQLLmQiEiy',
  app_version: '02.0.1050',
  'device-id': '5aa1283d-5229-4799-a383-0fe76efb9b24',
  'x-request-session-id': '64cbafc1-fce8-4dd1-a724-bc773d4da7b2',
  'x-request-tracking-id': 'cc72a98b-9182-487f-8329-bedf9a633827',
  'x-user-agent': 'web|web|Chrome-131|02.0.1050|1'
}

module.exports = {
  site: 'magentatv.at',
  days: 2,
  request: {
    headers,
    cache: {
      ttl: 24 * 60 * 60 * 1000 // 1 day
    }
  },
  url({ date }) {
    return `${API_ENDPOINT}/epg/channel/schedules?date=${date.format(
      'YYYY-MM-DD'
    )}&hour_offset=0&hour_range=3&channelMap_id&filler=true&app_language=de&natco_code=at`
  },
  async parser({ content, channel, date }) {
    let programs = []
    if (!content) return programs

    let items = parseItems(JSON.parse(content), channel)
    if (!items.length) return programs

    const promises = [3, 6, 9, 12, 15, 18, 21].map(i =>
      axios.get(
        `${API_ENDPOINT}/epg/channel/schedules?date=${date.format(
      'YYYY-MM-DD'
    )}&hour_offset=${i}&hour_range=3&natco_code=at`,
        { headers }
      )
    )

    await Promise.allSettled(promises)
      .then(results => {
        results.forEach(r => {
          if (r.status === 'fulfilled') {
            const parsed = parseItems(r.value.data, channel)

            items = items.concat(parsed)
          }
        })
      })
      .catch(console.error)

    for (let item of items) {
      const detail = await loadProgramDetails(item)
      programs.push({
        title: item.description,
        description: parseDescription(detail),
        date: parseDate(item),
        category: parseCategory(item),
        icon: detail.poster_image_url,
        actors: parseRoles(detail, 'Schauspieler'),
        directors: parseRoles(detail, 'Regisseur'),
        season: parseSeason(item),
        episode: parseEpisode(item),
        start: parseStart(item),
        stop: parseStop(item)
      })
    }

    return programs
  },
  async channels() {
    const data = await axios
      .get(`${API_ENDPOINT}/epg/channel?natco_code=at`, { headers })
      .then(r => r.data)
      .catch(console.log)

    return data.channels.map(item => {
      return {
        lang: 'pl',
        site_id: item.station_id,
        name: item.title
      }
    })
  }
}

async function loadProgramDetails(item) {
  if (!item.program_id) return {}
  const url = `${API_ENDPOINT}/details/series/${item.program_id}?natco_code=at`
  const data = await axios
    .get(url, { headers })
    .then(r => r.data)
    .catch(console.log)

  return data || {}
}

function parseDate(item) {
  return item && item.release_year ? item.release_year.toString() : null
}

function parseStart(item) {
  return dayjs(item.start_time)
}

function parseStop(item) {
  return dayjs(item.end_time)
}

function parseItems(data, channel) {
  if (!data || !data.channels) return []
  const channelData = data.channels[channel.site_id]
  if (!channelData) return []
  return channelData
}

function parseCategory(item) {
  if (!item.genres) return null
  return item.genres.map(genre => genre.id)
}

function parseSeason(item) {
  if (item.season_display_number === 'Folgen') return null
  return item.season_number
}

function parseEpisode(item) {
  if (item.episode_number) return parseInt(item.episode_number)
  if (item.season_display_number === 'Folgen') return item.season_number
  return null
}

function parseDescription(item) {
  if (!item.details) return null
  return item.details.description
}

function parseRoles(item, role_name) {
  if (!item.roles) return null
  return item.roles.filter(role => role.role_name === role_name).map(role => role.person_name)
}
