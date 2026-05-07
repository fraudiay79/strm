const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = {
  site: 'tivibu.com.tr',
  timezone: 'Europe/Istanbul',
  days: 2,
  
  async parser({ channel, date }) {
    let programs = []
    
    try {
      // First, get a valid session and CSRF token
      const { csrfToken, cookieString } = await getSession()
      
      if (!csrfToken) {
        console.error('Could not get CSRF token for channel:', channel.site_id)
        return programs
      }
      
      // Calculate date range (grab as few days as necessary - API returns all data at once)
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
    const cheerio = require('cheerio')
    
    try {
      // Get session first
      const { csrfToken, cookieString } = await getSession()
      
      // Fetch channel list using the API
      const today = dayjs().format('YYYY.MM.DD')
      const postData = new URLSearchParams({
        channelColumnCode: '020000',
        channelDateBegin: `${today} 00:00:00`,
        channelDateEnd: `${today} 23:59:59`,
        channelSearchValue: '',
        pageNo: '1'
      })
      
      const response = await makeMultiPrevueRequest(postData, csrfToken, cookieString)
      
      let channels = []
      
      if (response && response.channelListViewModel) {
        response.channelListViewModel.forEach(channel => {
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
        return await getChannelsFromHTML()
      }
      
      return channels
      
    } catch (error) {
      console.error('Error fetching channels from API:', error.message)
      return await getChannelsFromHTML()
    }
  }
}

async function getSession() {
  const axios = require('axios')
  
  try {
    // First, get the main page to establish a session
    const initialResponse = await axios.get('https://www.tivibu.com.tr/canli-tv', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
      },
      timeout: 30000,
      withCredentials: true
    })
    
    // Extract CSRF token from HTML
    const html = initialResponse.data
    let csrfToken = null
    
    // Look for the CSRF token in hidden input
    const tokenMatch = html.match(/name="CSRF-TOKEN-TVBUDNBX!-FORM" value="([^"]+)"/)
    if (tokenMatch && tokenMatch[1]) {
      csrfToken = tokenMatch[1]
    }
    
    // Extract cookies from response headers
    const cookies = initialResponse.headers['set-cookie']
    const cookieString = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : ''
    
    return { csrfToken, cookieString }
    
  } catch (error) {
    console.error('Error getting session:', error.message)
    return { csrfToken: null, cookieString: '' }
  }
}

async function makeMultiPrevueRequest(postData, csrfToken, cookieString) {
  const axios = require('axios')
  
  try {
    const response = await axios.post(
      'https://www.tivibu.com.tr/Channel/GetMultiPrevueData',
      postData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'RequestVerificationToken': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
          'Referer': 'https://www.tivibu.com.tr/canli-tv',
          'Origin': 'https://www.tivibu.com.tr',
          'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
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
      if (error.response.status === 400) {
        console.error('  This may require authentication or might be rate-limited')
      }
    } else {
      console.error(`Request error:`, error.message)
    }
    return null
  }
}

async function getChannelsFromHTML() {
  const axios = require('axios')
  const cheerio = require('cheerio')
  
  try {
    const response = await axios.get('https://www.tivibu.com.tr/canli-tv', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
      },
      timeout: 30000
    })
    
    const $ = cheerio.load(response.data)
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
    
    // Add optional fields
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
  // Return known working channels from the HTML
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
