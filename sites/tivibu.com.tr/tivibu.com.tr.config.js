const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const cheerio = require('cheerio')
dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = {
  site: 'tivibu.com.tr',
  timezone: 'Europe/Istanbul',
  days: 2,
  
  url({ channel, date }) {
    // Return the main TV guide page
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
      const $ = cheerio.load(content)
      
      // Find the channel's program container
      // Channels are in li elements with class containing channel code
      const channelLi = $(`li.${channel.site_id}`)
      
      if (channelLi.length === 0) {
        console.error(`Channel ${channel.site_id} not found in HTML`)
        return programs
      }
      
      // Find all program boxes for this channel
      // Programs are in the channelsPrograms div for desktop view
      const programsContainer = channelLi.find('.channelsPrograms')
      
      if (programsContainer.length === 0) {
        // Try mobile view structure
        const mobilePrograms = channelLi.find('.channelOpenBox .channelsPrograms_open .programBox')
        programs = parseMobilePrograms(mobilePrograms, date)
      } else {
        // Desktop view - find all program boxes
        const programBoxes = programsContainer.find('.programBox')
        programs = parseDesktopPrograms(programBoxes, date)
      }
      
      // Sort by start time
      programs.sort((a, b) => a.start - b.start)
      
    } catch (error) {
      console.error(`Error parsing data for channel ${channel.site_id}:`, error.message)
    }
    
    return programs
  },
  
  async channels() {
    try {
      // Fetch the main TV guide page
      const axios = require('axios')
      
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
      // Method 1: From the channels list in desktop view
      $('.channelsList ul li').each((i, elem) => {
        const liClass = $(elem).attr('class') || ''
        const channelCode = liClass.match(/ch\d+/)?.[0]
        
        // Get channel name from the anchor tag
        const channelLink = $(elem).find('.channelsTitle a')
        let channelName = channelLink.text().trim()
        
        // If no name found in anchor, try other selectors
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
      
      // Method 2: From mobile view if desktop didn't work
      if (channels.length === 0) {
        $('.channelsMobile .channelsList ul li').each((i, elem) => {
          const fullLink = $(elem).find('.fullLink')
          const channelCode = fullLink.attr('channelCode')
          const channelName = $(elem).find('.channelsTitle').text().trim()
          
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
      
      if (channels.length === 0) {
        return getFallbackChannels()
      }
      
      return channels
      
    } catch (error) {
      console.error('Error fetching channels:', error.message)
      return getFallbackChannels()
    }
  }
}

function parseDesktopPrograms(programBoxes, date) {
  const programs = []
  const today = date.format('YYYY-MM-DD')
  
  programBoxes.each((i, elem) => {
    const $box = cheerio.load(elem)
    const $elem = $box.root()
    
    // Extract time information
    const startTimeStr = $elem.find('.startTime').text().trim()
    const finishTimeStr = $elem.find('.finishTime').text().trim()
    const programTitle = $elem.find('.programTitle').text().trim()
    const programType = $elem.find('.type').text().trim()
    
    // Extract rating
    let rating = null
    const ratingClass = $elem.find('.proscriptive i').attr('class')
    if (ratingClass) {
      rating = parseRatingFromClass(ratingClass)
    }
    
    // Extract description (may be in a tooltip or hidden element)
    let description = ''
    const descElement = $elem.find('.programDesc')
    if (descElement.length) {
      description = descElement.text().trim()
    }
    
    if (startTimeStr && finishTimeStr && programTitle) {
      // Parse start and stop times
      let start = parseTimeWithDate(today, startTimeStr)
      let stop = parseTimeWithDate(today, finishTimeStr)
      
      // Handle programs that cross midnight
      if (stop && start && stop.isBefore(start)) {
        stop = stop.add(1, 'day')
      }
      
      if (start && stop) {
        const program = {
          title: programTitle,
          start: start,
          stop: stop
        }
        
        if (programType && programType !== '-') {
          program.category = programType
        }
        
        if (description) {
          program.description = description
        }
        
        if (rating) {
          program.rating = { system: 'TR', value: rating }
        }
        
        programs.push(program)
      }
    }
  })
  
  return programs
}

function parseMobilePrograms(programBoxes, date) {
  const programs = []
  const today = date.format('YYYY-MM-DD')
  
  programBoxes.each((i, elem) => {
    const $box = cheerio.load(elem)
    const $elem = $box.root()
    
    // Extract time information
    const startTimeStr = $elem.find('.startTime').text().trim()
    const finishTimeStr = $elem.find('.finishTime').text().trim()
    const programTitle = $elem.find('.programTitle').text().trim()
    const programType = $elem.find('.type').text().trim()
    
    // Extract rating from class
    let rating = null
    const ratingClass = $elem.find('.proscriptive i').attr('class')
    if (ratingClass) {
      rating = parseRatingFromClass(ratingClass)
    }
    
    if (startTimeStr && finishTimeStr && programTitle) {
      let start = parseTimeWithDate(today, startTimeStr)
      let stop = parseTimeWithDate(today, finishTimeStr)
      
      if (stop && start && stop.isBefore(start)) {
        stop = stop.add(1, 'day')
      }
      
      if (start && stop) {
        const program = {
          title: programTitle,
          start: start,
          stop: stop
        }
        
        if (programType && programType !== '-') {
          program.category = programType
        }
        
        if (rating) {
          program.rating = { system: 'TR', value: rating }
        }
        
        programs.push(program)
      }
    }
  })
  
  return programs
}

function parseTimeWithDate(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null
  
  try {
    // Handle time format like "23:25"
    let formattedTime = timeStr.trim()
    
    // Ensure time has leading zeros
    if (formattedTime.length === 4 && formattedTime.includes(':')) {
      formattedTime = '0' + formattedTime
    }
    
    const dateTimeStr = `${dateStr} ${formattedTime}`
    const parsed = dayjs.tz(dateTimeStr, 'YYYY-MM-DD HH:mm', 'Europe/Istanbul')
    
    if (!parsed.isValid()) {
      return null
    }
    
    return parsed.utc()
  } catch (error) {
    return null
  }
}

function parseRatingFromClass(className) {
  if (!className) return null
  
  const ratingMap = {
    'generalAudience': '0+',
    'plus7': '7+',
    'plus13': '13+',
    'plus18': '18+'
  }
  
  for (const [key, value] of Object.entries(ratingMap)) {
    if (className.includes(key)) {
      return value
    }
  }
  
  return null
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
    { lang: 'tr', site_id: 'ch00000000000000001351', name: 'TV8' }
  ]
}
