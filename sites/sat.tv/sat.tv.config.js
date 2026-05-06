const axios = require('axios')
const dayjs = require('dayjs')
const cheerio = require('cheerio')
const utc = require('dayjs/plugin/utc')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(customParseFormat)

const API_ENDPOINT = 'https://www.sat.tv/wp-admin/admin-ajax.php'
const TOKEN_ENDPOINT = 'https://www.sat.tv/wp-admin/admin-ajax.php?action=get_secure_token'

// Cache for the token and cookies
let cachedToken = null
let tokenExpiry = null
let cachedCookies = null

// Get initial cookies by visiting the main page first
async function getInitialCookies(lang = 'en') {
  try {
    // First, visit the main page to get cookies
    const response = await axios.get(`https://www.sat.tv/${lang}/tv-channels`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })
    
    // Extract cookies from response headers
    const cookies = response.headers['set-cookie']
    if (cookies && cookies.length) {
      cachedCookies = cookies.map(cookie => cookie.split(';')[0]).join('; ')
      console.log(`Initial cookies obtained: ${cachedCookies.substring(0, 100)}...`)
    }
    
    return cachedCookies
  } catch (error) {
    console.error('Failed to get initial cookies:', error.message)
    return null
  }
}

async function getSecureToken(lang = 'en') {
  // Check if we have a valid cached token (valid for 1 hour)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken
  }

  try {
    // Ensure we have initial cookies first
    if (!cachedCookies) {
      await getInitialCookies(lang)
    }
    
    const response = await axios.get(TOKEN_ENDPOINT, {
      headers: {
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': `https://www.sat.tv/${lang}/tv-channels`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
        'Cookie': cachedCookies || `pll_language=${lang}`
      },
      timeout: 10000
    })

    if (response.data && response.data.success && response.data.data && response.data.data.token) {
      cachedToken = response.data.data.token
      tokenExpiry = Date.now() + 60 * 60 * 1000 // Cache for 1 hour
      console.log(`Token obtained successfully: ${cachedToken.substring(0, 15)}...`)
      return cachedToken
    } else {
      throw new Error('Invalid token response structure')
    }
  } catch (error) {
    console.error('Failed to get security token:', error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response headers:', JSON.stringify(error.response.headers, null, 2))
    }
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
      try {
        const token = await getSecureToken(channel.lang)
        // Ensure we have cookies
        if (!cachedCookies) {
          await getInitialCookies(channel.lang)
        }
        
        return {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': `https://www.sat.tv/${channel.lang}/tv-channels`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
          'Cookie': cachedCookies || `pll_language=${channel.lang}; sat_satelite_id=2; sat_lineup_id=55`,
          'X-Secure-Token': token
        }
      } catch (error) {
        console.error('Error in headers function:', error.message)
        // Return basic headers as fallback
        return {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': `pll_language=${channel.lang}`
        }
      }
    },
    data: async function({ channel, date }) {
      try {
        const [satSatellite, satLineup] = channel.site_id.split('#')
        const token = await getSecureToken(channel.lang)
        
        const params = new URLSearchParams()
        params.append('action', 'block_tv_program')
        params.append('ajax', 'true')
        params.append('lineupId', satLineup)
        params.append('sateliteId', satSatellite)
        params.append('dateFiltre', date.format('YYYY-MM-DD'))
        params.append('hoursFiltre', '0')
        params.append('userDateTime', date.valueOf())
        params.append('userTimezone', 'Europe/London')
        params.append('token', token)

        return params
      } catch (error) {
        console.error('Error in data function:', error.message)
        // Return empty params as fallback
        return new URLSearchParams()
      }
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
    
    // Check if content is HTML or error
    if (content.includes('error') || content.length < 100) {
      console.log(`Invalid content for channel ${channel.name}: ${content.substring(0, 100)}`)
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
        if (duration === 0) {
          return
        }
        
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
    
    // Get initial cookies and token first
    try {
      console.log(`Initializing for language: ${lang}`)
      await getInitialCookies(lang)
      await getSecureToken(lang)
      console.log('Initialization successful')
    } catch (error) {
      console.error('Cannot proceed without initialization:', error.message)
      return channels
    }
    
    for (let sat of satellites) {
      try {
        const params = new URLSearchParams()
        params.append('action', 'block_tv_program')
        params.append('ajax', 'true')
        params.append('lineupId', sat.lineup)
        params.append('sateliteId', sat.satellite)
        params.append('dateFiltre', dayjs().format('YYYY-MM-DD'))
        params.append('hoursFiltre', '0')
        params.append('userDateTime', dayjs().valueOf())
        params.append('userTimezone', 'Europe/London')
        params.append('token', cachedToken)
        
        const response = await axios.post(API_ENDPOINT, params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': '*/*',
            'Referer': `https://www.sat.tv/${lang}/tv-channels`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
            'Cookie': cachedCookies || `pll_language=${lang}`,
            'X-Secure-Token': cachedToken
          },
          timeout: 15000
        })
        
        const data = response.data
        
        if (!data || data.trim() === '' || data.includes('error')) {
          console.log(`Invalid response for satellite ${sat.satellite}, lineup ${sat.lineup}`)
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
        
        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (err) {
        console.log(`Error processing satellite ${sat.satellite}, lineup ${sat.lineup}: ${err.message}`)
      }
    }

    console.log(`Found ${channels.length} channels for language ${lang}`)
    return channels
  }
}

// Helper functions
function parseImage($item) {
  try {
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
    const desc = $item('.event-data-desc').text().trim()
    return desc || ''
  } catch (err) {
    return ''
  }
}

function parseStart($item, date) {
  try {
    let eventDataDate = $item('.event-data-date').text().trim()
    
    if (eventDataDate.includes('الغد')) {
      const timeMatch = eventDataDate.match(/(\d{2}:\d{2})/)
      if (timeMatch) {
        const tomorrow = date.add(1, 'day')
        return dayjs.utc(`${tomorrow.format('YYYY-MM-DD')} ${timeMatch[1]}`, 'YYYY-MM-DD HH:mm')
      }
      return null
    }
    
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
    
    let channelData = null
    
    // Try to find by channel-num
    channelData = $(`.container-channel-events:has(.channel-num:contains("${channelId}"))`)
    
    if (channelData.length === 0) {
      // Try by channel-title
      $('.container-channel-events').each((i, el) => {
        const title = $(el).find('.channel-title').text().trim()
        if (title === channel.name) {
          channelData = $(el)
          return false
        }
      })
    }
    
    if (!channelData || channelData.length === 0) {
      return []
    }
    
    const events = channelData.find('.container-event')
    return events.toArray()
  } catch (err) {
    console.log(`Error in parseItems: ${err.message}`)
    return []
  }
}
