const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = {
  site: 'tivibu.com.tr',
  timezone: 'Europe/Istanbul',
  days: 7,
  url({ date, channel }) {
    // For channel listing - first request to get CSRF token and channel data
    return 'https://www.tivibu.com.tr/'
  },
  request: {
    method: 'POST',
    timeout: 60000,
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  async parser({ content, channel, date }) {
    let programs = []
    
    // First, get CSRF token
    const csrfToken = extractCsrfToken(content)
    
    // For each channel, we need to make a POST request to GetMultiPrevueData
    const startDate = date.clone()
    const endDate = date.clone().add(this.days, 'day')
    
    const postData = {
      channelColumnCode: '020000',
      channelDateBegin: startDate.format('YYYY.MM.DD') + ' 00:00:00',
      channelDateEnd: endDate.format('YYYY.MM.DD') + ' 23:59:59',
      channelSearchValue: '',
      pageNo: '1' // Multiple page requests might be needed
    }
    
    // Make POST request for program data
    const response = await makePostRequest(postData, csrfToken)
    
    if (response && response.data) {
      programs = parsePrograms(response.data, channel, date)
    }
    
    return programs
  },
  async channels() {
    const axios = require('axios')
    
    // Initial request to get CSRF token and channel list
    const initialResponse = await axios.get('https://www.tivibu.com.tr/')
    const csrfToken = extractCsrfToken(initialResponse.data)
    
    // Make POST request to get channel list
    const postData = {
      channelColumnCode: '020000',
      channelDateBegin: dayjs().format('YYYY.MM.DD') + ' 00:00:00',
      channelDateEnd: dayjs().format('YYYY.MM.DD') + ' 23:59:59',
      channelSearchValue: '',
      pageNo: '1'
    }
    
    const channelsResponse = await axios.post(
      'https://www.tivibu.com.tr/Channel/GetMultiPrevueData',
      new URLSearchParams(postData),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'RequestVerificationToken': csrfToken,
          'Accept-Encoding': 'gzip,deflate,br'
        }
      }
    )
    
    let channels = []
    
    if (channelsResponse.data && channelsResponse.data.channelListViewModel) {
      channelsResponse.data.channelListViewModel.forEach(channel => {
        channels.push({
          lang: 'tr',
          site_id: channel.channelCode,
          name: channel.channelName,
          logo: channel.channelImage
        })
      })
    }
    
    return channels
  }
}

function extractCsrfToken(html) {
  // Extract CSRF token from HTML
  const match = html.match(/name="CSRF-TOKEN-TVBUDNBX!-FORM" value="([^"]+)"/)
  return match ? match[1] : ''
}

async function makePostRequest(postData, csrfToken) {
  const axios = require('axios')
  
  try {
    const response = await axios.post(
      'https://www.tivibu.com.tr/Channel/GetMultiPrevueData',
      new URLSearchParams(postData),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'RequestVerificationToken': csrfToken,
          'Accept-Encoding': 'gzip,deflate,br'
        },
        timeout: 60000
      }
    )
    return response
  } catch (error) {
    console.error('Error making POST request:', error.message)
    return null
  }
}

function parsePrograms(data, channel, date) {
  let programs = []
  
  if (!data || !data.length) return programs
  
  // Find the channel data
  const channelData = data.find(item => item.channelCode === channel.site_id)
  if (!channelData || !channelData.prevues) return programs
  
  channelData.prevues.forEach(prevue => {
    // Parse start time
    let start = parseTime(prevue.exactBeginTime)
    let stop = parseTime(prevue.exactEndTime)
    
    // Handle rating
    let rating = parseRating(prevue.ratingId)
    
    programs.push({
      title: prevue.prevueName || '',
      description: prevue.description || '',
      category: prevue.genre || '',
      start: start,
      stop: stop,
      icon: prevue.prevueImage || '',
      rating: rating ? { system: 'TR', value: rating } : null
    })
  })
  
  // Sort by start time
  programs.sort((a, b) => a.start - b.start)
  
  return programs
}

function parseTime(timeString) {
  // Time format from API: "2024-01-15T14:30:00" or similar
  if (!timeString) return null
  
  // Handle different possible formats
  let formattedTime = timeString
  if (timeString.includes('T')) {
    formattedTime = timeString.replace('T', ' ')
    if (formattedTime.includes('Z')) {
      formattedTime = formattedTime.replace('Z', '')
    }
    // Truncate milliseconds if present
    formattedTime = formattedTime.split('.')[0]
  }
  
  return dayjs.tz(formattedTime, 'YYYY-MM-DD HH:mm:ss', 'Europe/Istanbul').utc()
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

// Helper function to get subpage numbers (for pagination)
function getSubpageNumbers() {
  // Returns array [1, 2, 3, ... 12] as per original INI
  return Array.from({ length: 12 }, (_, i) => i + 1)
}
