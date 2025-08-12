const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const puppeteer = require('puppeteer')
const axios = require('axios')

dayjs.extend(utc)

let cachedAuthHeaders = null
let lastAuthTime = null

async function getFreshAuthHeaders() {
  // Use cache if recent (5 minutes)
  if (cachedAuthHeaders && lastAuthTime && Date.now() - lastAuthTime < 300000) {
    return cachedAuthHeaders
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  })
  const page = await browser.newPage()

  try {
    // Navigate to the page that makes the API call
    await page.goto('https://sepehrtv.ir', { waitUntil: 'networkidle2' })

    // Wait for and intercept the API request to get the auth headers
    const authHeaders = await new Promise((resolve) => {
      page.on('request', (request) => {
        if (request.url().includes('sepehrapi.sepehrtv.ir/v3/epg/tvprogram')) {
          resolve(request.headers())
          browser.close()
        }
      })
    })

    cachedAuthHeaders = {
      ...baseHeaders,
      authorization: authHeaders.authorization
    }
    lastAuthTime = Date.now()

    return cachedAuthHeaders
  } catch (error) {
    console.error('Error getting fresh auth headers:', error)
    throw error
  } finally {
    await browser.close()
  }
}

const baseHeaders = {
  "accept": "*/*",
  "accept-language": "en-US,en;q=0.9",
  "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Windows\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "origin": "https://sepehrtv.ir",
  "referer": "https://sepehrtv.ir/"
}

module.exports = {
  site: 'sepehrtv.ir',
  days: 2,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel, date }) {
    const formattedDate = date.format('YYYY-MM-DD')
    return `https://sepehrapi.sepehrtv.ir/v3/epg/tvprogram?channel_id=${channel.site_id}&date=${formattedDate}`
  },
  async getRequestHeaders() {
    try {
      return await getFreshAuthHeaders()
    } catch (error) {
      console.error('Failed to get auth headers, falling back to base headers')
      return baseHeaders
    }
  },
  parser({ content }) {
    let data
    try {
      data = JSON.parse(content)
    } catch (error) {
      console.error('Error parsing JSON:', error)
      return []
    }

    const programs = []

    if (data && Array.isArray(data.list)) {
      data.list.forEach(item => {
        if (!item || !item.start || !item.duration) return

        const start = dayjs.utc(item.start)
        const stop = start.add(item.duration, 'm')

        programs.push({
          title: item.title,
          description: item.descSummary || item.descFull || '',
          start,
          stop
        })
      })
    }

    return programs
  },
  async channels() {
    try {
      const headers = await getFreshAuthHeaders()
      const response = await axios.get(
        'https://sepehrapi.sepehrtv.ir/v3/channels/?key=tv1&include_media_resources=true&include_details=true',
        { headers }
      )

      if (!response.data || !Array.isArray(response.data.list)) {
        console.error('Error: No channels data found')
        return []
      }

      return response.data.list.map(channel => ({
        lang: 'fa',
        site_id: channel.id,
        name: channel.name
      }))
    } catch (error) {
      console.error('Error fetching channels:', error)
      return []
    }
  }
}
