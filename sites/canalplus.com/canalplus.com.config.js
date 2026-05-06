const dayjs = require('dayjs')
const axios = require('axios')
const utc = require('dayjs/plugin/utc')

dayjs.extend(utc)

const paths = {
  ad: { zone: 'cpfra',  location: 'ad' },
  au: { zone: 'cpncl',  location: 'au' },
  bf: { zone: 'cpafr',  location: 'bf' },
  bi: { zone: 'cpafr',  location: 'bi' },
  bj: { zone: 'cpafr',  location: 'bj' },
  bl: { zone: 'cpant',  location: 'bl' },
  cd: { zone: 'cpafr',  location: 'cd' },
  cf: { zone: 'cpafr',  location: 'cf' },
  cg: { zone: 'cpafr',  location: 'cg' },
  ch: { zone: 'cpche',  location: null },
  ch_de: { zone: 'cpchd', location: null },
  ci: { zone: 'cpafr',  location: 'ci' },
  cm: { zone: 'cpafr',  location: 'cm' },
  cv: { zone: 'cpafr',  location: 'cv' },
  dj: { zone: 'cpafr',  location: 'dj' },
  et: { zone: 'cpeth',  location: 'et' },
  fr: { zone: null,     location: null },
  ga: { zone: 'cpafr',  location: 'ga' },
  gf: { zone: 'cpant',  location: 'gf' },
  gh: { zone: 'cpafr',  location: 'gh' },
  gm: { zone: 'cpafr',  location: 'gm' },
  gn: { zone: 'cpafr',  location: 'gn' },
  gp: { zone: 'cpafr',  location: 'gp' },
  gw: { zone: 'cpafr',  location: 'gw' },
  ht: { zone: 'cpant',  location: 'ht' },
  km: { zone: 'cpafr',  location: 'km' },
  mc: { zone: 'cpfra',  location: 'mc' },
  mf: { zone: 'cpant',  location: 'mf' },
  mg: { zone: 'cpmdg',  location: 'mg' },
  ml: { zone: 'cpafr',  location: 'ml' },
  mq: { zone: 'cpant',  location: 'mq' },
  mr: { zone: 'cpafr',  location: 'mr' },
  mu: { zone: 'cpmus',  location: 'mu' },
  nc: { zone: 'cpncl',  location: 'nc' },
  ne: { zone: 'cpafr',  location: 'ne' },
  pf: { zone: 'cppyf',  location: 'pf' },
  pl: { zone: null,     location: null },
  re: { zone: 'cpreu',  location: 're' },
  rw: { zone: 'cpafr',  location: 'rw' },
  sl: { zone: 'cpafr',  location: 'sl' },
  sn: { zone: 'cpafr',  location: 'sn' },
  td: { zone: 'cpafr',  location: 'td' },
  tg: { zone: 'cpafr',  location: 'tg' },
  wf: { zone: 'cpncl',  location: 'wf' },
  yt: { zone: 'cpreu',  location: 'yt' },
}

const globalHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://www.canalplus.com/',
  'Origin': 'https://www.canalplus.com',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site'
}

// Per-region token caching to avoid multiple concurrent calls and redundant token fetches
const tokenCache = {}
const tokenPending = {}

// ARCOM (ex-CSA) internal ratings mapping (https://www.arcom.fr/se-documenter/ressources-pedagogiques/protection-des-mineurs)
// values are negative to be sorted before other ratings if any
const CSA_RATING_MAP = { '2': '-10', '3': '-12', '4': '-16', '5': '-18' }

module.exports = {
  site: 'canalplus.com',
  days: 2,
  url: async function ({ channel, date }) {
    const [region, site_id] = channel.site_id.split('#')
    const currentRegion = region || 'fr'

    if (!tokenCache[currentRegion]) {
      // Prevents concurrent calls from same region
      if (!tokenPending[currentRegion]) {
        tokenPending[currentRegion] = parseToken(currentRegion).then(result => {
          tokenCache[currentRegion] = result
          if (Object.prototype.hasOwnProperty.call(tokenPending, currentRegion)) {
            tokenPending[currentRegion] = undefined
          }
          return result
        }).catch(err => {
          console.error(`Failed to get token for region ${currentRegion}:`, err.message)
          tokenPending[currentRegion] = undefined
          return null
        })
      }
      await tokenPending[currentRegion]
    }

    // If token is null (authentication failed), return null to skip this channel
    if (!tokenCache[currentRegion]?.token) {
      console.warn(`No token available for region ${currentRegion}, skipping channel ${site_id}`)
      return null
    }

    const path = currentRegion === 'pl' ? 'mycanalint' : 'mycanal'
    const diff = date.diff(dayjs.utc().startOf('d'), 'd')
    const token = tokenCache[currentRegion].token

    return `https://hodor.canalplus.pro/api/v2/${path}/channels/${token}/${site_id}/broadcasts/day/${diff}`
  },
  request: {
    headers() {
      return globalHeaders
    },
    timeout: 10000
  },
  async parser({ content }) {
    if (!content) return []
    
    let data
    try {
      data = JSON.parse(content)
    } catch (err) {
      console.error('Failed to parse content:', err.message)
      return []
    }
    
    const items = parseItems(data)
    if (!items.length) return []

    // Parallel loading of all program details with error handling
    const detailsArray = await Promise.all(items.map(item => loadProgramDetails(item).catch(err => {
      console.error('Failed to load program details:', err.message)
      return {}
    })))

    const programs = items.map((item, i) => {
      const info = parseInfo(detailsArray[i])
      const start = parseStart(item)
      if (!start) return null
      
      return {
        title: item.title || 'TBA',
        description: parseDescription(info),
        image: parseImage(info),
        actors: parseCast(info, 'Avec :'),
        director: parseCast(info, 'De :'),
        writer: parseCast(info, 'Scénario :'),
        composer: parseCast(info, 'Musique :'),
        presenter: parseCast(info, 'Présenté par :'),
        date: parseDate(info),
        rating: parseRating(info),
        start,
        stop: null
      }
    }).filter(p => p !== null) // Remove null entries

    // Sort programs by start time and set stop time of each program to the start time of the next one
    for (let i = 0; i < programs.length - 1; i++) {
      programs[i].stop = programs[i + 1].start
    }

    // Last program: fallback +1h if there is no next program
    const last = programs[programs.length - 1]
    if (last && last.start) {
      last.stop = last.start.add(1, 'h')
    }

    return programs
  },
  async channels({ country }) {
    const { zone, location } = paths[country] || {}
    const pathSegment = location ? `${zone}/${location}` : zone || country
    const url = `https://secure-webtv-static.canal-plus.com/metadata/${pathSegment}/all/v2.2/globalchannels.json`

    try {
      const data = await axios.get(url, { timeout: 10000 }).then(r => r.data)
      
      if (!data || !data.channels || !Array.isArray(data.channels)) {
        console.warn(`No channels data for country ${country}`)
        return []
      }

      return data.channels
        .filter(channel => channel.name && channel.name !== '.')
        .map(channel => ({
          lang: 'fr',
          site_id: country === 'fr' ? `#${channel.id}` : `${country}#${channel.id}`,
          name: channel.name
        }))
    } catch (err) {
      console.error(`Failed to fetch channels for ${country}:`, err.message)
      return []
    }
  }
}

async function parseToken(country) {
  const { zone, location } = paths[country] || {}

  let url
  if (country === 'fr') {
    url = 'https://hodor.canalplus.pro/api/v2/mycanal/authenticate.json/webapp/6.0?experiments=beta-test-one-tv-guide:control'
  } else if (country === 'pl') {
    url = 'https://hodor.canalplus.pro/api/v2/mycanalint/authenticate.json/webapp/6.0?experiments=beta-test-one-tv-guide:control'
  } else {
    url = `https://hodor.canalplus.pro/api/v2/mycanal/authenticate.json/webapp/6.0?experiments=beta-test-one-tv-guide:control&offerZone=${zone}&offerLocation=${location}`
  }

  try {
    const response = await axios.get(url, { 
      headers: globalHeaders, 
      timeout: 10000,
      // Don't automatically throw on 403, we'll handle it
      validateStatus: status => status < 500
    })
    
    // Check if we got HTML instead of JSON (bot protection)
    if (response.headers['content-type']?.includes('text/html')) {
      console.error(`Token endpoint returned HTML for ${country} - likely blocked by bot protection`)
      return { country, token: null }
    }
    
    if (response.status === 403) {
      console.error(`Token endpoint returned 403 for ${country} - access forbidden`)
      return { country, token: null }
    }
    
    const data = response.data
    if (!data || !data.token) {
      console.warn(`No token in response for ${country}`)
      return { country, token: null }
    }
    
    return { country, token: data.token }
  } catch (err) {
    console.error(`Failed to fetch token for ${country}:`, err.message)
    return { country, token: null }
  }
}

function parseStart(item) {
  return item?.startTime ? dayjs.utc(item.startTime) : null
}

function parseImage(info) {
  return info?.URLImage ?? null
}

function parseDescription(info) {
  return info?.summary ?? null
}

function parseInfo(data) {
  return data?.detail?.informations ?? null
}

async function loadProgramDetails(item) {
  if (!item?.onClick?.URLPage) return {}
  
  try {
    const response = await axios.get(item.onClick.URLPage, { 
      headers: globalHeaders,
      timeout: 10000
    })
    return response.data
  } catch (err) {
    console.error(`Failed to load program details for ${item.title}:`, err.message)
    return {}
  }
}

function parseItems(data) {
  if (!data || !Array.isArray(data.timeSlices)) return []
  return data.timeSlices.flatMap(s => s.contents || [])
}

function parseCast(info, type) {
  if (!info?.personnalities) return []
  const group = info.personnalities.find(i => i.prefix === type)
  if (!group) return []
  return group.personnalitiesList?.map(p => p.title) || []
}

function parseDate(info) {
  return info?.productionYear ?? null
}

function parseRating(info) {
  if (!info?.parentalRatings) return null
  const rating = info.parentalRatings.find(i => i.authority === 'CSA')
  if (!rating || Array.isArray(rating) || rating.value === '1') return null
  return {
    system: rating.authority,
    value: CSA_RATING_MAP[rating.value] ?? rating.value
  }
}
