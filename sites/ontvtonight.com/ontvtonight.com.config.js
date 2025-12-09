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
  
  async parser({ content, date, channel }) {
    const programs = []

    if (content) {
      const queues = []
      const $ = cheerio.load(content)

      $('table.table > tbody > tr').toArray().forEach(el => {
        const td = $(el).find('td:eq(1)')
        const title = td.find('h5 a')
        if (detailedGuide) {
          queues.push(title.attr('href'))
        } else {
          const subtitle = td.find('h6')
          const time = $(el).find('td:nth-child(1) > h5')
          let start = parseTime(date, time.text().trim(), channel)
          const prev = programs[programs.length - 1]
          if (prev) {
            if (start.isBefore(prev.start)) {
              start = start.add(1, 'd')
              date = date.add(1, 'd')
            }
            prev.stop = start
          }
          const stop = start.add(30, 'm')
          programs.push({
            title: parseText(title),
            subTitle: parseText(subtitle),
            start,
            stop
          })
        }
      })

      if (queues.length) {
        await doFetch(queues, (url, res) => {
          const $ = cheerio.load(res)
          const time = $('center > h5 > b').text()
          const title = parseText($('.inner-heading.sub h2'))
          const subTitle = parseText($('.tab-pane > h4 > strong'))
          const description = parseText($('.tab-pane > .tvbody > p'))
          const icon = $('.program-media-image img, img.show-page-image, .show-page-image img').attr('src');
          const category = $('.schedule-attributes-genres span').toArray().map(el => $(el).text()).slice(0, 3)
          const casts = $('.single-cast-head:not([id])').toArray().map(el => {
            const cast = { name: parseText($(el).find('a')) }
            const [, role] = $(el).text().match(/\((.*)\)/) || [null, null]
            if (role) {
              cast.role = role
            }
            return cast
          })
          const [start, stop] = parseStartStop(date, time, channel);
          let season, episode
          if (subTitle) {
            const [, ses, epi] = subTitle.match(/Season (\d+), Episode (\d+)/) || [null, null]
            if (ses) {
              season = parseInt(ses)
            }
            if (epi) {
              episode = parseInt(epi)
            }
          }
          programs.push({
            title,
            subTitle,
            description,
            icon,
            category,
            season,
            episode,
            actor: casts.filter(c => c.role === 'Actor').map(c => c.name).slice(0, 3),
            director: casts.filter(c => c.role === 'Director').map(c => c.name),
            presenter: casts.filter(c => c.role === 'Presenter').map(c => c.name),
            start,
            stop
          })
        })
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
    for (let provider of providers[country]) {
      for (let zipcode of zipcodes[country]) {
        for (let region of regions[country]) {
          let url = 'https://www.ontvtonight.com'
          if (country === 'us') url += '/guide/schedule'
          else url += `/${country}/guide/schedule`
          const data = await axios
            .post(url, null, {
              params: {
                provider,
                region,
                zipcode,
                TVperiod: 'Night',
                date: dayjs().format('YYYY-MM-DD'),
                st: 0,
                is_mobile: 1
              }
            })
            .then(r => r.data)
            .catch(console.log)

          const $ = cheerio.load(data)
          $('.channelname').each((i, el) => {
            let name = $(el).find('center > a:eq(1)').text()
            name = name.replace(/\-\-/gi, '-')
            const url = $(el).find('center > a:eq(1)').attr('href')
            if (!url) return
            const [, number, slug] = url.match(/\/(\d+)\/(.*)\.html$/)

            channels.push({
              lang: 'en',
              name,
              site_id: `${country}#${number}/${slug}`
            })
          })
        }
      }
    }

    return _.uniqBy(channels, 'site_id')
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
  };
  const region = (channel.site_id || '').split('#')[0]
  const dateString = `${date.format('YYYY-MM-DD')} ${time}`

  return dayjs.tz(dateString, 'YYYY-MM-DD H:mm a', timezones[region])
}

function parseText($item) {
  let text = $item.text()
    .replace(/\t/g, '')
    .replace(/\n/g, ' ')
    .trim()
  while (true) {
    if (text.match(/  /)) {
      text = text.replace(/  /g, ' ')
      continue
    }
    break
  }

  return text
}


async function doFetch(queues, cb) {
  const axios = require('axios')

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
    const worker = () => {
      if (queues.length) {
        const queue = queues.shift()
        const done = res => {
          if (res) {
            cb(queue, res)
            adjustWorker()
          }
          worker()
        }
        const url = typeof queue === 'string' ? queue : queue.u
        const params = typeof queue === 'object' && queue.params ? queue.params : {}
        const method = typeof queue === 'object' && queue.m ? queue.m : 'get'
        debug(`fetch %s with %s`, url, JSON.stringify(params))
        if (method === 'post') {
          axios
            .post(url, params)
            .then(response => done(response.data))
            .catch(console.error)
        } else {
          axios
            .get(url, params)
            .then(response => done(response.data))
            .catch(console.error)
        }
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
        resolve();
      }
    }, 500)
  })
}
