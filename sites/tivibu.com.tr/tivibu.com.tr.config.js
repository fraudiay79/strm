const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = {
  site: 'tivibu.com.tr',
  timezone: 'Europe/Istanbul',
  days: 2, // Keep low as per INI warning: "very slow, grab as few days as necessary"
  
  url({ channel }) {
    // Return placeholder - we'll handle the actual request in parser
    return 'https://www.tivibu.com.tr/'
  },
  
  request: {
    timeout: 60000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-US,en;q=0.9',
      'X-Requested-With': 'XMLHttpRequest'
    }
  },
  
  async parser({ content, channel, date }) {
    let programs = []
    
    try {
      // Extract CSRF token from the initial page content
      let csrfToken = extractCsrfToken(content)
      
      // If token not found in content, try to get it from a fresh request
      if (!csrfToken) {
        csrfToken = await fetchCsrfToken()
      }
      
      if (!csrfToken) {
        console.error('Could not extract CSRF token for channel:', channel.site_id)
        return programs
      }
      
      // For each day in the range
      for (let i = 0; i < this.days; i++) {
        const targetDate = date.clone().add(i, 'day')
        
        // Make request to GetPrevueList endpoint
        const response = await makePrevueRequest(channel.site_id, csrfToken)
        
        if (response && response.mobilPrevueViewModel) {
          const dayPrograms = parseProgramsForDay(response.mobilPrevueViewModel, targetDate)
          programs.push(...dayPrograms)
        }
      }
      
      // Sort by start time
      programs.sort((a, b) => a.start - b.start)
      
    } catch (error) {
      console.error(`Error parsing data for channel ${channel.site_id}:`, error.message)
    }
    
    return programs
  },
  
  async channels() {
    const axios = require('axios')
    
    try {
      // First, get the main page to extract CSRF token
      const initialResponse = await axios.get('https://www.tivibu.com.tr/canli-tv', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
        }
      })
      
      let csrfToken = extractCsrfToken(initialResponse.data)
      
      if (!csrfToken) {
        csrfToken = await fetchCsrfToken()
      }
      
      if (!csrfToken) {
        console.error('Could not extract CSRF token for channel listing')
        return []
      }
      
      // Get channel list - we need to make requests for different date ranges to discover all channels
      const today = dayjs().format('YYYY.MM.DD')
      const postData = new URLSearchParams({
        channelColumnCode: '020000',
        channelDateBegin: `${today} 00:00:00`,
        channelDateEnd: `${today} 23:59:59`,
        channelSearchValue: '',
        pageNo: '1'
      })
      
      const channelsResponse = await axios.post(
        'https://www.tivibu.com.tr/Channel/GetMultiPrevueData',
        postData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'RequestVerificationToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Referer': 'https://www.tivibu.com.tr/canli-tv'
          },
          timeout: 30000
        }
      )
      
      let channels = []
      
      // Parse channel list from response
      if (channelsResponse.data && channelsResponse.data.channelListViewModel) {
        channelsResponse.data.channelListViewModel.forEach(channel => {
          if (channel.channelCode && channel.channelName) {
            channels.push({
              lang: 'tr',
              site_id: channel.channelCode,
              name: channel.channelName.trim(),
              logo: channel.channelImage || null
            })
          }
        })
      }
      
      console.log(`Found ${channels.length} channels on tivibu.com.tr`)
      return channels
      
    } catch (error) {
      console.error('Error fetching channels:', error.message)
      return []
    }
  }
}

function extractCsrfToken(html) {
  // Try multiple patterns to find the CSRF token
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

async function fetchCsrfToken() {
  const axios = require('axios')
  
  try {
    // Try to get CSRF token from the main page
    const response = await axios.get('https://www.tivibu.com.tr/canli-tv', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9'
      }
    })
    
    return extractCsrfToken(response.data)
  } catch (error) {
    console.error('Error fetching CSRF token:', error.message)
    return null
  }
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
          'Accept-Language': 'en-US,en;q=0.9',
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
    // Replace dots with dashes for dayjs compatibility
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
