const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const fetch = require('node-fetch')
const { upperCase } = require('lodash')

let X_CSRFTOKEN
let COOKIE
const cookiesToExtract = ['JSESSIONID', 'CSESSIONID', 'CSRFSESSION']
const extractedCookies = {}

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'ipko.tv',
  days: 5,
  request: {
    method: 'POST',
    headers: function () {
      return setHeaders()
    },
  },
  url() {
    return `https://stargate.ipko.tv/api/titan.tv.WebEpg/EpgFilter`
  },
  parser: function ({ content }) {
    let programs = []
    const items = parseItems(content)

    items.forEach(item => {
        //const start = dayjs.utc(item.asset.startTime)
        //const stop = dayjs.utc(item.asset.endTime)
      programs.push({
        title: item.shows.title,
        image: item.shows.thumbnail,
        start: dayjs.unix(item.shows.show_start),
        stop: dayjs.unix(item.shows.show_end)
      })
    })
    return programs;
  },
  
  async channels() {
    const axios = require('axios')
    const data = await axios
      .get(`https://stargate.ipko.tv/api/titan.tv.WebEpg/EpgFilter`)
      .then(r => r.data)
      .catch(console.log)
    return data.channels.map(item => {
      return {
        lang: 'sq',
        name: item.channel_name,
        site_id: item.channel_id
      }
    })
  }
}


function parseItems(content) {
  const data = JSON.parse(content)
  if (!data || !Array.isArray(data.channels)) return []

  return data.channels
}

// Function to try to fetch COOKIE and X_CSRFTOKEN
function fetchCookieAndToken() {
  return fetch(
    'https://stargate.ipko.tv/api/titan.tv.WebEpg/EpgFilter',
    {
      headers: {
        accept: 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'x-requested-with': 'XMLHttpRequest',
        Origin: 'https://ipko.tv',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      },
      body: '{"terminalid":"00:00:00:00:00:00","mac":"00:00:00:00:00:00","terminaltype":"WEBTV","utcEnable":1,"timezone":"Etc/GMT0","userType":3,"terminalvendor":"Unknown"}',
      method: 'POST'
    }
  )
    .then(response => {
      // Check if the response status is OK (2xx)
      if (!response.ok) {
        throw new Error('HTTP request failed')
      }

      // Extract the set-cookie header
      const setCookieHeader = response.headers.raw()['set-cookie']

      // Extract the cookies specified in cookiesToExtract
      cookiesToExtract.forEach(cookieName => {
        const regex = new RegExp(`${cookieName}=(.+?)(;|$)`)
        const match = setCookieHeader.find(header => regex.test(header))

        if (match) {
          const cookieValue = regex.exec(match)[1]
          extractedCookies[cookieName] = cookieValue
        }
      })

      return response.json()
    })
    .then(data => {
      if (data.csrfToken) {
        X_CSRFTOKEN = data.csrfToken
        COOKIE = `JSESSIONID=${extractedCookies.JSESSIONID}; CSESSIONID=${extractedCookies.CSESSIONID}; CSRFSESSION=${extractedCookies.CSRFSESSION}; JSESSIONID=${extractedCookies.JSESSIONID};`
      } else {
        console.log('csrfToken not found in the response.')
      }
    })
    .catch(error => {
      console.error(error)
    })
}

function setHeaders() {
  return fetchCookieAndToken().then(() => {
    return {
      X_CSRFTOKEN: X_CSRFTOKEN,
      'Content-Type': 'application/json',
      Cookie: COOKIE
    }
  })
}
