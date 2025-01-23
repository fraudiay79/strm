const axios = require('axios')
const crypto = require('crypto')
const dayjs = require('dayjs')

const API_ENDPOINT = 'https://tv-hu-prod.yo-digital.com/hu-bifrost'

const headers = {
  app_key: 'exSJHBiSAN6wAAeqdWLdTUfdTi2PNark',
  app_version: '02.0.1091',
  'device-id': 'd6d831df-14c1-443e-b9b7-351c53e7d223',
  'x-request-session-id': '649e8fd1-9185-42fa-92bf-a4d3d3514ff7',
  'x-request-tracking-id': '35ab7d00-2aa8-4e66-a97c-8801efee83f9',
  'x-user-agent': 'web|web|Chrome-131|02.0.1091|1'
}

module.exports = {
  site: 'magentatv.hu',
  days: 2,
  request: {
    headers,
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url: function ({ channel, date }) {
    return `${API_ENDPOINT}/epg/channel/schedules/v2?station_ids=${
      channel.site_id
    }&date=${date.format('YYYY-MM-DD')}&hour_offset=${date.format('H')}&hour_range=3&natco_code=hu`
  },
  async parser({ content, channel, date }) {
    let programs = []
    if (!content) return programs

    let items = parseItems(JSON.parse(content), channel)
    if (!items.length) return programs

    const promises = [3, 6, 9, 12, 15, 18, 21].map(i =>
      axios.get(
        `${API_ENDPOINT}/epg/channel/schedules/v2?station_ids=${channel.site_id}&date=${date.format(
          'YYYY-MM-DD'
        )}&hour_offset=${i}&hour_range=3&natco_code=hu`,
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
        actors: parseRoles(detail, 'Színész'),
        directors: parseRoles(detail, 'Rendező'),
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
      .get(`${API_ENDPOINT}/epg/channel?natco_code=hu`, { headers })
      .then(r => r.data)
      .catch(console.log)

    return data.channels.map(item => {
      return {
        lang: 'hu',
        site_id: item.station_id,
        name: item.title
      }
    })
  }
}

async function loadProgramDetails(item) {
  if (!item.program_id) return {}
  const url = `${API_ENDPOINT}/details/series/${item.program_id}?natco_code=hu`
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
  if (!item.season_number) return null
  return item.season_number
}

function parseEpisode(item) {
  if (!item.episode_number) return null
  return item.episode_number
}

function parseDescription(item) {
  if (!item.details) return null
  return item.details.description
}

function parseRoles(item, role_name) {
  if (!item.roles) return null
  return item.roles.filter(role => role.role_name === role_name).map(role => role.person_name)
}
