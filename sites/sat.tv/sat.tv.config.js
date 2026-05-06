const axios = require('axios')
const dayjs = require('dayjs')
const cheerio = require('cheerio')
const utc = require('dayjs/plugin/utc')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(customParseFormat)

const API_ENDPOINT = 'https://www.sat.tv/wp-admin/admin-ajax.php'
const TOKEN_ENDPOINT = 'https://www.sat.tv/wp-admin/admin-ajax.php?action=get_secure_token'

// Cache for the token
let cachedToken = null
let tokenExpiry = null

async function getSecureToken(lang = 'en') {
  // Check if we have a valid cached token (valid for 1 hour)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken
  }

  try {
    const response = await axios.get(TOKEN_ENDPOINT, {
      headers: {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'referer': 'https://www.sat.tv/tv-channels',
        'cookie': `pll_language=${lang}`
      }
    })

    if (response.data && response.data.success && response.data.data.token) {
      cachedToken = response.data.data.token
      tokenExpiry = Date.now() + 60 * 60 * 1000 // Cache for 1 hour
      console.log(`Token obtained: ${cachedToken.substring(0, 10)}...`)
      return cachedToken
    } else {
      throw new Error('Invalid token response')
    }
  } catch (error) {
    console.error('Failed to get security token:', error.message)
    throw error
  }
}

module.exports = {
  site: 'sat.tv',
  days: 2,
  delay: 6000,
  url: API_ENDPOINT,
  request: {
    method: 'POST',
    headers: async function({ channel }) {
      const token = await getSecureToken(channel.lang)
      return {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': `pll_language=${channel.lang}`,
        'Referer': `https://www.sat.tv/${channel.lang}/tv-channels`,
        'X-Secure-Token': token
      }
    },
    data: async function({ channel, date }) {
      const [satSatellite, satLineup, channelName] = channel.site_id.split('#')
      const token = await getSecureToken(channel.lang)
      
      const params = new URLSearchParams()
      params.append('action', 'block_tv_program')
      params.append('ajax', 'true')
      params.append('postId', '2165') // This might need to be dynamic
      params.append('lineupId', satLineup)
      params.append('sateliteId', satSatellite)
      params.append('dateFiltre', date.format('YYYY-MM-DD'))
      params.append('hoursFiltre', '0')
      params.append('search', '')
      params.append('userDateTime', date.valueOf())
      params.append('filterElementCategorie', '')
      params.append('filterElementGenre', '')
      params.append('userTimezone', 'Europe/London')
      params.append('event', 'true')
      params.append('lastId', `channel-${channelName}`) // This might need adjustment
      params.append('token', token)

      return params
    },
    cache: {
      ttl: 60 * 60 * 1000 // 1h
    }
  },
  parser: function ({ content, date, channel }) {
    let programs = []
    
    if (!content || content.trim() === '') {
      console.log(`Empty content received for channel: ${channel.name}`)
      return programs
    }
    
    const items = parseItems(content, channel)
    
    if (!items || items.length === 0) {
      console.log(`No items found for channel: ${channel.name}`)
      return programs
    }
    
    items.forEach(item => {
      try {
        let $item = cheerio.load(item)
        let start = parseStart($item, date)
        if (!start) {
          return
        }
        
        let duration = parseDuration($item)
        let stop = start.add(duration, 'm')

        programs.push({
          title: parseTitle($item) || 'No title',
          description: parseDescription($item) || '',
          image: parseImage($item),
          start,
          stop
        })
      } catch (err) {
        console.log(`Error parsing item: ${err.message}`)
      }
    })

    return programs
  },
  async channels({ lang }) {
    const satellites = [
      { satellite: 2, lineup: 55 },
      { satellite: 2, lineup: 58 },
      { satellite: 2, lineup: 53 },
      { satellite: 2, lineup: 57 },
      { satellite: 2, lineup: 54 },
      { satellite: 2, lineup: 56 },
      { satellite: 1, lineup: 48 },
      { satellite: 1, lineup: 44 },
      { satellite: 1, lineup: 42 },
      { satellite: 1, lineup: 39 },
      { satellite: 1, lineup: 37 },
      { satellite: 1, lineup: 38 },
      { satellite: 1, lineup: 68 },
      { satellite: 1, lineup: 47 },
      { satellite: 1, lineup: 41 },
      { satellite: 1, lineup: 49 },
      { satellite: 1, lineup: 46 },
      { satellite: 1, lineup: 35 },
      { satellite: 1, lineup: 43 },
      { satellite: 1, lineup: 45 },
      { satellite: 1, lineup: 50 },
      { satellite: 1, lineup: 71 },
      { satellite: 1, lineup: 40 },
      { satellite: 1, lineup: 72 },
      { satellite: 1, lineup: 33 },
      { satellite: 8, lineup: 62 },
      { satellite: 8, lineup: 63 },
      { satellite: 8, lineup: 64 },
      { satellite: 8, lineup: 65 },
      { satellite: 8, lineup: 66 },
      { satellite: 8, lineup: 67 }
    ]

    let channels = []
    
    // Get token first
    try {
      await getSecureToken(lang)
    } catch (error) {
      console.error('Cannot proceed without security token')
      return channels
    }
    
    for (let sat of satellites) {
      try {
        const params = new URLSearchParams()
        params.append('action', 'block_tv_program')
        params.append('ajax', 'true')
        params.append('postId', '2165')
        params.append('lineupId', sat.lineup)
        params.append('sateliteId', sat.satellite)
        params.append('dateFiltre', dayjs().format('YYYY-MM-DD'))
        params.append('hoursFiltre', '0')
        params.append('search', '')
        params.append('userDateTime', dayjs().valueOf())
        params.append('filterElementCategorie', '')
        params.append('filterElementGenre', '')
        params.append('userTimezone', 'Europe/London')
        params.append('event', 'true')
        params.append('lastId', '')
        params.append('token', cachedToken)
        
        const response = await axios.post(API_ENDPOINT, params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'Cookie': `pll_language=${lang}`,
            'Referer': `https://www.sat.tv/${lang}/tv-channels`,
            'X-Secure-Token': cachedToken
          }
        })
        
        const data = response.data
        
        if (!data || data.trim() === '') {
          console.log(`Empty response for satellite ${sat.satellite}, lineup ${sat.lineup}`)
          continue
        }

        const $ = cheerio.load(data)
        const channelElements = $('.container-channel-events')
        
        if (channelElements.length === 0) {
          console.log(`No channel elements found for satellite ${sat.satellite}, lineup ${sat.lineup}`)
          continue
        }
        
        channelElements.each((i, el) => {
          const name = $(el).find('.channel-title').text().trim()
          const channelNum = $(el).find('.channel-num').text().trim()
          
          if (!name) return

          channels.push({
            lang,
            site_id: `${sat.satellite}#${sat.lineup}#${channelNum || name}`,
            name
          })
        })
      } catch (err) {
        console.log(`Error processing satellite ${sat.satellite}, lineup ${sat.lineup}: ${err.message}`)
      }
    }

    console.log(`Found ${channels.length} channels for language ${lang}`)
    return channels
  }
}

// Helper functions based on the actual HTML structure
function parseImage($item) {
  try {
    // Look for images that don't have the 'no-img' class
    const img = $item('.event-logo img:not(.no-img)')
    if (img.length === 0) return null
    
    let src = img.attr('src')
    if (src && !src.startsWith('http')) {
      src = `https://www.sat.tv${src}`
    }
    return src || null
  } catch (err) {
    return null
  }
}

function parseTitle($item) {
  try {
    return $item('.event-data-title').text().trim() || 'No title'
  } catch (err) {
    return 'No title'
  }
}

function parseDescription($item) {
  try {
    // Description is hidden in a span with style='display: none;'
    const desc = $item('.event-data-desc').text().trim()
    return desc || ''
  } catch (err) {
    return ''
  }
}

function parseStart($item, date) {
  try {
    let eventDataDate = $item('.event-data-date').text().trim()
    
    // Handle Arabic date format "الغد 00:00" or "الغد 14:00"
    if (eventDataDate.includes('الغد')) {
      // Tomorrow's program - add one day
      const timeMatch = eventDataDate.match(/(\d{2}:\d{2})/)
      if (timeMatch) {
        const tomorrow = date.add(1, 'day')
        return dayjs.utc(`${tomorrow.format('YYYY-MM-DD')} ${timeMatch[1]}`, 'YYYY-MM-DD HH:mm')
      }
      return null
    }
    
    // Regular time format
    let [, time] = eventDataDate.match(/(\d{2}:\d{2})/) || [null, null]
    if (!time) return null

    return dayjs.utc(`${date.format('YYYY-MM-DD')} ${time}`, 'YYYY-MM-DD HH:mm')
  } catch (err) {
    return null
  }
}

function parseDuration($item) {
  try {
    let eventDataInfo = $item('.event-data-info').text().trim()
    // Format: "أخبار - مدة : 01h50" or "برنامج - مدة : 00h30"
    let [, h, m] = eventDataInfo.match(/(\d{2})h(\d{2})/) || [null, 0, 0]
    return parseInt(h) * 60 + parseInt(m)
  } catch (err) {
    return 0
  }
}

function parseItems(content, channel) {
  try {
    const [, , channelId] = channel.site_id.split('#')
    const $ = cheerio.load(content)
    
    // Find the specific channel container by channel number or title
    let channelData = null
    
    // Try to find by channel-num first
    channelData = $(`.container-channel-events:has(.channel-num:contains("${channelId}"))`)
    
    if (channelData.length === 0) {
      // Try by channel-title
      channelData = $(`.container-channel-events:has(.channel-title:contains("${channel.name}"))`)
    }
    
    if (channelData.length === 0) {
      // Fallback: find by exact channel title
      $('.container-channel-events').each((i, el) => {
        const title = $(el).find('.channel-title').text().trim()
        if (title === channel.name) {
          channelData = $(el)
          return false
        }
      })
    }
    
    if (!channelData || channelData.length === 0) {
      console.log(`Channel not found: ${channel.name} (ID: ${channelId})`)
      return []
    }
    
    // Get all event containers
    const events = channelData.find('.container-event')
    return events.toArray()
  } catch (err) {
    console.log(`Error in parseItems: ${err.message}`)
    return []
  }
}
