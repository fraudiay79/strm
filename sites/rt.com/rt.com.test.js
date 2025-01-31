const { parser, url } = require('./rt.com.config.js')
const dayjs = require('dayjs')

const date = dayjs.utc('2025-01-31', 'YYYY-MM-DD').startOf('d')
const channel = {
  site_id: 'rt.com',
  xmltv_id: 'RT.ru'
}

it('can generate valid url', () => {
  expect(url({ date })).toBe(`https://www.rt.com/schedulejson/news/${date.format('DD-MM-YYYY')}`)
})

it('can parse response', () => {
  const content = JSON.stringify([
    {
      "timeLabel": "00:00",
      "name": "News",
      "description": "",
      "code": "NEWS",
      "program": { "$oid": "100000000000002200000122" },
      "telecast": null,
      "time": 1738368000,
      "programHref": "/bulletin-board/news/",
      "programTitle": "News",
      "summary": "RT news, interviews and shows available as podcasts you can download for free. Our coverage focuses on international headlines, giving an innovative angle set to challenge viewers worldwide."
    },
    {
      "timeLabel": "00:30",
      "name": "Documentary",
      "description": "",
      "code": "D140624-1",
      "program": { "$oid": "100000000000002200000001" },
      "telecast": { "$oid": "666b157485f5407f2f1a0d20" },
      "time": 1738369800,
      "telecastHref": "/shows/documentary/599229-americans-moved-russia-life-stories/",
      "telecastTitle": "Why I moved to Russia",
      "telecastShortTitle": "",
      "telecastCode": "D140624-1",
      "telecastSummary": "",
      "programHref": "/shows/documentary/",
      "programTitle": "Documentary",
      "summary": "RT's documentaries give a varied and unique view on different aspects of life worldwide. They expose outdated myths and stereotypes, reveal intriguing history and geography, showcase varied wildlife and exquisite cuisines, introduce you to vibrant nightlife and curious customs. Original footage of historical events and sharp analysis of contemporary politics will give you a deeper understanding of what made history take this or that turn. RT's documentaries go beyond the bare facts, thoroughly investigating the issues and giving the viewer a chance to see below the surface."
    }
  ])

  const result = parser({ content }).map(p => {
    p.start = p.start.toJSON()
    p.stop = p.stop.toJSON()
    return p
  })

  expect(result).toMatchObject([
    {
      start: '2025-01-31T00:00:00.000Z',
      stop: '2025-01-31T00:30:00.000Z',
      title: 'News',
      sub_title: null,
      description: 'RT news, interviews and shows available as podcasts you can download for free. Our coverage focuses on international headlines, giving an innovative angle set to challenge viewers worldwide.'
    },
    {
      start: '2025-01-31T00:30:00.000Z',
      stop: '2025-01-31T01:00:00.000Z',
      title: 'Documentary',
      sub_title: 'Why I moved to Russia',
      description: 'RT\'s documentaries give a varied and unique view on different aspects of life worldwide. They expose outdated myths and stereotypes, reveal intriguing history and geography, showcase varied wildlife and exquisite cuisines, introduce you to vibrant nightlife and curious customs. Original footage of historical events and sharp analysis of contemporary politics will give you a deeper understanding of what made history take this or that turn. RT\'s documentaries go beyond the bare facts, thoroughly investigating the issues and giving the viewer a chance to see below the surface.'
    }
  ])
})

it('can handle empty guide', () => {
  const result = parser({
    content: '{"date":"2025-01-31","categories":[],"channels":[]}'
  })
  expect(result).toMatchObject([])
})
