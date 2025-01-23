const axios = require('axios')
const dayjs = require('dayjs')

const BASIC_TOKEN = 'N2JjNWNjMTEtYWFiNi00ZmRlLTk0MTQtOThmOGNkYmY2NGI0'

let session;

const API_ENDPOINT = 'https://skgo.magio.tv/v2/television'

module.exports = {
  site: 'magentatv_test.sk',
  days: 2,
  request: {
    async headers() {
      if (!session) {
        session = await loadSessionDetails();
        if (!session || !session.access_token) return null;
      }

      return {
        Authorization: `Bearer ${session.access_token}`,
        Referer: 'https://magiogo.sk/',
        Origin: 'https://magiogo.sk'
      }
    },
    cache: {
      ttl: 24 * 60 * 60 * 1000 // 1 day
    }
  },
  url({ channel, date }) {
    return `${API_ENDPOINT}/epg?filter=channel.id=in=(${channel.site_id});startTime=ge=${date.format('YYYY-MM-DDTHH:mm:ss.000')};startTime=le=${date.add(1, 'days').subtract(1, 's').format('YYYY-MM-DDTHH:mm:ss.000')}&lang=SK`
  },
  parser({ content }) {
    try {
      const programs = []
      const data = JSON.parse(content)
      for (const channelItem of data.items) {
        const channelId = channelItem.channel.channelId
        if (Array.isArray(channelItem.programs)) {
          channelItem.programs.forEach(item => {
            programs.push({
              title: item.program.title,
              subtitle: item.program.episodeTitle,
              description: item.program.description,
              icon: item.program.images[0],
              season: item.program.programValue.seasonNumber,
              episode: item.program.programValue.episodeId,
              actors: item.program.programRole.actors.map(actor => actor.fullName).join(', '),
              directors: item.program.programRole.directors.map(director => director.fullName).join(', '),
              start: dayjs(item.startTime),
              stop: dayjs(item.endTime)
            })
          })
        }
      }

      return programs
    } catch (error) {
      console.error('Error parsing content:', error)
      return []
    }
  },
  async channels() {
    if (!session || !session.access_token) {
      session = await loadSessionDetails();
      if (!session || !session.access_token) {
        console.error('Error: Unable to retrieve session or access_token.');
        return [];
      }
    }

    const data = await axios
      .get(`${API_ENDPOINT}/channels?list=LIVE&queryScope=LIVE`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          Referer: 'https://magiogo.sk/',
          Origin: 'https://magiogo.sk'
        }
      })
      .then(r => r.data)
      .catch(console.log)

    return data.items.map(item => {
      return {
        lang: 'sk',
        site_id: item.channel.channelId,
        name: item.channel.name
      }
    })
  }
}

async function loadSessionDetails() {
  return axios
    .post('https://skgo.magio.tv/v2/auth/init', {}, {
      params: {
        "refreshToken": `${BASIC_TOKEN}`
      },
      headers: {
        'Referer': 'https://magiogo.sk/',
        'Origin': 'https://magiogo.sk',
        'Pragma': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site'
      }
    })
    .then(r => r.data)
    .catch(error => {
      console.error('Error loading session details:', error)
      return null
    })
}
