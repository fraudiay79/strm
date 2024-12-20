const { url, parser } = require('./stod2.is.config.js')
const fs = require('fs')
const path = require('path')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc)
dayjs.extend(timezone)

const date = dayjs.utc('2024-12-19', 'YYYY-MM-DD').startOf('day')
const channel = { site_id: 'stod2', xmltv_id: 'Stod2.is', lang: 'is' }

it('can generate valid url', () => {
  expect(url({ channel, date })).toBe('https://api.stod2.is/dagskra/api/stod2/2024-12-19')
})

it('can parse response', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '__data__/content.json'), 'utf8')
  let results = parser({ content })
  results = results.map(p => {
    p.start = p.start.toJSON()
    p.stop = p.stop.toJSON()
    return p
  })

  expect(results).toMatchObject({
    start: '2024-12-19T08:00:00.000Z',
    stop: '2024-12-19T08:15:00.000Z',
    title: 'Heimsókn',
    sub_title: 'Signý Jóna Tryggvadóttir',
    description: 'Frábærir þættir með Sindra Sindrasyni sem lítur inn hjá íslenskum fagurkerum. Heimilin eru jafn ólík og þau eru mörg en eiga það þó eitt sameiginlegt að vera sett saman af alúð og smekklegheitum. Sindri hefur líka einstakt lag á að ná fram því besta í viðmælendum sínum.'
  })
})


it('can handle empty guide', () => {
  const results = parser({ content: '' })

  expect(results).toMatchObject([])
})