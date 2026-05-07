const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = {
  site: 'tivibu.com.tr',
  timezone: 'Europe/Istanbul',
  days: 2,
  
  // Required url function - returns the URL to fetch
  url({ channel, date }) {
    // Return a placeholder URL - we'll make the actual request in the parser
    return 'https://www.tivibu.com.tr/canli-tv'
  },
  
  // Optional request configuration
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
      // First, get a valid session and CSRF token from the content
      const { csrfToken, cookieString } = await getSessionFromContent(content)
      
      if (!csrfToken) {
        console.error('Could not get CSRF token for channel:', channel.site_id)
        return programs
      }
      
      // Calculate date range
      const startDate = date.clone()
      const endDate = date.clone().add(this.days - 1, 'day')
      
      // Prepare POST data for GetMultiPrevueData endpoint
      const postData = new URLSearchParams({
        channelColumnCode: '020000',
        channelDateBegin: startDate.format('YYYY.MM.DD') + ' 00:00:00',
        channelDateEnd: endDate.format('YYYY.MM.DD') + ' 23:59:59',
        channelSearchValue: '',
        pageNo: '1'
      })
      
      // Make the POST request
      const response = await makeMultiPrevueRequest(postData, csrfToken, cookieString)
      
      if (response && response.mobilPrevueViewModel) {
        // Filter programs for this specific channel
        const channelPrograms = response.mobilPrevueViewModel.filter(
          program => program.channelCode === channel.site_id
        )
        programs = parsePrograms(channelPrograms, date)
        programs.sort((a, b) => a.start - b.start)
      }
      
    } catch (error) {
      console.error(`Error parsing data for channel ${channel.site_id}:`, error.message)
    }
    
    return programs
  },
  
  async channels() {
    const axios = require('axios')
    
    try {
      // Get session first
      const response = await axios.get('https://www.tivibu.com.tr/canli-tv', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
        },
        timeout: 30000
      })
      
      const { csrfToken, cookieString } = await getSessionFromContent(response.data)
      
      // Fetch channel list using the API
      const today = dayjs().format('YYYY.MM.DD')
      const postData = new URLSearchParams({
        channelColumnCode: '020000',
        channelDateBegin: `${today} 00:00:00`,
        channelDateEnd: `${today} 23:59:59`,
        channelSearchValue: '',
        pageNo: '1'
      })
      
      const apiResponse = await makeMultiPrevueRequest(postData, csrfToken, cookieString)
      
      let channels = []
      
      if (apiResponse && apiResponse.channelListViewModel) {
        apiResponse.channelListViewModel.forEach(channel => {
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
      
      if (channels.length === 0) {
        return await getChannelsFromHTML(response.data)
      }
      
      return channels
      
    } catch (error) {
      console.error('Error fetching channels from API:', error.message)
      return await getChannelsFromHTML()
    }
  }
}

async function getSessionFromContent(html) {
  const axios = require('axios')
  
  try {
    // Extract CSRF token from HTML
    let csrfToken = null
    
    // Look for the CSRF token in hidden input
    const tokenMatch = html.match(/name="CSRF-TOKEN-TVBUDNBX!-FORM" value="([^"]+)"/)
    if (tokenMatch && tokenMatch[1]) {
      csrfToken = tokenMatch[1]
    }
    
    // Also try to get cookies from the response if this was from a request
    let cookieString = ''
    
    return { csrfToken, cookieString }
    
  } catch (error) {
    console.error('Error getting session from content:', error.message)
    return { csrfToken: null, cookieString: '' }
  }
}

async function makeMultiPrevueRequest(postData, csrfToken, cookieString) {
  const axios = require('axios')
  
  // If no CSRF token, try to get one
  if (!csrfToken) {
    const session = await getSession()
    csrfToken = session.csrfToken
    cookieString = session.cookieString
  }
  
  try {
    const response = await axios.post(
      'https://www.tivibu.com.tr/Channel/GetMultiPrevueData',
      postData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'RequestVerificationToken': csrfToken || '',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
          'Referer': 'https://www.tivibu.com.tr/canli-tv',
          'Origin': 'https://www.tivibu.com.tr',
          'Cookie': cookieString
        },
        timeout: 30000,
        withCredentials: true
      }
    )
    
    return response.data
  } catch (error) {
    if (error.response) {
      console.error(`Request failed with status ${error.response.status}`)
    }
    return null
  }
}

async function getSession() {
  const axios = require('axios')
  
  try {
    const response = await axios.get('https://www.tivibu.com.tr/canli-tv', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
      },
      timeout: 30000,
      withCredentials: true
    })
    
    const html = response.data
    const tokenMatch = html.match(/name="CSRF-TOKEN-TVBUDNBX!-FORM" value="([^"]+)"/)
    const csrfToken = tokenMatch ? tokenMatch[1] : null
    
    const cookies = response.headers['set-cookie']
    const cookieString = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : ''
    
    return { csrfToken, cookieString }
    
  } catch (error) {
    console.error('Error getting session:', error.message)
    return { csrfToken: null, cookieString: '' }
  }
}

async function getChannelsFromHTML(htmlContent) {
  const cheerio = require('cheerio')
  
  try {
    let html = htmlContent
    
    if (!html) {
      const axios = require('axios')
      const response = await axios.get('https://www.tivibu.com.tr/canli-tv', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
        },
        timeout: 30000
      })
      html = response.data
    }
    
    const $ = cheerio.load(html)
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
    
    console.log(`Found ${channels.length} channels from HTML fallback`)
    return channels.length > 0 ? channels : getFallbackChannels()
    
  } catch (error) {
    console.error('Error fetching channels from HTML:', error.message)
    return getFallbackChannels()
  }
}

function parsePrograms(prevueList, date) {
  const programs = []
  
  if (!prevueList || !Array.isArray(prevueList)) {
    return programs
  }
  
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
    { lang: 'tr', site_id: 'ch00000000000000001266', name: 'TRT 1' },
    { lang: 'tr', site_id: 'ch00000000000000001166', name: 'KANAL D' },
    { lang: 'tr', site_id: 'ch00000000000000001017', name: 'ATV' },
    { lang: 'tr', site_id: 'ch00000000000000001230', name: 'SHOW TV' },
    { lang: 'tr', site_id: 'ch00000000000000001162', name: 'NOW' },
    { lang: 'tr', site_id: 'ch00000000000000001170', name: 'STAR TV' },
    { lang: 'tr', site_id: 'ch00000000000000001351', name: 'TV8' }
  ]
}
