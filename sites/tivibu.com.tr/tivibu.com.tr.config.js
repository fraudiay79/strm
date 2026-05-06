const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = {
  site: 'tivibu.com.tr',
  timezone: 'Europe/Istanbul',
  days: 2, // Reduced from 7 as INI notes it's "very slow"
  
  url({ date, channel }) {
    // Return the main page URL to get CSRF token
    return 'https://www.tivibu.com.tr/'
  },
  
  request: {
    timeout: 60000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br'
    }
  },
  
  async parser({ content, channel, date }) {
    let programs = []
    
    try {
      // Extract CSRF token from the HTML
      const csrfToken = extractCsrfToken(content)
      if (!csrfToken) {
        console.error('Could not extract CSRF token')
        return programs
      }
      
      // Calculate date range (grab as few days as necessary)
      const startDate = date.clone()
      const endDate = date.clone().add(this.days - 1, 'day')
      
      // For each day in the range (the API might need separate requests per day)
      for (let d = 0; d < this.days; d++) {
        const currentDate = date.clone().add(d, 'day')
        const formattedDate = currentDate.format('YYYY.MM.DD')
        
        // Prepare POST data
        const postData = new URLSearchParams({
          channelColumnCode: '020000',
          channelDateBegin: `${formattedDate} 00:00:00`,
          channelDateEnd: `${formattedDate} 23:59:59`,
          channelSearchValue: '',
          pageNo: '1'
        })
        
        // Make the POST request for this day
        const response = await makePostRequest(postData, csrfToken)
        
        if (response && response.data && typeof response.data === 'object') {
          const dayPrograms = parseProgramsForChannel(response.data, channel, currentDate)
          programs.push(...dayPrograms)
        }
      }
      
      // Sort by start time and remove duplicates
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
      const initialResponse = await axios.get('https://www.tivibu.com.tr/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9'
        }
      })
      
      const csrfToken = extractCsrfToken(initialResponse.data)
      if (!csrfToken) {
        console.error('Could not extract CSRF token for channel listing')
        return []
      }
      
      // Make POST request to get channel list
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
            'Accept-Language': 'tr-TR,tr;q=0.9',
            'Referer': 'https://www.tivibu.com.tr/'
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
      
      console.log(`Found ${channels.length} channels`)
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

async function makePostRequest(postData, csrfToken) {
  const axios = require('axios')
  
  try {
    const response = await axios.post(
      'https://www.tivibu.com.tr/Channel/GetMultiPrevueData',
      postData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'RequestVerificationToken': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'tr-TR,tr;q=0.9',
          'Referer': 'https://www.tivibu.com.tr/'
        },
        timeout: 30000
      }
    )
    return response
  } catch (error) {
    if (error.response) {
      console.error(`POST request failed with status ${error.response.status}`)
    } else {
      console.error(`POST request error: ${error.message}`)
    }
    return null
  }
}

function parseProgramsForChannel(data, channel, date) {
  let programs = []
  
  if (!data || !Array.isArray(data)) {
    return programs
  }
  
  // Find the channel data
  const channelData = data.find(item => item.channelCode === channel.site_id)
  if (!channelData || !channelData.prevues || !Array.isArray(channelData.prevues)) {
    return programs
  }
  
  channelData.prevues.forEach(prevue => {
    if (!prevue.exactBeginTime || !prevue.exactEndTime) {
      return
    }
    
    // Parse start and stop times
    let start = parseTime(prevue.exactBeginTime)
    let stop = parseTime(prevue.exactEndTime)
    
    if (!start || !stop) {
      return
    }
    
    const program = {
      title: prevue.prevueName || 'No Title',
      start: start,
      stop: stop
    }
    
    // Add optional fields if they exist
    if (prevue.description) {
      program.description = prevue.description
    }
    
    if (prevue.genre) {
      program.category = prevue.genre
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

function parseTime(timeString) {
  if (!timeString) return null
  
  try {
    // Handle ISO format: "2024-01-15T14:30:00"
    let formattedTime = timeString
    
    if (timeString.includes('T')) {
      formattedTime = timeString.replace('T', ' ')
    }
    
    // Remove timezone info if present
    formattedTime = formattedTime.replace(/[+-]\d{2}:?\d{2}$/, '')
    formattedTime = formattedTime.replace('Z', '')
    
    // Remove milliseconds if present
    formattedTime = formattedTime.split('.')[0]
    
    // Parse with timezone
    const parsed = dayjs.tz(formattedTime, 'YYYY-MM-DD HH:mm:ss', 'Europe/Istanbul')
    
    if (!parsed.isValid()) {
      return null
    }
    
    return parsed.utc()
  } catch (error) {
    console.error(`Error parsing time "${timeString}":`, error.message)
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
