const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = {
  site: 'tivibu.com.tr',
  timezone: 'Europe/Istanbul',
  days: 2, // Keep low as per INI warning
  
  url({ channel }) {
    // Return the main page URL to get CSRF token and cookies
    return 'https://www.tivibu.com.tr/canli-tv'
  },
  
  request: {
    timeout: 60000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
      'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
    }
  },
  
  async parser({ content, channel, date }) {
    let programs = []
    
    try {
      // Extract CSRF token from the initial page content
      const csrfToken = extractCsrfToken(content)
      
      if (!csrfToken) {
        console.error('Could not extract CSRF token for channel:', channel.site_id)
        return programs
      }
      
      // Make request to GetPrevueList endpoint (the working one from the browser example)
      const response = await makePrevueRequest(channel.site_id, csrfToken)
      
      if (response && response.mobilPrevueViewModel) {
        programs = parseProgramsForDay(response.mobilPrevueViewModel, date)
        // Sort by start time
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
      // Fetch the main TV guide page
      const response = await axios.get('https://www.tivibu.com.tr/canli-tv', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
        },
        timeout: 30000
      })
      
      const html = response.data
      const $ = cheerio.load(html)
      const channels = []
      
      // Extract channels from the HTML
      // Channels are in li elements with class pattern like "ch00000000000000002187"
      $('.channelsList ul li').each((i, elem) => {
        const liClass = $(elem).attr('class') || ''
        const channelCode = liClass.match(/ch\d+/)?.[0]
        
        // Find channel name and logo
        const channelLink = $(elem).find('.channelsTitle a')
        const channelName = channelLink.text().trim()
        const channelUrl = channelLink.attr('href')
        
        // Get channel logo
        const logoImg = $(elem).find('.channelsLogo img')
        const logoUrl = logoImg.attr('src')
        
        // Get current program name
        const currentProgram = $(elem).find('.channelsName').text().trim()
        
        if (channelCode && channelName) {
          channels.push({
            lang: 'tr',
            site_id: channelCode,
            name: channelName,
            logo: logoUrl || null,
            currentProgram: currentProgram || null
          })
        }
      })
      
      // Alternative: Extract from channelsListPrograms section
      if (channels.length === 0) {
        $('.channelsListPrograms .channelsList ul li .anchor').each((i, elem) => {
          const channelLink = $(elem).find('.channelsTitle a')
          const channelName = channelLink.text().trim()
          
          // Extract channel code from href
          const href = channelLink.attr('href')
          let channelCode = null
          if (href) {
            const match = href.match(/\/kanallar\/([^\/]+)/)
            if (match) {
              // We'll need to map slug to channel code, but for now use a fallback
              channelCode = match[1]
            }
          }
          
          if (channelCode && channelName) {
            channels.push({
              lang: 'tr',
              site_id: channelCode,
              name: channelName
            })
          }
        })
      }
      
      console.log(`Found ${channels.length} channels on tivibu.com.tr`)
      
      // If no channels found, return fallback list from the HTML we saw
      if (channels.length === 0) {
        console.log('No channels found via parsing, using fallback channel list')
        return getFallbackChannels()
      }
      
      return channels
      
    } catch (error) {
      console.error('Error fetching channels:', error.message)
      return getFallbackChannels()
    }
  }
}

function extractCsrfToken(html) {
  // Look for the CSRF token in hidden input or meta tags
  const patterns = [
    /name="CSRF-TOKEN-TVBUDNBX!-FORM" value="([^"]+)"/,
    /name="__RequestVerificationToken" value="([^"]+)"/,
    /RequestVerificationToken["']?\s*:\s*["']([^"']+)["']/,
    /X-CSRF-TOKEN-TVBUDNBX%21=([^;]+)/
  ]
  
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      return decodeURIComponent(match[1])
    }
  }
  
  return null
}

async function makePrevueRequest(channelCode, csrfToken) {
  const axios = require('axios')
  
  try {
    const postData = new URLSearchParams({
      channelCode: channelCode
    })
    
    const response = await axios.post(
      'https://www.tivibu.com.tr/Channel/GetPrevueList',
      postData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'RequestVerificationToken': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
          'Referer': 'https://www.tivibu.com.tr/canli-tv'
        },
        timeout: 30000
      }
    )
    
    return response.data
  } catch (error) {
    if (error.response) {
      console.error(`Request failed for channel ${channelCode} with status ${error.response.status}`)
    } else {
      console.error(`Request error for channel ${channelCode}:`, error.message)
    }
    return null
  }
}

function parseProgramsForDay(prevueList, date) {
  const programs = []
  
  if (!prevueList || !Array.isArray(prevueList)) {
    return programs
  }
  
  prevueList.forEach(prevue => {
    // Skip if missing required fields
    if (!prevue.beginTime || !prevue.endTime || !prevue.prevueName) {
      return
    }
    
    // Parse begin and end times
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
    
    // Add description if available
    if (prevue.description && prevue.description.trim()) {
      program.description = prevue.description.trim()
    }
    
    // Add category/genre if available
    if (prevue.genre && prevue.genre.trim()) {
      program.category = prevue.genre.trim()
    }
    
    // Add icon if available
    if (prevue.prevueImage) {
      program.icon = prevue.prevueImage
    }
    
    // Add rating if available
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
    // Format from API: "2026.05.06 23:25:00" or "2026.05.06 23:25"
    let formatted = dateTimeString.replace(/\./g, '-')
    
    // Ensure seconds are present
    if (formatted.split(':').length === 2) {
      formatted = `${formatted}:00`
    }
    
    const parsed = dayjs.tz(formatted, 'YYYY-MM-DD HH:mm:ss', 'Europe/Istanbul')
    
    if (!parsed.isValid()) {
      return null
    }
    
    return parsed.utc()
  } catch (error) {
    console.error(`Error parsing date/time "${dateTimeString}":`, error.message)
    return null
  }
}

function parseRating(ratingId) {
  if (!ratingId) return null
  
  const ratingMap = {
    'generalAudience': '0+',
    'plus7': '7+',
    'plus13': '13+',
    'plus18': '18+',
    'GA': '0+',
    '7+': '7+',
    '13+': '13+',
    '18+': '18+'
  }
  
  return ratingMap[ratingId] || ratingMap[ratingId.toLowerCase()] || null
}

function getFallbackChannels() {
  // Return the channels we saw in the HTML
  return [
    { lang: 'tr', site_id: 'ch00000000000000001358', name: 'TİVİBU TANITIM' },
    { lang: 'tr', site_id: 'ch00000000000000001481', name: 'BENİM KANALIM' },
    { lang: 'tr', site_id: 'ch00000000000000002187', name: 'TARİH TV' },
    { lang: 'tr', site_id: 'ch00000000000000001258', name: 'SİNEMA TV' },
    { lang: 'tr', site_id: 'ch00000000000000002783', name: 'SİNEMA 2' },
    { lang: 'tr', site_id: 'ch00000000000000001259', name: 'SİNEMA YERLİ' },
    { lang: 'tr', site_id: 'ch00000000000000002784', name: 'SİNEMA YERLİ 2' },
    { lang: 'tr', site_id: 'ch00000000000000001263', name: 'SİNEMA AKSİYON' },
    { lang: 'tr', site_id: 'ch00000000000000002803', name: 'SİNEMA AKSİYON 2' },
    { lang: 'tr', site_id: 'ch00000000000000001281', name: 'SİNEMA KOMEDİ' },
    { lang: 'tr', site_id: 'ch00000000000000002785', name: 'SİNEMA KOMEDİ 2' },
    { lang: 'tr', site_id: 'ch00000000000000001271', name: 'SİNEMA AİLE' },
    { lang: 'tr', site_id: 'ch00000000000000002786', name: 'SİNEMA AİLE 2' },
    { lang: 'tr', site_id: 'ch00000000000000001262', name: 'SİNEMA 1001' },
    { lang: 'tr', site_id: 'ch00000000000000002813', name: 'SİNEMA 1002' },
    { lang: 'tr', site_id: 'ch00000000000000001266', name: 'TRT 1' },
    { lang: 'tr', site_id: 'ch00000000000000001166', name: 'KANAL D' },
    { lang: 'tr', site_id: 'ch00000000000000001017', name: 'ATV' },
    { lang: 'tr', site_id: 'ch00000000000000001230', name: 'SHOW TV' },
    { lang: 'tr', site_id: 'ch00000000000000001162', name: 'NOW' },
    { lang: 'tr', site_id: 'ch00000000000000001170', name: 'STAR TV' },
    { lang: 'tr', site_id: 'ch00000000000000001351', name: 'TV8' },
    { lang: 'tr', site_id: 'ch00000000000000001307', name: 'TRT HABER' },
    { lang: 'tr', site_id: 'ch00000000000000001221', name: 'NTV' },
    { lang: 'tr', site_id: 'ch00000000000000001021', name: 'A HABER' },
    { lang: 'tr', site_id: 'ch00000000000000001092', name: 'CNN TÜRK' },
    { lang: 'tr', site_id: 'ch00000000000000001159', name: 'HABERTÜRK' }
  ]
}
