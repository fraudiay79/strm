const axios = require('axios')
const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const _ = require('lodash')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
require('dayjs/locale/es')

const regionPaths = {
  '2356': 'bo',
  '2313': 'ar',
  '2354': 'cl',
  '2770': 'co',
  '2295': 'cr',
  '2685': 'uy',
  '2919': 've',
  '2687': 'ar',
  '2694': 've'
}

const regionTimezones = {
  '2356': 'America/La_Paz',
  '2313': 'America/Argentina/Buenos_Aires',
  '2354': 'America/Santiago',
  '2770': 'America/Bogota',
  '2295': 'America/Costa_Rica',
  '3269': 'America/Guayaquil',
  '3129': 'America/Mexico_City',
  '2685': 'America/Montevideo',
  '2919': 'America/Caracas',
  '2694': 'America/Caracas',
  '2687': 'America/Argentina/Buenos_Aires'
}

module.exports = {
  site: 'inter.com.ve',
  days: 2,

  url: async function ({ channel, date }) {
    const [region, site_id] = channel.site_id.split('#')
    const path = regionPaths[region]
    const formData = new URLSearchParams()
    formData.append('idSenial', site_id)
    formData.append('Alineacion', path)
    formData.append('DiaDesde', date.format('YYYY/MM/DD'))
    formData.append('HoraDesde', '00:00:00')

    const response = await axios
      .post('https://www.reportv.com.ar/buscador/ProgXSenial.php', formData)
      .then(r => r.data.toString())
      .catch(console.error)

    return response
  },

  async parser({ content, date, channel }) {
    const [region] = channel.site_id.split('#')
    let programs = []
    const items = parseItems(content, date)

    for (let item of items) {
      const $item = cheerio.load(item)
      const start = parseStart($item, date, region)
      const duration = parseDuration($item)
      const stop = start.add(duration, 's')
      const details = await loadProgramDetails($item)

      programs.push({
        title: parseTitle($item),
        category: parseCategory($item),
        icon: details.image,
        description: details.description,
        directors: details.directors,
        actors: details.actors,
        start,
        stop
      })
    }

    return programs
  },

  async channels({ country }) {
    const countryPaths = {
      ar: ['2313'],
      ve: ['2694'],
      bo: ['2356'],
      cl: ['2354'],
      co: ['2770'],
      cr: ['2295'],
      uy: ['2685']
    }

    let channels = []
    const pathIds = countryPaths[country] || []

    for (const aid of pathIds) {
      const url = `https://www.reportv.com.ar/buscador/Buscador.php?aid=${aid}`

      const data = await axios
        .get(url)
        .then(r => r.data)
        .catch(console.error)

      const $ = cheerio.load(data)
      const items = $('#tr_home_2 > td:nth-child(1) > select > option').toArray()

      items.forEach(item => {
        const site_id = `${aid}#${$(item).attr('value')}`
        const name = $(item).text().trim()
        if (name !== '.') {
          channels.push({
            lang: 'es',
            site_id,
            name
          })
        }
      })
    }

    return channels
  }
}

// --- Helpers Below ---

function parseStart($item, date, region) {
  const timezone = regionTimezones[region] || 'UTC'
  const [time] = $item('div:nth-child(1) > span').text().split(' - ')
  return dayjs.tz(`${date.format('YYYY-MM-DD')} ${time}`, 'YYYY-MM-DD HH:mm', timezone)
}

function parseDuration($item) {
  const [hh, mm, ss] = $item('div:nth-child(4) > span').text().split(':')
  return parseInt(hh) * 3600 + parseInt(mm) * 60 + parseInt(ss)
}

function parseTitle($item) {
  const [, title] = $item('div:nth-child(1) > span').text().split(' - ')
  return title
}

function parseCategory($item) {
  return $item('div:nth-child(3) > span').text()
}

function parseImage($) {
  const src = $('#ImgProg').attr('src')
  return new URL(src, 'https://www.reportv.com.ar/buscador/').href
}

function parseActors($) {
  const section = $('#Ficha > div').html()?.split('<br>').find(str => str.includes('Actores:'))
  if (!section) return []
  const $section = cheerio.load(section)
  return $section('span').map((i, el) => $section(el).text().trim()).get()
}

function parseDirectors($) {
  const section = $('#Ficha > div').html()?.split('<br>').find(str => str.includes('Directores:'))
  if (!section) return []
  const $section = cheerio.load(section)
  return $section('span').map((i, el) => $section(el).text().trim()).get()
}

function parseDescription($) {
  return $('#Sinopsis > div').text().trim()
}

function parseItems(content, date) {
  if (!content) return []
  const $ = cheerio.load(content)
  const d = _.startCase(date.locale('es').format('DD MMMM YYYY'))
  return $(`.trProg[title*="${d}"]`).toArray()
}

async function loadProgramDetails($item) {
  const onclick = $item('*').attr('onclick')
  const match = onclick?.match(/detallePrograma\((\d+),(\d+),(\d+),(\d+),'([^']+)'\)/)
  if (!match) return {}

  const [, id, idc, id_alineacion, idp, title] = match
  const formData = new URLSearchParams()
  formData.append('id', id)
  formData.append('idc', idc)
  formData.append('id_alineacion', id_alineacion)
  formData.append('idp', idp)
  formData.append('title', title)

  const content = await axios
    .post('https://www.reportv.com.ar/buscador/DetallePrograma.php', formData)
    .then(r => r.data.toString())
    .catch(console.error)

  const $ = cheerio.load(content)
  return {
    image: parseImage($),
    actors: parseActors($),
    directors: parseDirectors($),
    description: parseDescription($)
  }
}
