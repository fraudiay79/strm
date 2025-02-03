const dayjs = require('dayjs');
const axios = require('axios');
const axiosRetry = require('axios-retry');
const utc = require('dayjs/plugin/utc')

dayjs.extend(utc)

// Configure retry logic
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) => error.response && error.response.status === 503
});

module.exports = {
  site: 'zap2it.com',
  days: 2,
  request: {
    method: 'POST',
    headers: {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Origin': 'https://tvlistings.zap2it.com',
      'Referer': 'https://tvlistings.zap2it.com/ss-list.html?aid=gapzap',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      'Cookie': 'OTGPPConsent=DBABBg~BUoAAAKA.QA; usprivacy=1YNN; G_ENABLED_IDPS=google; OneTrustWPCCPAGoogleOptOut=false; _gid=GA1.2.651670712.1738607806; _gat_gtag_UA_34133884_39=1; _ga_K1JQ1EGMN2=GS1.1.1738614405.3.1.1738614406.0.0.0; _ga=GA1.1.910964067.1736261854; OptanonConsent=isGpcEnabled=0&datestamp=Mon+Feb+03+2025+15%3A26%3A47+GMT-0500+(Eastern+Standard+Time)&version=202411.2.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=a74a4c6c-efb5-4896-9541-3a7c6049923c&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&GPPCookiesCount=1&groups=C0001%3A1%2CSPD_BG%3A1%2CC0002%3A1%2CC0004%3A1%2CC0003%3A1&AwaitingReconsent=false'
    },
    data: function ({ date, channel }) {
      const timestamp = date.startOf('day').utc().valueOf();
      return `IsSSLinkNavigation=true&timespan=336&timestamp=${timestamp}&prgsvcid=${channel.site_id}&headendId=DITV&countryCode=USA&postalCode=32825&device=X&userId=-&aid=gapzap&isOverride=true&languagecode=en`
    }
  },
  url: 'https://tvlistings.zap2it.com/api/sslgrid',
  parser({ content, channel }) {
    let programs = [];
    const items = parseItems(content, channel);
    items.forEach(item => {
      if (!item.startTime || !item.endTime) return;
      const start = dayjs(item.startTime);
      const stop = dayjs(item.endTime);
      programs.push({
        title: item.title,
        category: item.seriesGenres,
        description: item.shortDesc,
        image: item.thumbnail ? `https://zap2it.tmsimg.com/assets/${item.thumbnail}.jpg` : null,
        season: parseSeason(item),
        episode: parseEpisode(item),
        start,
        stop
      });
    });

    return programs;
  },
  async channels() {
    const data = await axios
      .get(`https://tvlistings.zap2it.com/api/grid?lineupId=USA-DITV-DEFAULT&timespan=2&headendId=DITV&country=USA&timezone=&device=X&postalCode=32825&isOverride=true&time=1738591200&pref=64%2C128&userId=-&aid=gapzap&languagecode=en-us`)
      .then(r => r.data)
      .catch((error) => {
        console.error('Error fetching channels:', error.message);
        return { channels: [] }; // Return empty data if the request fails
      });

    return data.channels.map(item => {
      return {
        lang: 'en',
        site_id: item.channelId,
        name: item.callSign
      };
    });
  }
};

function parseItems(content, channel) {
  const data = JSON.parse(content);
  if (!data || !Array.isArray(data.channels)) return [];
  const channelData = data.channels.find(i => i.id === channel.site_id);
  return channelData && Array.isArray(channelData.events) ? channelData.events : [];
}

function parseSeason(item) {
  const match = item.episode && item.episode.match(/S(\d+)/);
  return match ? match[1] : null;
}

function parseEpisode(item) {
  const match = item.episode && item.episode.match(/E(\d+)/);
  return match ? match[1] : null;
}
