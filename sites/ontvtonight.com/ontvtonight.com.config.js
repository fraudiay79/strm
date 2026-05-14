const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const debug = require('debug')('site:ontvtonight.com')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

const detailedGuide = true
const nworker = 25

module.exports = {
  site: 'ontvtonight.com',
  days: 2,
  url: function ({ date, channel }) {
    const [region, id] = (channel.site_id || '').split('#')
    let url = 'https://www.ontvtonight.com'
    if (region && region !== 'us') url += `/${region}`
    url += `/guide/listings/channel/${id}.html?dt=${date.format('YYYY-MM-DD')}`

    return url
  },
  
  request: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'Referer': 'https://www.ontvtonight.com/guide/'
    },
    timeout: 30000
  },
  
  async parser({ content, date, channel }) {
    const programs = []
    
    if (content) {
      const $ = cheerio.load(content)
      
      // First, collect all program data from the main schedule
      const programRows = []
      
      $('table#channel-schedule > tbody > tr').toArray().forEach(el => {
        const timeCell = $(el).find('td:eq(0)')
        const programCell = $(el).find('td:eq(1)')
        const timeText = timeCell.find('h5').text().trim()
        const titleLink = programCell.find('h5 a')
        const title = parseText(titleLink)
        const subtitle = parseText(programCell.find('h6'))
        
        // Extract episode info if present
        let season, episode
        const episodeText = programCell.find('h6 i').text()
        if (episodeText) {
          const [, ses, epi] = episodeText.match(/Season (\d+), Episode (\d+)/) || [null, null]
          if (ses) season = parseInt(ses)
          if (epi) episode = parseInt(epi)
        }
        
        // Check if it's a movie (has movie badge)
        const isMovie = programCell.find('img[alt="TV Movie"]').length > 0
        
        // Get the detail page URL
        const href = titleLink.attr('href')
        
        programRows.push({
          timeText,
          title,
          subtitle: subtitle ? subtitle.split(' - ')[0] : null, // Clean subtitle
          season,
          episode,
          isMovie,
          href: href ? (href.startsWith('http') ? href : `https://www.ontvtonight.com${href}`) : null
        })
      })
      
      // Process programs in order to set correct start/stop times
      for (let i = 0; i < programRows.length; i++) {
        const program = programRows[i]
        let start = parseTime(date, program.timeText, channel)
        
        // Adjust for date rollover
        if (i > 0) {
          const prevStart = programs[i - 1].start
          if (start.isBefore(prevStart)) {
            start = start.add(1, 'd')
          }
          // Set previous program's stop time
          programs[i - 1].stop = start
        }
        
        // Estimate duration (default 2 hours for movies, 30 mins for shows)
        let duration = program.isMovie ? 120 : 30
        if (i < programRows.length - 1) {
          const nextTime = parseTime(date, programRows[i + 1].timeText, channel)
          let nextStart = nextTime
          if (nextStart.isBefore(start)) {
            nextStart = nextStart.add(1, 'd')
          }
          duration = nextStart.diff(start, 'minutes')
        }
        
        const stop = start.add(duration, 'minutes')
        
        // Create base program object
        const programObj = {
          title: program.title,
          subTitle: program.subtitle,
          season: program.season,
          episode: program.episode,
          start,
          stop
        }
        
        // If detailed guide is enabled and we have a detail URL, fetch additional info
        if (detailedGuide && program.href && !program.isMovie) {
          try {
            const detailContent = await fetchDetailPage(program.href)
            if (detailContent) {
              const $detail = cheerio.load(detailContent)
              
              // Extract detailed information
              const description = parseText($detail('.tab-pane > .tvbody > p, .program-description'));
              const icon = $detail('.program-media-image img, img.show-page-image, .show-page-image img').attr('src');
              
              // Extract categories/genres
              const category = $detail('.schedule-attributes-genres span, .genre-tags a').toArray()
                .map(el => $(el).text())
                .slice(0, 3);
              
              // Extract cast and crew
              const casts = [];
              $detail('.single-cast-head:not([id]), .cast-member').toArray().forEach(el => {
                const name = parseText($(el).find('a, .cast-name'));
                const roleText = $(el).text();
                const [, role] = roleText.match(/\((.*)\)/) || [null, null];
                if (name) {
                  casts.push({
                    name: name,
                    role: role || null
                  });
                }
              });
              
              // Update program with detailed info
              programObj.description = description;
              programObj.icon = icon;
              programObj.category = category;
              programObj.actor = casts.filter(c => c.role === 'Actor' || (!c.role && c.name)).map(c => c.name).slice(0, 3);
              programObj.director = casts.filter(c => c.role === 'Director').map(c => c.name);
              programObj.presenter = casts.filter(c => c.role === 'Presenter').map(c => c.name);
              
              // Add a small delay to avoid overwhelming the server
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (error) {
            console.log(`Error fetching details for ${program.title}: ${error.message}`);
            // Continue with basic info if detail fetch fails
          }
        }
        
        programs.push(programObj)
      }
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
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1'
    }

    for (let provider of providers[country]) {
      for (let zipcode of zipcodes[country]) {
        for (let region of regions[country]) {
          // Build URL with query parameters instead of POST body
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
            const response = await axios
              .get(url, {  // Changed from POST to GET
                headers: headers,
                timeout: 30000,
                maxRedirects: 5
              })

            if (response.data) {
              const $ = cheerio.load(response.data)
              $('.channelname').each((i, el) => {
                let name = $(el).find('center > a:eq(1)').text()
                name = name.replace(/\-\-/gi, '-')
                const url = $(el).find('center > a:eq(1)').attr('href')
                if (!url) return
                const [, number, slug] = url.match(/\/(\d+)\/(.*)\.html$/) || []

                if (number && slug) {
                  channels.push({
                    lang: 'en',
                    name,
                    site_id: `${country}#${number}/${slug}`
                  })
                }
              })
            }
          } catch (error) {
            console.log(`Error processing provider ${provider}, zipcode ${zipcode}, region ${region}: ${error.message}`)
            // Continue with next iteration instead of failing completely
            continue
          }
        }
      }
    }

    return _.uniqBy(channels, 'site_id')
  }
}

// Helper function to fetch detail pages with proper error handling
async function fetchDetailPage(url) {
  const axios = require('axios')
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Referer': 'https://www.ontvtonight.com/guide/',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'Upgrade-Insecure-Requests': '1'
  }
  
  try {
    const response = await axios.get(url, {
      headers: headers,
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: function(status) {
        return status === 200 // Only resolve for 200 status
      }
    })
    
    return response.data
  } catch (error) {
    if (error.response) {
      console.log(`Detail page fetch failed for ${url}: Status ${error.response.status}`)
    } else if (error.request) {
      console.log(`Detail page fetch failed for ${url}: No response received`)
    } else {
      console.log(`Detail page fetch failed for ${url}: ${error.message}`)
    }
    return null
  }
}

function parseStartStop(date, time, channel) {
  const [s, e] = time.split(' - ')
  const start = parseTime(date, s, channel)
  let stop = parseTime(date, e, channel)
  if (stop.isBefore(start)) {
    stop = stop.add(1, 'd')
  }

  return [start, stop]
}

function parseTime(date, time, channel) {
  const timezones = {
    au: 'Australia/Sydney',
    ca: 'America/Toronto',
    us: 'America/New_York'
  }
  const region = (channel.site_id || '').split('#')[0]
  const dateString = `${date.format('YYYY-MM-DD')} ${time}`

  return dayjs.tz(dateString, 'YYYY-MM-DD H:mm a', timezones[region])
}

function parseText($item) {
  if (!$item || !$item.length) return null
  let text = $item.text()
    .replace(/\t/g, '')
    .replace(/\n/g, ' ')
    .trim()
  while (text.includes('  ')) {
    text = text.replace(/  /g, ' ')
  }
  return text || null
}

async function doFetch(queues, cb) {
  const axios = require('axios')

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
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
          console.log(`Error fetching ${url}: ${error.message}`)
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
