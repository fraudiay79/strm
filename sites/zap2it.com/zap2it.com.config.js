const dayjs = require('dayjs')

module.exports = {
  site: 'zap2it.com',
  days: 13,
  request: {
    method: 'POST',
    headers: {
  "accept": "*/*",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
  "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
  "pragma": "no-cache",
  "priority": "u=1, i",
  "sec-ch-ua": "\"Not A(Brand\";v=\"8\", \"Chromium\";v=\"132\", \"Google Chrome\";v=\"132\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Windows\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "x-requested-with": "XMLHttpRequest",
  "cookie": "OTGPPConsent=DBABBg~BUoAAAKA.QA; usprivacy=1YNN; G_ENABLED_IDPS=google; OneTrustWPCCPAGoogleOptOut=false; _gid=GA1.2.651670712.1738607806; _gat_gtag_UA_34133884_39=1; _ga_K1JQ1EGMN2=GS1.1.1738607806.2.1.1738609030.0.0.0; _ga=GA1.1.910964067.1736261854; OptanonConsent=isGpcEnabled=0&datestamp=Mon+Feb+03+2025+13%3A57%3A10+GMT-0500+(Eastern+Standard+Time)&version=202411.2.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=a74a4c6c-efb5-4896-9541-3a7c6049923c&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&GPPCookiesCount=1&groups=C0001%3A1%2CSPD_BG%3A1%2CC0002%3A1%2CC0004%3A1%2CC0003%3A1&AwaitingReconsent=false",
  "Referer": "https://tvlistings.zap2it.com/ss-list.html?aid=gapzap",
  "Referrer-Policy": "strict-origin-when-cross-origin"
}

  },
  url: function ({ date, channel }) {
    const todayEpoch = Math.floor(date.startOf('day').utc().valueOf() / 1000)
    return `https://tvlistings.zap2it.com/api/sslgrid?IsSSLinkNavigation=true&timespan=336&timestamp=${todayEpoch}&prgsvcid=${channel.site_id}&headendId=DITV&countryCode=USA&postalCode=32825&device=X&userId=-&aid=gapzap&DSTUTCOffset=-240&STDUTCOffset=-300&DSTStart=2025-03-09T02%3A00Z&DSTEnd=2025-11-02T02%3A00Z&languagecode=en-us`
  },
  parser({ content, channel }) {
    let programs = []
    const items = parseItems(content, channel)
    items.forEach(item => {
      if (!item.startTime || !item.endTime) return
      const start = dayjs(item.startTime)
      const stop = dayjs(item.endTime)
      programs.push({
        title: item.program.title,
        category: item.program.seriesGenres,
        description: item.program.shortDesc,
        image: item.program.thumbnail ? `https://zap2it.tmsimg.com/assets/${item.program.thumbnail}.jpg` : null,
        season: parseSeason(item.program),
        episode: parseEpisode(item.program),
        start,
        stop
      })
    })

    return programs
  },
  async channels() {
    const axios = require('axios')
    const data = await axios
      .get(`https://tvlistings.zap2it.com/api/grid?lineupId=USA-DITV-DEFAULT&timespan=2&headendId=DITV&country=USA&timezone=&device=X&postalCode=32825&isOverride=true&time=1738591200&pref=64%2C128&userId=-&aid=gapzap&languagecode=en-us`)
      .then(r => r.data)
      .catch(console.log)

    return data.channels.map(item => {
      return {
        lang: 'en',
        site_id: item.channelId,
        name: item.callSign
      }
    })
  }
}

function parseItems(content, channel) {
  const data = JSON.parse(content)
  if (!data || !Array.isArray(data.channels)) return []
  const channelData = data.channels.find(i => i.id === channel.site_id)

  return channelData && Array.isArray(channelData.events) ? channelData.events : []
}

function parseSeason(item) {
  const match = item.episode && item.episode.match(/S(\d+)/)
  return match ? match[1] : null
}

function parseEpisode(item) {
  const match = item.episode && item.episode.match(/E(\d+)/)
  return match ? match[1] : null
}
