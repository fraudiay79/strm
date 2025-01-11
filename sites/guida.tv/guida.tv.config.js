const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const debug = require('debug')('site:guida.tv')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

const detailedGuide = true
const tz = 'Europe/Rome'
const nworker = 25

module.exports = {
  site: 'guida.tv',
  days: 2,
  url: function ({ date, channel }) {
    return `https://www.guida.tv/programmi-tv/palinsesto/canale/${
      channel.site_id
    }.html?dt=${date.format('YYYY-MM-DD')}`
  },
  async parser({ content, date, channel }) {
    const programs = []

    if (content) {
      const queues = []
      const $ = cheerio.load(content)

      $('table.table > tbody > tr').toArray()
        .forEach(el => {
          const td = $(el).find('td:eq(1)')
          const title = td.find('h5 a')
          if (detailedGuide) {
            queues.push(title.attr('href'))
          } else {
            const subtitle = td.find('h6')
            const time = $(el).find('td:eq(0)')
            let start = parseTime(date, time.text().trim())
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
          const subTitle = parseText($('.tab-pane > h5 > strong'))
          const description = parseText($('.tab-pane > .tvbody > p'))
          const image = $('.program-media-image img').attr('src')
          const category = $('.schedule-attributes-genres span').toArray()
            .map(el => $(el).text()).slice(0, 3)
          const casts = $('.single-cast-head:not([id])').toArray()
            .map(el => {
              const cast = { name: parseText($(el).find('a')) }
              const [, role] = $(el).text().match(/\((.*)\)/) || [null, null]
              if (role) {
                cast.role = role
              }
              return cast
            })
          const [start, stop] = parseStartStop(date, time)
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
            image,
            category,
            season,
            episode,
            actor: casts.filter(c => c.role === 'Attore / Attrice').map(c => c.name).slice(0, 3),
            director: casts.filter(c => c.role === 'Regista').map(c => c.name),
            presenter: casts.filter(c => c.role === 'Conduttore').map(c => c.name),
            start,
            stop
          })
      })
      }
    }

    return programs
  },
  async channels() {
    const axios = require('axios')
    const _ = require('lodash')

    const providers = ['-1', '-2', '-3']

    const channels = []
    for (let provider of providers) {
      const data = await axios
        .post(`https://www.guida.tv/guide/schedule`, null, {
          params: {
            provider,
            region: 'Italy',
            TVperiod: 'Night',
            date: dayjs().format('YYYY-MM-DD'),
            st: 0,
            u_time: 1429,
            is_mobile: 1
          }
        })
        .then(r => r.data)
        .catch(console.log)

      const $ = cheerio.load(data)
      $('.channelname').each((i, el) => {
        const name = $(el).find('center > a:eq(1)').text()
        const url = $(el).find('center > a:eq(1)').attr('href')
        const [, number, slug] = url.match(/\/(\d+)\/(.*)\.html$/)

        channels.push({
          lang: 'it',
          name,
          site_id: `${number}/${slug}`
        })
      })
    }

    return _.uniqBy(channels, 'site_id')
  }
}

function parseStartStop(date, time) {
  const [s, e] = time.split(' - ');
  console.log(`Parsing time range: ${s} to ${e}`);
  const start = parseTime(date, s);
  let stop = parseTime(date, e);
  if (stop.isBefore(start)) {
    stop = stop.add(1, 'd');
  }
  console.log(`Parsed times: start = ${start.format('YYYY-MM-DD H:mm a')}, stop = ${stop.format('YYYY-MM-DD H:mm a')}`);
  return [start, stop];
}

function parseTime(date, time) {
  console.log(`Parsing time: ${time} on date: ${date.format('YYYY-MM-DD')}`);
  const parsedTime = dayjs.tz(`${date.format('YYYY-MM-DD')} ${time}`, 'YYYY-MM-DD H:mm a', tz);
  if (!parsedTime.isValid()) {
    console.error(`Invalid time value: ${time}`);
  }
  return parsedTime;
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
        resolve()
      }
    }, 500)
  })
}
