const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const cheerio = require('cheerio')

// Extend dayjs with plugins
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

const tz = 'Europe/Moscow'

module.exports = {
  site: 'ntvplus.ru',
  days: 7, // maxdays=7
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    headers: {
      'Accept-Encoding': 'gzip, deflate, br'
    }
  },
  url({ channel, date }) {
    const formattedDate = date.format('DD.MM.YYYY')
    return `https://ntvplus.ru/tv/ajax/tv?genre=all&date=${formattedDate}&tz=0&search=&channel=${channel.site_id}&offset=0`
  },
  async parser({ content, date }) {
    const [$, items] = parseItems(content)
    const programs = await Promise.all(
      items.map(async item => {
        const $item = $(item)
        const start = parseStart($item, date)
        const details = await loadProgramDetails($item)
        
        return {
          title: details.title || '',
          sub_title: details.sub_title || '',
          description: details.description || '',
          category: details.category || '',
          actors: details.actors || [],
          director: details.director || '',
          season: details.season || '',
          episode: details.episode || '',
          icon: details.icon || '',
          start
        }
      })
    )

    const validPrograms = programs.filter(item => item.start).sort((a, b) => a.start - b.start)

    // Fill start-stop
    for (let i = 0; i < validPrograms.length; i++) {
      if (i < validPrograms.length - 1) {
        validPrograms[i].stop = validPrograms[i + 1].start
      } else {
        validPrograms[i].stop = dayjs.tz(`${date.add(1, 'd').format('YYYY-MM-DD')} 00:00`, 'YYYY-MM-DD HH:mm', tz)
      }
    }

    return validPrograms.filter(p => p.start && p.start.isSame(date, 'd'))
  },
  async channels() {
    try {
      const response = await axios.get('https://ntvplus.ru/tv/ajax/tv?genre=all&date=now&tz=0&search=&channel=&offset=0')
      const html = response.data
      const $ = cheerio.load(html)
      
      const channels = []

      $('.channel-header').each((index, element) => {
        const name = $(element).find('.link--inherit').text().trim()
        const site_id = $(element).find('[data-favorite]').attr('data-favorite')
        
        if (name && site_id) {
          channels.push({ lang: 'ru', name, site_id })
        }
      })
      
      return channels
    } catch (error) {
      console.error('Error fetching channel data:', error)
      return []
    }
  }
}

function parseStart($item, date) {
  const time = $item.find('.tv-schedule--item-time').text().trim()
  if (time) {
    return dayjs.tz(`${date.format('YYYYMMDD')} ${time}`, 'YYYYMMDD HH:mm', tz)
  }
}

async function loadProgramDetails($item) {
  const programId = $item.find('a').attr('href')
  const data = await axios
    .get(`https://ntvplus.ru${programId}`)
    .then(r => r.data)
    .catch(console.error)

  if (!data) return Promise.resolve({})

  const $ = cheerio.load(data)

  return {
    title: $('.program--title').text().trim() || '',
    icon: $('.program--sliders-full img').first().attr('src') || '',
    actors: $('div.program--fields-item:contains("В ролях")')
      .next('.program--fields-value')
      .find('span[itemprop="actor"]')
      .slice(0, 3)
      .map((i, el) => $(el).text().trim() || '')
      .get(),
    director: $('div.program--fields-item:contains("Режиссеры")')
      .next('.program--fields-value')
      .find('span[itemprop="director"]')
      .first()
      .text()
      .trim() || '',
    description: $('.program--text').text().trim() || '',
    category: $('.program--fields-key:contains("Тип")').next().text().trim() || '',
    sub_title: $('.program--desc').text().trim() || '',
    season: $('.program--series-title').text().split(',')[0].trim() || '',
    episode: $('.program--series-title').text().split(',')[1].trim() || ''
  }
}

function parseItems(content) {
  const $ = cheerio.load(content)
  return [$, $('.tv-schedule--item').toArray()]
}
