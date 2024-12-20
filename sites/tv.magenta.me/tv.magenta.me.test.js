const { parser, url } = require('./tv.magenta.me.config.js')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const customParseFormat = require('dayjs/plugin/customParseFormat')
dayjs.extend(customParseFormat)
dayjs.extend(utc)

const API_ENDPOINT = 'https://tv-me-prod.yo-digital.com/me-bifrost'

jest.mock('axios')

const date = dayjs.utc('2024-12-19', 'YYYY-MM-DD').startOf('d')
const channel = {
  site_id: '359840295985',
  xmltv_id: 'StarMovies.me',
  lang: 'me'
}

it('can generate valid url', () => {
  expect(url({ date, channel })).toBe(
    `${API_ENDPOINT}/epg/channel/schedules/v2?station_ids=359840295985&date=2022-10-30&hour_offset=15&hour_range=3&natco_code=me`
  )
})

it('can parse response', async () => {
  const content = fs.readFileSync(path.resolve(__dirname, '__data__/content_1500.json'))

  axios.get.mockImplementation(url => {
    if (
      url ===
      `${API_ENDPOINT}/epg/channel/schedules/v2?date=2024-12-19&hour_offset=15&hour_range=3&station_ids=359840295985&natco_code=me`
    ) {
      return Promise.resolve({
        data: fs.readFileSync(path.resolve(__dirname, '__data__/content_1800.json'))
      })
    } else if (
      url ===
      `${API_ENDPOINT}/epg/channel/schedules/v2?date=2024-12-19&hour_offset=18&hour_range=3&station_ids=359840295985&natco_code=me`
    ) {
      return Promise.resolve({
        data: fs.readFileSync(path.resolve(__dirname, '__data__/content_2100.json'))
      })
    } else if (
      url === `${API_ENDPOINT}/details/series/tva-SHW131326?natco_key=ANKB5xVVywklLUd9WtEOh8eyLnlAypTM&interacted_with_nPVR=false&app_language=me&natco_code=me`
    ) {
      return Promise.resolve({
        data: JSON.parse(fs.readFileSync(path.resolve(__dirname, '__data__/program.json')))
      })
    } else {
      return Promise.resolve({ data: '' })
    }
  })

  let results = await parser({ content, channel, date })
  results = results.map(p => {
    p.start = p.start.toJSON()
    p.stop = p.stop.toJSON()
    return p
  })

  expect(results[0]).toMatchObject({
    start: '2024-12-19T19:00:00.00Z',
    stop: '2024-12-19T21:10:00.00Z',
    title: 'Venčanje mog najboljeg prijatelja',
    description:
      'Ava ist 17 und eine geniale Hackerin. Jetzt steht die Teenagerin vor Gericht, weil sie sich illegal Zugang zum Verteidigungsministerium verschafft hat. Todd soll das IT-Genie überwachen.',
    date: '1997',
    category: ['Movie'],
    actors: [
      'Marcia Gay Harden',
      'Skylar Astin',
      'Madeline Wise',
      'Tristen J. Winger',
      'Inga Schlingmann',
      'Rosa Evangelina Arredondo',
      'Laila Robins'
    ],
    directors: ['Jay Karas'],
    producers: [
      'Scott Prendergast',
      'Liz Kruger',
      'Elizabeth Klaviter',
      'Dr. Phil McGraw',
      'Jay McGraw',
      'Julia Eisenman',
      'Amy York Rubin'
    ],
    season: 1,
    episode: 15
  })
})

it('can handle empty guide', async () => {
  let results = await parser({ content: '', channel, date })

  expect(results).toMatchObject([])
})