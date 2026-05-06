const axios = require('axios')
const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = {
  site: 'telsu.fi',
  days: 2,
  url: function ({ date, channel }) {
    return `https://www.telsu.fi/${date.format('YYYYMMDD')}/${channel.site_id}`
  },
  parser: function ({ content, date, channel }) {
    let programs = []
    
    // Check if we have content to parse
    if (!content || typeof content !== 'string') {
      console.warn(`No content received for channel ${channel.site_id} on ${date.format('YYYY-MM-DD')}`)
      return []
    }
    
    const items = parseItems(content)
    
    if (!items || items.length === 0) {
      console.warn(`No program items found for channel ${channel.site_id} on ${date.format('YYYY-MM-DD')}`)
      return []
    }
    
    items.forEach(item => {
      const $item = cheerio.load(item)
      
      let start = parseStart($item, date)
      let stop = parseStop($item, date)
      
      // Skip if start or stop time couldn't be parsed
      if (!start || !stop) {
        const title = parseTitle($item)
        console.warn(`Could not parse time for program: ${title}`)
        return
      }
      
      const title = parseTitle($item)
      if (!title) {
        console.warn(`No title found for program, skipping`)
        return
      }
      
      programs.push({
        title: title,
        description: parseDescription($item),
        icon: parseImage($item),
        start,
        stop
      })
    })

    // Sort programs by start time
    programs.sort((a, b) => a.start.valueOf() - b.start.valueOf())
    
    // Set stop time of each program to the start time of the next one
    for (let i = 0; i < programs.length - 1; i++) {
      programs[i].stop = programs[i + 1].start
    }

    return programs
  },
  async channels() {
    const html = await axios
      .get('https://www.telsu.fi/')
      .then(r => r.data)
      .catch(console.log)
    const $ = cheerio.load(html)
    const items = $('.ch').toArray()
    return items.map(item => {
      const name = $(item).find('a').attr('title')
      const site_id = $(item).attr('rel')

      return {
        lang: 'fi',
        site_id,
        name
      }
    })
  }
}

function parseTitle($item) {
  // Get title from h2 > b element
  return $item('h2 > b').first().text().trim()
}

function parseDescription($item) {
  // Get description from .t div (excluding episode info)
  const $t = $item('.t').clone()
  $t.find('.ep-info').remove() // Remove episode info from description
  return $t.text().trim()
}

function parseImage($item) {
  // Get image from .picw img
  let imgSrc = $item('.picw img').attr('src')
  if (imgSrc && !imgSrc.startsWith('http')) {
    imgSrc = `https://www.telsu.fi${imgSrc}`
  }
  return imgSrc || null
}

function parseStart($item, date) {
  // Get time from .meta i element (e.g., "tänään 20.30 - 21.00" or "huomenna 00.00 - 00.30")
  const timeText = $item('.meta i').first().text().trim()
  
  // Match the start time (first time)
  const match = timeText.match(/(\d{1,2})\.(\d{2})/)
  if (!match) return null
  
  const HH = match[1].padStart(2, '0')
  const mm = match[2]
  
  let programDate = date.clone()
  
  // Check if it's "huomenna" (tomorrow)
  if (timeText.includes('huomenna')) {
    programDate = programDate.add(1, 'd')
  }
  
  // If time is very early (00:00-04:00) and not explicitly marked as tomorrow,
  // it might be the next day if current time is late
  const parsedHour = parseInt(HH)
  if (!timeText.includes('huomenna') && parsedHour < 4 && date.hour() > 20) {
    programDate = programDate.add(1, 'd')
  }
  
  return dayjs.tz(
    `${programDate.format('YYYY-MM-DD')} ${HH}:${mm}`,
    'YYYY-MM-DD HH:mm',
    'Europe/Helsinki'
  )
}

function parseStop($item, date) {
  // Get time from .meta i element (e.g., "tänään 20.30 - 21.00" or "huomenna 00.00 - 00.30")
  const timeText = $item('.meta i').first().text().trim()
  
  // Match the end time (after the dash)
  const match = timeText.match(/-\s*(\d{1,2})\.(\d{2})/)
  if (!match) {
    // If no end time, calculate from duration
    const durationMatch = timeText.match(/<small>(\d+)\s*h\s*(\d+)?/)
    if (durationMatch) {
      const hours = parseInt(durationMatch[1])
      const minutes = durationMatch[2] ? parseInt(durationMatch[2]) : 0
      const start = parseStart($item, date)
      if (start) {
        return start.add(hours, 'h').add(minutes, 'm')
      }
    }
    return null
  }
  
  const HH = match[1].padStart(2, '0')
  const mm = match[2]
  
  let programDate = date.clone()
  
  // Check if it's "huomenna" (tomorrow)
  if (timeText.includes('huomenna')) {
    programDate = programDate.add(1, 'd')
  }
  
  // If end time is earlier than start time (crosses midnight), add a day
  const start = parseStart($item, date)
  if (start) {
    const endHour = parseInt(HH)
    if (endHour < start.hour() && endHour < 6) {
      programDate = programDate.add(1, 'd')
    }
  }
  
  return dayjs.tz(
    `${programDate.format('YYYY-MM-DD')} ${HH}:${mm}`,
    'YYYY-MM-DD HH:mm',
    'Europe/Helsinki'
  )
}

function parseItems(content) {
  const $ = cheerio.load(content)
  
  // The program items are in divs with class "dets stat"
  const items = $('#res .dets.stat').toArray()
  
  return items
}
