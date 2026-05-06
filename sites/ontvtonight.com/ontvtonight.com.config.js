const axios = require('axios')
const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const uniqBy = require('lodash.uniqby')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'ontvtonight.com',
  days: 2,
  url: function ({ date, channel }) {
    const [region, id] = channel.site_id.split('#')
    let url = 'https://www.ontvtonight.com'
    if (region && region !== 'us') url += `/${region}`
    url += `/guide/listings/channel/${id}.html?dt=${date.format('YYYY-MM-DD')}`
    
    return url
  },
  request: {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  },
  parser: function ({ content, date, channel }) {
    const programs = []
    
    // Check if content is valid
    if (!content || typeof content !== 'string') {
      console.warn(`No content received for channel ${channel.site_id}`)
      return []
    }
    
    const items = parseItems(content)
    
    if (!items || items.length === 0) {
      console.warn(`No program items found for channel ${channel.site_id}`)
      return []
    }
    
    items.forEach(item => {
      const prev = programs[programs.length - 1]
      const $item = cheerio.load(item)
      let start = parseStart($item, date, channel)
      
      // Skip if start time couldn't be parsed
      if (!start) {
        console.warn(`Could not parse start time for program on channel ${channel.site_id}`)
        return
      }
      
      if (prev) {
        if (start.isBefore(prev.start)) {
          start = start.add(1, 'd')
        }
        prev.stop = start
      }
      
      const stop = start.add(1, 'h')
      const title = parseTitle($item)
      
      if (!title) {
        console.warn(`No title found for program, skipping`)
        return
      }
      
      programs.push({
        title: title,
        description: parseDescription($item),
        start,
        stop
      })
    })

    return programs
  },
  async channels({ country }) {
    const providers = {
      au: ['o', 'a'],
      ca: [
        'Y464014423',
        '-464014503',
        '-464014594',
        '-464014738',
        'X3153330286',
        'X464014503',
        'X464013696',
        'X464014594',
        'X464014738',
        'X464014470',
        'X464013514',
        'X1210684931',
        'T3153330286',
        'T464014503',
        'T1810267316',
        'T1210684931'
      ],
      us: [
        'Y341768590',
        'Y1693286984',
        'Y8833268284',
        '-341767428',
        '-341769166',
        '-341769884',
        '-3679985536',
        '-341766967',
        'X4100694897',
        'X341767428',
        'X341768182',
        'X341767434',
        'X341768272',
        'X341769884',
        'X3679985536',
        'X3679984937',
        'X341764975',
        'X3679985052',
        'X341766967',
        'K4805071612',
        'K5039655414'
      ]
    }
    const regions = {
      au: [
        1, 2, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 17, 18, 29, 28, 27, 26, 25, 23, 22,
        21, 20, 19, 24, 30, 31, 32, 33, 34, 35, 36, 39, 38, 37, 40, 41, 42, 43, 44, 45, 46, 47, 48,
        49, 50, 51, 52, 53
      ],
      ca: [null],
      us: [null]
    }
    const zipcodes = {
      au: [null],
      ca: ['M5G1P5', 'H3B1X8', 'V6Z2H7', 'T2P3E6', 'T5J2Z2', 'K1P1B1'],
      us: [10199, 90052, 60607, 77201, 85026, 19104, 78284, 92199, 75260]
    }

    const channels = []
    
    for (let provider of providers[country]) {
      for (let zipcode of zipcodes[country]) {
        for (let region of regions[country]) {
          let url = 'https://www.ontvtonight.com'
          if (country === 'us') url += '/guide/schedule'
          else url += `/${country}/guide/schedule`
          
          try {
            // CHANGE: Use GET instead of POST with params as query string
            const params = new URLSearchParams({
              provider,
              region: region || '',
              zipcode: zipcode || '',
              TVperiod: 'Night',
              date: dayjs().format('YYYY-MM-DD'),
              st: 0,
              is_mobile: 1
            })
            
            const fullUrl = `${url}?${params.toString()}`
            
            const response = await axios.get(fullUrl, {
              timeout: 10000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
              }
            })
            
            const data = response.data
            
            // Check if we got HTML or an error page
            if (!data || data.includes('405') || data.includes('Method Not Allowed')) {
              console.warn(`Got 405 or error response for ${country} with provider ${provider}`)
              continue
            }
            
            const $ = cheerio.load(data)
            let foundChannels = 0
            
            $('.channelname').each((i, el) => {
              let name = $(el).find('center > a:eq(1)').text()
              if (!name) return
              
              name = name.replace(/--/gi, '-').trim()
              const url = $(el).find('center > a:eq(1)').attr('href')
              if (!url) return
              
              const match = url.match(/\/(\d+)\/(.*)\.html$/)
              if (!match) return
              
              const [, number, slug] = match
              
              channels.push({
                lang: 'en',
                name,
                site_id: `${country}#${number}/${slug}`
              })
              foundChannels++
            })
            
            if (foundChannels > 0) {
              console.log(`Found ${foundChannels} channels for ${country} with provider ${provider}`)
              // If we found channels, break out of loops to avoid duplicate requests
              break
            }
            
          } catch (err) {
            if (err.response?.status === 405) {
              console.warn(`405 error for ${country} - endpoint may have changed`)
            } else if (err.code === 'ECONNABORTED') {
              console.warn(`Timeout for ${country} request`)
            } else {
              console.warn(`Error fetching channels for ${country}: ${err.message}`)
            }
            // Continue to next provider/zipcode/region
          }
        }
      }
    }

    // If we found no channels through the schedule endpoint, try an alternative approach
    if (channels.length === 0) {
      console.warn(`No channels found via schedule endpoint for ${country}, trying alternative method...`)
      
      // Try to get channels from the main page
      try {
        const mainUrl = country === 'us' 
          ? 'https://www.ontvtonight.com/guide/'
          : `https://www.ontvtonight.com/${country}/guide/`
        
        const response = await axios.get(mainUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
          }
        })
        
        const $ = cheerio.load(response.data)
        
        // Look for channel links in the navigation or dropdown menus
        $('a[href*="/guide/listings/channel/"]').each((i, el) => {
          const href = $(el).attr('href')
          const match = href.match(/channel\/(\d+)\/(.*)\.html/)
          if (match) {
            const [, number, slug] = match
            const name = $(el).text().trim()
            
            if (name && number) {
              channels.push({
                lang: 'en',
                name: name,
                site_id: `${country}#${number}/${slug}`
              })
            }
          }
        })
        
        console.log(`Found ${channels.length} channels via alternative method for ${country}`)
        
      } catch (err) {
        console.error(`Alternative channel fetch failed for ${country}: ${err.message}`)
      }
    }

    return uniqBy(channels, 'site_id')
  }
}

function parseStart($item, date, channel) {
  const timezones = {
    au: 'Australia/Sydney',
    ca: 'America/Toronto',
    us: 'America/New_York'
  }
  const [region] = channel.site_id.split('#')
  
  // Try multiple selectors for time
  let timeString = $item('td:nth-child(1) > h5').text().trim()
  if (!timeString) {
    timeString = $item('.time, .program-time').first().text().trim()
  }
  
  if (!timeString) return null
  
  // Parse time formats like "7:00 PM" or "19:00"
  const dateString = `${date.format('YYYY-MM-DD')} ${timeString}`
  
  let parsedTime = dayjs.tz(dateString, 'YYYY-MM-DD h:mm A', timezones[region], true)
  
  // If that format fails, try 24-hour format
  if (!parsedTime.isValid()) {
    parsedTime = dayjs.tz(dateString, 'YYYY-MM-DD H:mm', timezones[region], true)
  }
  
  return parsedTime.isValid() ? parsedTime : null
}

function parseTitle($item) {
  let title = $item('td:nth-child(2) > h5').text().trim()
  if (!title) {
    title = $item('.title, .program-title').first().text().trim()
  }
  return title
}

function parseDescription($item) {
  let description = $item('td:nth-child(2) > h6').text().trim()
  if (!description) {
    description = $item('.description, .program-desc').first().text().trim()
  }
  return description
}

function parseItems(content) {
  const $ = cheerio.load(content)
  
  // Try multiple selectors for program items
  let items = $('#content > div > div > div > table > tbody > tr').toArray()
  
  if (items.length === 0) {
    items = $('.program-row, .epg-row, tr[data-program]').toArray()
  }
  
  if (items.length === 0) {
    items = $('table tbody tr').filter((i, el) => {
      return $(el).find('td').length >= 2
    }).toArray()
  }
  
  return items
}
