const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = {
  site: 'tivibu.com.tr',
  timezone: 'Europe/Istanbul',
  days: 2,
  
  url({ channel, date }) {
    // We'll use the API endpoint directly
    return 'https://www.tivibu.com.tr/Channel/GetPrevueList'
  },
  
  request: {
    method: 'POST',
    timeout: 60000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://www.tivibu.com.tr/canli-tv',
      'Origin': 'https://www.tivibu.com.tr',
      'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin'
    },
    data({ channel }) {
      // Use URLSearchParams to properly encode the data
      const params = new URLSearchParams()
      params.append('channelCode', channel.site_id)
      return params.toString()
    }
  },
  
  async parser({ content, channel, date }) {
    let programs = []
    
    try {
      let data
      if (typeof content === 'string') {
        data = JSON.parse(content)
      } else {
        data = content
      }
      
      if (data && data.mobilPrevueViewModel && Array.isArray(data.mobilPrevueViewModel)) {
        programs = parseProgramsForDay(data.mobilPrevueViewModel, date)
        programs.sort((a, b) => a.start - b.start)
      }
      
    } catch (error) {
      console.error(`Error parsing data for channel ${channel.site_id}:`, error.message)
    }
    
    return programs
  },
  
  async channels() {
    const axios = require('axios')
    const cheerio = require('cheerio')
    
    try {
      // First, get the main page to extract CSRF token and cookies
      const initialResponse = await axios.get('https://www.tivibu.com.tr/canli-tv', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
        },
        timeout: 30000
      })
      
      const $ = cheerio.load(initialResponse.data)
      const channels = []
      
      // Extract channels from the HTML
      $('.channelsList ul li').each((i, elem) => {
        const liClass = $(elem).attr('class') || ''
        const channelCode = liClass.match(/ch\d+/)?.[0]
        
        const channelLink = $(elem).find('.channelsTitle a')
        let channelName = channelLink.text().trim()
        
        if (!channelName) {
          channelName = $(elem).find('.channelsTitle').text().trim()
        }
        
        if (channelCode && channelName) {
          channels.push({
            lang: 'tr',
            site_id: channelCode,
            name: channelName
          })
        }
      })
      
      console.log(`Found ${channels.length} channels`)
      return channels
      
    } catch (error) {
      console.error('Error fetching channels:', error.message)
      return getFallbackChannels()
    }
  }
}

function parseProgramsForDay(prevueList, date) {
  const programs = []
  
  prevueList.forEach(prevue => {
    if (!prevue.beginTime || !prevue.endTime || !prevue.prevueName) {
      return
    }
    
    let start = parseDateTime(prevue.beginTime)
    let stop = parseDateTime(prevue.endTime)
    
    if (!start || !stop) {
      return
    }
    
    const program = {
      title: prevue.prevueName.trim(),
      start: start,
      stop: stop
    }
    
    if (prevue.description && prevue.description.trim()) {
      program.description = prevue.description.trim()
    }
    
    if (prevue.genre && prevue.genre.trim()) {
      program.category = prevue.genre.trim()
    }
    
    if (prevue.prevueImage) {
      program.icon = prevue.prevueImage
    }
    
    if (prevue.ratingId) {
      const rating = parseRating(prevue.ratingId)
      if (rating) {
        program.rating = { system: 'TR', value: rating }
      }
    }
    
    programs.push(program)
  })
  
  return programs
}

function parseDateTime(dateTimeString) {
  if (!dateTimeString) return null
  
  try {
    // Handle format: "2026.05.06 23:25:00" or "2026.05.06 23:25"
    let formatted = dateTimeString.replace(/\./g, '-')
    
    if (formatted.split(':').length === 2) {
      formatted = `${formatted}:00`
    }
    
    const parsed = dayjs.tz(formatted, 'YYYY-MM-DD HH:mm:ss', 'Europe/Istanbul')
    
    if (!parsed.isValid()) {
      return null
    }
    
    return parsed.utc()
  } catch (error) {
    return null
  }
}

function parseRating(ratingId) {
  if (!ratingId) return null
  
  const ratingMap = {
    'generalAudience': '0+',
    'plus7': '7+',
    'plus13': '13+',
    'plus18': '18+'
  }
  
  return ratingMap[ratingId] || null
}

function getFallbackChannels() {
  return [
    { lang: 'tr', site_id: 'ch00000000000000001358', name: 'TİVİBU TANITIM' },
    { lang: 'tr', site_id: 'ch00000000000000002187', name: 'TARİH TV' },
    { lang: 'tr', site_id: 'ch00000000000000001258', name: 'SİNEMA TV' },
    { lang: 'tr', site_id: 'ch00000000000000002783', name: 'SİNEMA 2' },
    { lang: 'tr', site_id: 'ch00000000000000001259', name: 'SİNEMA YERLİ' },
    { lang: 'tr', site_id: 'ch00000000000000001266', name: 'TRT 1' },
    { lang: 'tr', site_id: 'ch00000000000000001166', name: 'KANAL D' },
    { lang: 'tr', site_id: 'ch00000000000000001017', name: 'ATV' },
    { lang: 'tr', site_id: 'ch00000000000000001230', name: 'SHOW TV' }
  ]
}
