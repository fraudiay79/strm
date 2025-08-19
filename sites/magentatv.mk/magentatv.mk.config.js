const axios = require('axios')
const crypto = require('crypto')
const dayjs = require('dayjs')

const API_ENDPOINT = 'https://tv-mk-prod.yo-digital.com/mk-bifrost'

const headers = {
  app_key: 'webq1ptdD5Gy4IatUZRiTezSu6sNc57A',
  app_version: '02.0.1290',
  'device-id': crypto.randomUUID(),
  'x-request-session-id': crypto.randomUUID(),
  'x-request-tracking-id': crypto.randomUUID(),
  'x-user-agent': 'web|web|Chrome-139|02.0.1290|1'
}

module.exports = {
  site: 'magentatv.mk',
  days: 2,
  delay: 5000,
  request: {
    headers,
    cache: {
      ttl: 24 * 60 * 60 * 1000 // 1 day
    }
  },
  url({ date }) {
    return `${API_ENDPOINT}/epg/channel/schedules?date=${date.format(
      'YYYY-MM-DD'
    )}&hour_offset=0&hour_range=3&channelMap_id&filler=true&app_language=mk&natco_code=mk`
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
    )}&hour_offset=${i}&hour_range=3&natco_code=mk`,
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
        actors: parseRoles(detail, 'Actor'),
        directors: parseRoles(detail, 'Director'),
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

async function loadProgramDetails(item) {
  if (!item.program_id) return {}

  const url = `${API_ENDPOINT}/details/series/${item.program_id}?natco_code=mk`

  try {
    const response = await axios.get(url, { headers })
    return response.data
  } catch (error) {
    console.error(`Error loading program details: ${error.message}`)
    
    // Additional condition to check for series_id if an error is returned
    if (item.series_id) {
      console.log(`Attempting to load details with series_id: ${item.series_id}`)
      const seriesUrl = `${API_ENDPOINT}/details/series/${item.series_id}?natco_code=mk`
      
      try {
        const seriesResponse = await axios.get(seriesUrl, { headers })
        return seriesResponse.data
      } catch (seriesError) {
        console.error(`Error loading series details: ${seriesError.message}`)
        return { error: seriesError.message }
      }
    }

    return { error: error.message }
  }
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
