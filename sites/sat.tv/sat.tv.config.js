const axios = require('axios')
const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(customParseFormat)

const API_ENDPOINT = 'https://www.sat.tv/wp-admin/admin-ajax.php'
const API_ENDPOINT_2 = 'https://www.sat.tv/wp-content/themes/twentytwenty-child/ajax_chaines.php'

async function getSecureToken() {
  const response = await axios
    .get(`${API_ENDPOINT}?action=get_secure_token`)
    .then(res => res.data)
    .catch(console.error)

  if (response?.success && response?.data?.token) {
    return response.data.token
  } else {
    throw new Error('Failed to retrieve secure token')
  }
}

module.exports = {
  site: 'sat.tv',
  days: 2,
  url: API_ENDPOINT,
  async request({ channel, date }) {
    const token = await getSecureToken()
    const [satSatellite, satLineup] = channel.site_id.split('#')

    const params = new URLSearchParams()
    params.append('action', 'block_tv_program')
    params.append('ajax', 'true')
    params.append('postId', '2162')
    params.append('lineupId', satLineup)
    params.append('sateliteId', satSatellite)
    params.append('dateFiltre', '0')
    params.append('hoursFiltre', '0')
    params.append('search', '')
    params.append('userDateTime', date.valueOf())
    params.append('filterElementCategorie', '')
    params.append('filterElementGenre', '')
    params.append('userTimezone', 'America/New_York')
    params.append('event', 'false')
    params.append('lastId', `channel-${satSatellite}`)
    params.append('token', token)

    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Cookie: `pll_language=${channel.lang}`
      },
      data: params,
      cache: {
        ttl: 60 * 60 * 1000 // 1 hour
      },
      axiosConfig: {
        maxContentLength: 10 * 1024 * 1024
      }
    }
  },
  parser: function ({ content, date, channel }) {
    const items = parseItems(content, channel)
    return items.map(item => {
      const $item = cheerio.load(item)
      const start = parseStart($item, date)
      const duration = parseDuration($item)
      const stop = start.add(duration, 'm')

      return {
        title: parseTitle($item),
        description: parseDescription($item),
        icon: parseImage($item),
        start,
        stop
      }
    })
  },
  async channels({ lang }) {
    const satellites = [/* same satellite list as before */]

    const channels = []
    for (const sat of satellites) {
      const params = new URLSearchParams()
      params.append('dateFiltre', dayjs().format('YYYY-MM-DD'))
      params.append('hoursFiltre', '0')
      params.append('satLineup', sat.lineup)
      params.append('satSatellite', sat.satellite)
      params.append('userDateTime', dayjs().valueOf())
      params.append('userTimezone', 'Europe/London')

      const data = await axios
        .post(API_ENDPOINT_2, params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            Cookie: `pll_language=${lang}`
          }
        })
        .then(r => r.data)
        .catch(console.error)

      const $ = cheerio.load(data)
      $('.main-container-channels-events > .container-channel-events').each((i, el) => {
        const name = $(el).find('.channel-title').text().trim()
        const channelId = name.replace(/\s&\s/gi, ' &amp; ')
        if (!name) return

        channels.push({
          lang,
          site_id: `${sat.satellite}#${sat.lineup}#${channelId}`,
          name
        })
      })
    }

    return channels
  }
}

// 🔎 Parsing helpers
function parseImage($item) {
  const src = $item('.event-logo img').attr('src')
  return src ? `http://sat.tv${src}` : null
}

function parseTitle($item) {
  return $item('.event-data-title').text().trim()
}

function parseDescription($item) {
  return $item('.event-data-desc').text().trim()
}

function parseStart($item, date) {
  const eventDataDate = $item('.event-data-date').text().trim()
  const [, time] = eventDataDate.match(/(\d{2}:\d{2})/) || []
  if (!time) return null
  return dayjs.utc(`${date.format('YYYY-MM-DD')} ${time}`, 'YYYY-MM-DD HH:mm')
}

function parseDuration($item) {
  const eventDataInfo = $item('.event-data-info').text().trim()
  const [, h, m] = eventDataInfo.match(/(\d{2})h(\d{2})/) || [null, 0, 0]
  return parseInt(h) * 60 + parseInt(m)
}

function parseItems(content, channel) {
  const [, , site_id] = channel.site_id.split('#')
  const $ = cheerio.load(content)
  const channelData = $('.main-container-channels-events > .container-channel-events')
    .filter((index, el) => {
      return $(el).find('.channel-title').text().trim() === site_id
    })
    .first()

  if (!channelData) return []
  return $(channelData).find('.container-event').toArray()
}
