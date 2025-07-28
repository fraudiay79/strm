const dayjs = require('dayjs')
const axios = require('axios')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const doFetch = require('@ntlab/sfetch')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

let session

module.exports = {
  site: 'kplus.vn',
  days: 2,
  url({ channel, date }) {
    return `https://tvapi-sgn.solocoo.tv/v1/assets?query=schedule,forrelated,${
      channel.site_id
    }&from=${date.format('YYYY-MM-DDTHH:mm:ss[Z]')}&limit=1000`
  },
  request: {
    async headers() {
      if (!session) {
        session = await loadSessionDetails()
        if (!session || !session.token) return null
      }

      return {
        authorization: `Bearer ${session.token}`
      }
    }
  },
  parser: function ({ content, date }) {
    let programs = []
    const items = parseItems(content, date)
    items.forEach(item => {
      programs.push({
        title: item.title,
        categories: parseCategories(item),
        images: parseImages(item),
        start: parseStart(item),
        stop: parseStop(item)
      })
    })

    return programs
  },
  async channels() {
    const session = await loadSessionDetails()
    if (!session || !session.token) throw new Error('The session token is missing')

    const groups = [
      'Channels_Kplus',
      'Channels_VTV',
      'Channels_VTVcab',
      'Channels_Kênh Quốc Tế',
      'Channels_SCTV',
      'Channels_HTV-HTVC',
      'Channels_THVL',
      'Channels_Kênh Thiết Yếu',
      'Channels_Kênh Địa Phương'
    ]

    const queue = groups.map(group => ({
      url: `https://tvapi-sgn.solocoo.tv/v1/assets?query=nav,${group}&limit=100`,
      params: {
        headers: {
          authorization: `Bearer ${session.token}`
        }
      }
    }))

    let channels = []
    await doFetch(queue, (url, data) => {
      data.assets.forEach(channel => {
        channels.push({
          lang: 'vi',
          name: channel.params.internalTitle.replace('Channels_', ''),
          site_id: channel.params.params.id
        })
      })
    })

    return channels
  }
}

function parseCategories(item) {
  return Array.isArray(item?.params?.genres) ? item.params.genres.map(i => i.title) : []
}

function parseImages(item) {
  return Array.isArray(item?.images)
    ? item.images
        .filter(i => i.url.indexOf('orientation=landscape') > 0)
        .map(i => `${i.url}&w=460&h=260`)
    : []
}

function parseStart(item) {
  return item?.params?.start ? dayjs.utc(item.params.start, 'YYYY-MM-DDTHH:mm:ss[Z]') : null
}

function parseStop(item) {
  return item?.params?.end ? dayjs.utc(item.params.end, 'YYYY-MM-DDTHH:mm:ss[Z]') : null
}

function parseItems(content, date) {
  try {
    const data = JSON.parse(content)
    if (!data || !Array.isArray(data.assets)) return []

    return data.assets.filter(
      p => p?.params?.start && date.isSame(dayjs.utc(p.params.start, 'YYYY-MM-DDTHH:mm:ss[Z]'), 'd')
    )
  } catch (err) {
    console.log(err)
    return []
  }
}

function loadSessionDetails() {
  return axios
    .post('https://tvapi-sgn.solocoo.tv/v1/session', {
      brandName: 'K+',
      demo: true,
      token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0di5zb2xvY29vLmF1dGgiOnsicyI6IndiNjhhYzdiMC02YjY2LTExZjAtYmNlZC03MzVkNWRjN2FmOWUiLCJ1Ijoia0Y1LThwYktTeHJkQXg3SnJyUWxTQSIsImwiOiJlbl9VUyIsImQiOiJQQyIsImRtIjoiQ2hyb21lIiwib20iOiJPIiwiYyI6InFPLVdhX0lYRkJjQ3g1WkdPOWJsYU9uWVoxYXJUQzhiWXp5ZXpqV2tpUmciLCJzdCI6ImZ1bGwiLCJnIjoiZXlKaWNpSTZJblp6ZEhZaUxDSjFjQ0k2SW1Od2FTSXNJbVJpSWpwbVlXeHpaU3dpY0hRaU9tWmhiSE5sTENKa1pTSTZJbUp5WVc1a1RXRndjR2x1WnlKOSIsImYiOjcsImIiOiJ2c3R2In0sIm5iZiI6MTc1MzY3NTA0MywiZXhwIjoxNzUzNjkyNDE3LCJpYXQiOjE3NTM2NzUwNDMsImF1ZCI6ImNwaSJ9.VRDhLYXehZSQNk0RbhXodXCtn8m4FBqEGbopeRtaq1c',
      params: {
        'FPData.FPTimeInterval': 120,
        'FPData.FPIsAliveUrl': 'https://fp.kplus.vn/api/fp/isalivesg',
        'User.Status': 'sg.ui.sso.user.status.anonymous',
        'FPData.FPKey': 'uZnqUXcx96ZpSOry9oxAFJp83MK4GHgEVre6nCsGDM0=',
        'FPData.FPKeyGenDate': 1486305098
      },
      ssoToken:
        'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2Iiwia2V5IjoidnN0diJ9..AY5EkwCdINfZMfrWci2LiA.M14gNlF_Fhgkh3gaRzx7nGbneFhIvbhahTbA0AZlgSRoc-MYncKBU0neEhVZy_UP134VRlyjnL_X8ZlOc2SbNc-jCm8zogA8sldcNJ_iJr0b3tS5MW6rKFOSri1tiIs7gPib5vbA7iZrNbob-_pqsgBy5R8RHlcXL2PtTEHKJ5PKicBsUu53zOH9MQtKfPlkWnglGg8v9130y7TMskwdz2J2OaBmoS94uTp3KVxux6hkifP9dKboIjcvgH5s6BdO2rSnF_-oC13oQOOx3kegGo6UNF2GCP_cEF5p8byV7HFJ1Hl-Me82iXJfmqC1IVQyIa2M442ehgHgNDvFgparuQDyaJ3ABZ8TCnH6PfhnTftPHlJtJyLJt6tAilgWP6M5aprgMSm_9gsj0GxhloUJOLoI-Zwr2bJEvtiyzobZ-ukaYAHSdeVJ5dxTfP1JOATGnD_G_pnidMI58kUh-P8xicF04eXABTqBQnOQz_RjkkI.5in5jW2z3SL35zLgEs-jsA',
      language: 'en_US',
      userName: 'HGac_Dx8ylYn8T9G3GjuzQ',
      userLogin: 'HGac_Dx8ylYn8T9G3GjuzQ@vstv.solocoo.tv',
      consent: false,
      userId: 'f27e5e90-ca96-1a4b-dd03-1ec9aeb42548',
      countryCode: 'VN',
      communityName: 'VSTV'
    })
    .then(r => r.data)
    .catch(console.log);
}
