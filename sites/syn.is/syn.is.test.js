const { parser, url } = require('./syn.is.config.js')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const timezone = require('dayjs/plugin/timezone')
const axios = require('axios')

dayjs.extend(utc)
dayjs.extend(customParseFormat)
dayjs.extend(timezone)

jest.mock('axios')

const date = dayjs.utc('2025-07-18', 'YYYY-MM-DD').startOf('day')
const channel = { site_id: 'syn', xmltv_id: 'Syn.is' }

const mockEpgData = JSON.stringify([
  {
"midill": "SYN",
"midill_heiti": "Sýn",
"dagsetning": "2025-07-18T00:00:00Z",
"upphaf": "2025-07-18T07:00:00Z",
"titill": "Gullnu könnuðirnir",
"isltitill": "Dóra könnuður",
"undirtitill": "Gullnu könnuðirnir",
"seria": 2,
"thattur": 9,
"thattafjoldi": 26,
"birta_thatt": 1,
"opin": 0,
"beint": 0,
"frumsyning": 0,
"framundan_i_beinni": 0,
"tegund": "SER",
"flokkur": "Animation,Children",
"adalhlutverk": "",
"leikstjori": "",
"ar": "",
"bannad": "Green",
"recidefni": 594405951,
"recidlidur": 594406884,
"recidsyning": null,
"frelsi": 0,
"netdagar": 0,
"lysing": "Áfram, áfram landkönnuðir! Dóra og vinir hennar hafa búið til fótboltalið og keppa við stóru Risaeðlurnar. Getur Dóra skotið boltanum í mark og skorað? ",
"slott": 20,
"slotlengd": "00:20"
}
])

it('can generate valid url', () => {
  const generatedUrl = url({ date, channel })
  console.log('Generated URL:', generatedUrl)
  expect(generatedUrl).toBe('https://www.syn.is/api/epg/syn/2025-07-18')
})

it('can parse response', () => {
  const content = mockEpgData
  const result = parser({ content }).map(p => {
    p.start = p.start.toISOString()
    p.stop = p.stop.toISOString()
    return p
  })

  expect(result).toMatchObject([
    {
      title: "Dóra könnuður",
      sub_title: "Gullnu könnuðirnir",
      description: "Áfram, áfram landkönnuðir! Dóra og vinir hennar hafa búið til fótboltalið og keppa við stóru Risaeðlurnar. Getur Dóra skotið boltanum í mark og skorað? ",
      actors: "",
      directors: "",
      start: "2025-07-18T07:00:00.000Z",
      stop: "2025-07-18T07:20:00.000Z"
    }
  ])
})

it('can handle empty guide', () => {
  const result = parser({ content: '[]' })
  expect(result).toMatchObject([])
})
