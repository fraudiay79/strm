const axios = require('axios')
const dayjs = require('dayjs')
const cheerio = require('cheerio')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'tvpassport.com',
  days: 3,
  url({ channel, date }) {
    return `https://www.tvpassport.com/tv-listings/stations/${channel.site_id}/${date.format(
      'YYYY-MM-DD'
    )}`
  },
  request: {
    headers: {
      Cookie: 'cisession=e49ff13191d6875887193cae9e324b44ef85768d;'
    }
  },
  parser: function ({ content }) {
    let programs = []
    const items = parseItems(content)
    for (let item of items) {
      const $item = cheerio.load(item)
      const start = parseStart($item)
      const duration = parseDuration($item)
      const stop = start.add(duration, 'm')
      let title = parseTitle($item)
      let sub_title = parseSubTitle($item)
      if (title === 'Movie') {
        title = sub_title
        sub_title = null
      }

      programs.push({
        title,
        sub_title,
        description: parseDescription($item),
	episode: parseEpisodeNumber($item),
        icon: parseImage($item),
        category: parseCategory($item),
        rating: parseRating($item),
        actors: parseActors($item),
        guest: parseGuest($item),
        director: parseDirector($item),
        start,
        stop
      })
    }

    return programs
  },
  async channels() {
    const xml = await axios
      .get('https://www.tvpassport.com/sitemap.stations.xml')
      .then(r => r.data)
      .catch(console.error)

    let channels = []

    const $ = cheerio.load(xml)

    const elements = $('loc').toArray()

    let total = elements.length
    let i = 1
    for (let el of elements) {
      const url = $(el).text()
      const [, site_id] = url.match(/\/tv\-listings\/stations\/(.*)$/)

      console.log(`[${i}/${total}]`, url)

      const channelPage = await axios
        .get(url)
        .then(r => r.data)
        .catch(err => console.error(err.message))

      if (!channelPage) continue

      const $channelPage = cheerio.load(channelPage)
      const title = $channelPage('meta[property="og:title"]').attr('content')
      const name = title.replace('TV Schedule for ', '')

      channels.push({
        lang: 'en',
        site_id,
        name
      })

      i++
    }

    return channels
  }
}

function parseDescription($item) {
  return $item('*').data('data-description')
}

function parseImage($item) {
  const showpicture = $item('*').data('data-showPicture')
  const url = new URL(showpicture, 'https://cdn.tvpassport.com/image/show/960x540/')

  return url.href
}

function parseTitle($item) {
  return $item('*').data('data-showName')
}

function parseSubTitle($item) {
  return $item('*').data('data-episodeTitle')
}

function parseEpisodeNumber($item) {
  return $item('*').data('data-episodeNumber')
}

function parseCategory($item) {
  const showtype = $item('*').data('data-showType')

  return showtype ? showtype.split(', ') : []
}

function parseActors($item) {
  const cast = $item('*').data('data-cast')

  return cast ? cast.split(', ') : []
}

function parseDirector($item) {
  const director = $item('*').data('data-director')

  return director ? director.split(', ') : []
}

function parseGuest($item) {
  const guest = $item('*').data('data-guest')

  return guest ? guest.split(', ') : []
}

function parseRating($item) {
  const rating = $item('*').data('data-rating')

  return rating
    ? {
        system: 'MPA',
        value: rating.replace(/^TV/, 'TV-')
      }
    : null
}

function parseStart($item) {
  const time = $item('*').data('data-st')

  return dayjs.tz(time, 'YYYY-MM-DD HH:mm:ss', 'America/New_York')
}

function parseDuration($item) {
  const duration = $item('*').data('data-duration')

  return parseInt(duration)
}

function parseItems(content) {
  if (!content) return []
  const $ = cheerio.load(content)

  return $('.station-listings .list-group-item').toArray()
}
