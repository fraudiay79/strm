const { parser, url, channels } = require('./vivoplay.com.br.config.js')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
dayjs.extend(utc)

const date = dayjs.utc('2025-01-03', 'YYYY-MM-DD').startOf('day')
const channel = {
  site_id: 'LCH95',
  xmltv_id: 'Record.br'
}

it('can generate valid url', () => {
  const generatedUrl = url({ date, channel })
  console.log('Generated URL:', generatedUrl)
  expect(generatedUrl).toBe('https://contentapi-br.cdn.telefonica.com/25/default/pt-BR/schedules?ca_deviceTypes=null%7C401&fields=Title,Description,Start,End,EpgSerieId,SeriesPid,SeasonPid,AgeRatingPid,ReleaseDate,images.videoFrame,images.banner&orderBy=START_TIME:a&filteravailability=false&starttime=1735862400&endtime=1735948800&livechannelpids=LCH95')
})

it('can parse response', () => {
  const content = `
  {
    "Content": [
        {
            "Title": "T1 EP1 - Sample Show",
            "Description": "This is a sample show.",
            "Start": 1735152000,
            "End": 1735155600,
            "ReleaseDate": 1735152000,
            "Images": {
                "VideoFrame": [
                    { "Url": "https://example.com/image.jpg" }
                ]
            }
        }
    ]
  }`

  const result = parser({ content }).map(p => {
    p.start = p.start.toISOString()
    p.stop = p.stop.toISOString()
    return p
  })

  expect(result).toMatchObject([
    {
      title: "T1",
      sub_title: "Sample Show",
      start: "2024-12-26T00:00:00.000Z",
      stop: "2024-12-26T01:00:00.000Z",
      date: "2024-12-26T00:00:00.000Z",
      description: "This is a sample show.",
      season: "1",
      episode: "1",
      icon: {
        src: "https://spotlight-br.cdn.telefonica.com/customer/v1/source?image=https%3A%2F%2Fexample.com%2Fimage.jpg&width=455&height=256&resize=CROP&format=JPEG"
      }
    }
  ])
})

it('can handle empty guide', () => {
  const result = parser({
    content: '{"Content":[]}'
  })
  expect(result).toMatchObject([])
})

it('can fetch channels', async () => {
  const fetchedChannels = await channels()
  console.log('Fetched channels:', fetchedChannels)
  expect(fetchedChannels.length).toBeGreaterThan(0)
})
