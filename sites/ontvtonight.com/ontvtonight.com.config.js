const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const debug = require('debug')('site:ontvtonight.com')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

const detailedGuide = false // Set to false to avoid extra requests that might trigger rate limiting
const nworker = 5 // Reduced from 25 to avoid overwhelming the server
const retryCount = 3
const retryDelay = 2000 // 2 seconds between retries
const requestDelay = 500 // 0.5 second delay between requests

module.exports = {
  site: 'ontvtonight.com',
  days: 2,
  url: function ({ date, channel }) {
    const [region, id] = (channel.site_id || '').split('#')
    // Extract just the number part from id (remove anything after /)
    const channelId = id.split('/')[0]
    let url = 'https://www.ontvtonight.com'
    if (region && region !== 'us') url += `/${region}`
    url += `/guide/listings/channel/${channelId}.html?dt=${date.format('YYYY-MM-DD')}`
    
    return url
  },
  
  request: {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
      'Referer': 'https://www.ontvtonight.com/guide/'
    },
    timeout: 30000,
    maxRedirects: 5,
    retry: retryCount,
    delay: requestDelay
  },
  
  async parser({ content, date, channel }) {
    const programs = []
    
    if (!content) {
      debug(`No content for ${channel.name}`)
      return programs
    }
    
    try {
      const $ = cheerio.load(content)
      
      // Find the schedule table - works for US, Canada, and Australia
      let scheduleTable = null
      
      // Try different selectors based on site structure
      if ($('table#channel-schedule').length) {
        scheduleTable = $('table#channel-schedule')
      } else if ($('table.table').length) {
        scheduleTable = $('table.table')
      } else if ($('.table').length) {
        scheduleTable = $('.table')
      } else if ($('table').length && $('table').find('th:contains("Time")').length) {
        scheduleTable = $('table').first()
      }
      
      if (!scheduleTable || scheduleTable.length === 0) {
        debug(`No schedule table found for ${channel.name}`)
        return programs
      }
      
      // Collect all program data from the main schedule
      const programRows = []
      
      scheduleTable.find('tbody > tr').toArray().forEach(el => {
        const cells = $(el).find('td')
        if (cells.length < 2) return
        
        const timeCell = $(cells[0])
        const programCell = $(cells[1])
        
        // Get time text (works for all formats)
        let timeText = timeCell.find('h5').text().trim()
        if (!timeText) timeText = timeCell.text().trim()
        if (!timeText) return
        
        // Get title (works for all formats)
        let title = null
        const titleLink = programCell.find('h5 a, a')
        if (titleLink.length) {
          title = parseText(titleLink)
        } else {
          title = parseText(programCell.find('h5'))
          if (!title) title = parseText(programCell.clone().children().remove().end())
        }
        if (!title) return
        
        // Get subtitle (works for all formats including Canadian French)
        let subtitle = null
        const subtitleElem = programCell.find('h6, .episode-title, .program-subtitle')
        if (subtitleElem.length) {
          subtitle = parseText(subtitleElem)
        } else {
          // For Canadian format where subtitle is in the text
          const cellText = programCell.text()
          const titleEnd = cellText.indexOf(title)
          if (titleEnd >= 0) {
            let remaining = cellText.substring(titleEnd + title.length).trim()
            if (remaining && !remaining.match(/^\d+:\d+\s*(am|pm)/i)) {
              subtitle = remaining.replace(/\s*-\s*Season.*$/i, '').trim()
            }
          }
        }
        
        // Extract episode info (works for Canadian format with "Season X, Episode Y")
        let season, episode
        const episodeText = programCell.text()
        
        // Try multiple patterns for season/episode
        const seasonPatterns = [
          /Season\s*(\d+)[,\s]+Episode\s*(\d+)/i,
          /Saison\s*(\d+)[,\s]+Épisode\s*(\d+)/i,  // French Canadian
          /S(\d+):E(\d+)/i,
          /\(Season\s*(\d+),\s*Episode\s*(\d+)\)/i
        ]
        
        for (const pattern of seasonPatterns) {
          const match = episodeText.match(pattern)
          if (match) {
            season = parseInt(match[1])
            episode = parseInt(match[2])
            break
          }
        }
        
        // Check if it's a movie (look for year in parentheses)
        const isMovie = title.match(/\(\d{4}\)/) !== null || 
                        programCell.find('img[alt="TV Movie"]').length > 0 ||
                        episodeText.includes('(2023)') || 
                        episodeText.includes('(2024)') ||
                        episodeText.includes('(2025)') ||
                        episodeText.includes('(2026)')
        
        // Get the detail page URL if available
        const href = titleLink.attr('href')
        
        programRows.push({
          timeText,
          title: title.replace(/\s*\(\d{4}\)\s*$/, '').trim(), // Remove year from title for movies
          subtitle: subtitle,
          season,
          episode,
          isMovie,
          href: href ? (href.startsWith('http') ? href : `https://www.ontvtonight.com${href}`) : null
        })
      })
      
      if (programRows.length === 0) {
        debug(`No program rows found for ${channel.name}`)
        return programs
      }
      
      // Process programs in order to set correct start/stop times
      for (let i = 0; i < programRows.length; i++) {
        const program = programRows[i]
        
        let start = parseTime(date, program.timeText, channel)
        
        // Adjust for date rollover
        if (i > 0 && programs[i - 1] && programs[i - 1].start) {
          const prevStart = programs[i - 1].start
          if (start.isBefore(prevStart)) {
            start = start.add(1, 'd')
          }
          // Set previous program's stop time
          if (programs[i - 1] && !programs[i - 1].stop) {
            programs[i - 1].stop = start
          }
        }
        
        // Calculate duration based on next program
        let duration = 30 // default 30 minutes
        if (program.isMovie) {
          duration = 120 // movies typically 2 hours
        }
        
        if (i < programRows.length - 1) {
          const nextTime = parseTime(date, programRows[i + 1].timeText, channel)
          let nextStart = nextTime
          if (nextStart.isBefore(start)) {
            nextStart = nextStart.add(1, 'd')
          }
          duration = nextStart.diff(start, 'minutes')
          if (duration <= 0) duration = 30 // fallback
        }
        
        const stop = start.add(duration, 'minutes')
        
        // Create base program object
        const programObj = {
          title: program.title,
          subTitle: program.subtitle,
          start,
          stop
        }
        
        // Add season/episode if available
        if (program.season) programObj.season = program.season
        if (program.episode) programObj.episode = program.episode
        
        // Add movie indicator if applicable
        if (program.isMovie) {
          programObj.category = ['Movie']
        }
        
        programs.push(programObj)
      }
      
      // Ensure last program has a stop time (add 30 minutes)
      if (programs.length > 0 && !programs[programs.length - 1].stop) {
        programs[programs.length - 1].stop = programs[programs.length - 1].start.add(30, 'minutes')
      }
      
      debug(`Parsed ${programs.length} programs for ${channel.name}`)
      
    } catch (error) {
      console.log(`Error parsing content for ${channel.name}: ${error.message}`)
    }
    
    return programs
  },
  
  async channels({ country }) {
    const axios = require('axios')
    const _ = require('lodash')

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
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Referer': 'https://www.ontvtonight.com/'
    }

    for (let provider of providers[country]) {
      for (let zipcode of zipcodes[country]) {
        for (let region of regions[country]) {
          // Build URL with query parameters
          let baseUrl = 'https://www.ontvtonight.com'
          if (country === 'us') baseUrl += '/guide/schedule'
          else baseUrl += `/${country}/guide/schedule`
          
          const params = new URLSearchParams({
            provider,
            region: region || '',
            zipcode: zipcode || '',
            TVperiod: 'Night',
            date: dayjs().format('YYYY-MM-DD'),
            st: 0,
            is_mobile: 1
          })
          
          const url = `${baseUrl}?${params.toString()}`

          try {
            const response = await axios.get(url, {
              headers: headers,
              timeout: 30000,
              maxRedirects: 5
            })

            if (response.data) {
              const $ = cheerio.load(response.data)
              $('.channelname').each((i, el) => {
                let name = $(el).find('center > a:eq(1)').text()
                name = name.replace(/\-\-/gi, '-').trim()
                const channelUrl = $(el).find('center > a:eq(1)').attr('href')
                if (!channelUrl) return
                
                // Extract channel ID from URL
                const match = channelUrl.match(/\/(\d+)\/(.*)\.html$/)
                if (match) {
                  const [, number, slug] = match
                  if (number && slug) {
                    channels.push({
                      lang: 'en',
                      name: name,
                      site_id: `${country}#${number}`
                    })
                  }
                }
              })
            }
            
            // Add delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, requestDelay))
            
          } catch (error) {
            debug(`Error processing provider ${provider}: ${error.message}`)
          }
        }
      }
    }

    const uniqueChannels = _.uniqBy(channels, 'site_id')
    console.log(`Found ${uniqueChannels.length} channels for ${country}`)
    return uniqueChannels
  }
}

// Helper function to fetch with retry logic
async function fetchWithRetry(url, headers, retries = retryCount) {
  const axios = require('axios')
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        headers: headers,
        timeout: 30000,
        maxRedirects: 5
      })
      return response
    } catch (error) {
      if (i === retries - 1) throw error
      if (error.response && error.response.status === 405) {
        // If we get a 405, wait longer before retry (rate limiting)
        await new Promise(resolve => setTimeout(resolve, retryDelay * 2))
      } else {
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }
}

function parseTime(date, time, channel) {
  const timezones = {
    au: 'Australia/Sydney',
    ca: 'America/Toronto',
    us: 'America/New_York'
  }
  const region = (channel.site_id || '').split('#')[0]
  
  let timeStr = time.toLowerCase().trim()
  
  // Handle times without AM/PM (common in Canadian and Australian listings)
  if (!timeStr.includes('am') && !timeStr.includes('pm')) {
    const hour = parseInt(timeStr.split(':')[0])
    if (hour >= 12) {
      timeStr = timeStr + 'pm'
    } else {
      timeStr = timeStr + 'am'
    }
  }
  
  const dateString = `${date.format('YYYY-MM-DD')} ${timeStr}`
  
  return dayjs.tz(dateString, 'YYYY-MM-DD h:mm a', timezones[region])
}

function parseText($item) {
  if (!$item || !$item.length) return null
  let text = $item.text()
    .replace(/\t/g, '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text || null
}

// Keep for compatibility
async function doFetch(queues, cb) {
  const axios = require('axios')

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Referer': 'https://www.ontvtonight.com/guide/'
  }

  let n = Math.min(nworker, queues.length)
  const workers = []
  
  const adjustWorker = () => {
    if (queues.length > workers.length && workers.length < nworker) {
      let nw = Math.min(nworker, queues.length)
      if (n < nw) {
        n = nw
        createWorker()
      }
    }
  }
  
  const createWorker = () => {
    while (workers.length < n) {
      startWorker()
    }
  }
  
  const startWorker = () => {
    const worker = async () => {
      if (queues.length) {
        const url = queues.shift()
        try {
          const response = await axios.get(url, {
            headers: headers,
            timeout: 30000,
            maxRedirects: 5
          })
          
          if (response.data) {
            cb(url, response.data)
            adjustWorker()
          }
        } catch (error) {
          // Silent fail
        }
        worker()
      } else {
        workers.splice(workers.indexOf(worker), 1)
      }
    }
    workers.push(worker)
    worker()
  }
  
  createWorker()
  
  await new Promise(resolve => {
    const interval = setInterval(() => {
      if (workers.length === 0) {
        clearInterval(interval)
        resolve()
      }
    }, 500)
  })
}
