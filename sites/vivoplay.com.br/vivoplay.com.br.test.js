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
            "Title": "Força de Mulher",
            "Description": "Bahar, uma jovem viúva que trabalha incansavelmente para dar uma vida melhor aos seus filhos, deve enfrentar seus fantasmas do passado e transformar a dor em força para seguir adiante e encontrar o amor.",
            "Start": 1735862400,
            "End": 1735865100,
            "ReleaseDate": 1483228800,
            "Images": {
                "VideoFrame": [
                    { "Url": "http://media.gvp.telefonica.com/storageArea0/IMAGES/00/20/46/20461304_404101FB47B253E1.jpg" }
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
      title: "Força de Mulher",
      start: "2025-01-03T00:00:00.000Z",
      stop: "2025-01-03T00:45:00.000Z",
      date: "2017-01-01T00:00:00.000Z",
      description: "Bahar, uma jovem viúva que trabalha incansavelmente para dar uma vida melhor aos seus filhos, deve enfrentar seus fantasmas do passado e transformar a dor em força para seguir adiante e encontrar o amor.",
      icon: {
        src: "https://spotlight-br.cdn.telefonica.com/customer/v1/source?image=http%3A%2F%2Fmedia.gvp.telefonica.com%2FstorageArea0%2FIMAGES%2F00%2F20%2F46%2F20461304_404101FB47B253E1.jpg&width=455&height=256&resize=CROP&format=JPEG"
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
