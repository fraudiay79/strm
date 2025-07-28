const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'meuguia.tv',
  days: 2,
  url({ channel }) {
    return `https://meuguia.tv/programacao/canal/${channel.site_id}`
  },
  parser({ content, date }) {
    const programs = []
    parseItems(content, date).forEach(item => {
      if (dayjs.utc(item.start).isSame(date, 'day')) {
        programs.push(item)
      }
    })
    return programs
  },
  async channels() {
    const channels = []
    const axios = require('axios')
    const baseUrl = 'https://meuguia.tv'

    let seq = 0
    const queues = [baseUrl]
    while (queues.length) {
      const url = queues.shift()
      const content = await axios
        .get(url)
        .then(response => response.data)
        .catch(console.error)

      if (content) {
        const [ $, items ] = getItems(content)
        if (seq === 0) {
          queues.push(...items.map(category => baseUrl + $(category).attr('href')))
        } else {
          items.forEach(item => {
            const href = $(item).attr('href')
            channels.push({
              lang: 'pt',
              site_id: href.substring(href.lastIndexOf('/') + 1),
              name: $(item).find('.licontent h2').text().trim()
            })
          })
        }
      }
      seq++
    }

    return channels
  }
}

function getItems(content) {
  const $ = cheerio.load(content)
  return [$, $('div.mw ul li a').toArray()]
}

function parseItems(content, date) {
  const result = []
  const $ = cheerio.load(content)

  let lastDate = null

  for (const item of $('ul.mw li').toArray()) {
    const $item = $(item)

    if ($item.hasClass('subheader')) {
      const headerParts = $item.text().split(', ')
      if (headerParts.length > 1) {
        lastDate = `${headerParts[1]}/${date.format('YYYY')}`
      } else {
        console.warn('Malformed subheader, skipping:', $item.text())
        lastDate = null
      }
    } else if ($item.hasClass('divider')) {
      continue
    } else if (lastDate) {
      const timeText = $item.find('.time').text().trim()
      const fullDateTime = `${lastDate} ${timeText}`
      const parsedStart = dayjs.tz(fullDateTime, 'DD/MM/YYYY HH:mm', 'America/Sao_Paulo')

      if (!parsedStart.isValid()) {
        console.warn('Invalid start time, skipping:', fullDateTime)
        continue
      }

      const title = $item.find('a').attr('title')?.trim() || 'Untitled'
      const data = { title, start: parsedStart }

      const epMatch = title.match(/T(\d+) EP(\d+)/)
      if (epMatch) {
        data.season = parseInt(epMatch[1])
        data.episode = parseInt(epMatch[2])
      }

      result.push(data)
    } else {
      console.warn('Item encountered before valid date context:', $item.text())
    }
  }

  // Assign stop time from next item's start time
  for (let i = 0; i < result.length - 1; i++) {
    result[i].stop = result[i + 1].start
  }

  return result
}
