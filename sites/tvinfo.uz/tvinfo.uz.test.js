const { parser, url } = require('./tvinfo.uz.config.js')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const cheerio = require('cheerio')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

const date = dayjs.utc('2024-12-19', 'YYYY-MM-DD').startOf('d')
const channel = { site_id: 'sevimli-tv', xmltv_id: 'SevimliTV.uz', lang: 'uz' }

it('can generate valid url', () => {
  expect(url({ channel, date })).toBe('https://tvinfo.uz/sevimli-tv?date=2024-12-19')
})

it('can parse response', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '__data__/content.html'))
  const results = parser({ date, content }).map(p => {
    p.start = p.start.toJSON()
    p.stop = p.stop.toJSON()
    return p
  })

  expect(results).toMatchObject({
    start: '2024-12-19T07:00:00.000Z',
    stop: '2024-12-19T07:10:00.000Z',
    title: 'Milliy serial'
  })
})


it('can handle empty guide', () => {
  const result = parser({
    date,
    channel: channel,
    content: '<!DOCTYPE html><html lang="ar" dir="rtl"><head></head><body></body></html>'
  })
  expect(result).toMatchObject([])
})