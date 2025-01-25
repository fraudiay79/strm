const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const API_ENDPOINT = 'https://tvapi.solocoo.tv/v1';
let session;

module.exports = {
  site: 'focussat.ro',
  days: 2,
  delay: 5000,
  url({ channel, date }) {
    return `${API_ENDPOINT}/schedule?channels=${channel.site_id}&from=${date.format('YYYY-MM-DDTHH:mm:ss.SSS')}Z&until=${date.add(1, 'days').format('YYYY-MM-DDTHH:mm:ss.SSS')}Z`;
  },
  request: {
    async headers() {
      if (!session) {
        session = await loadSessionDetails();
        if (!session || !session.token) return null;
      }

      return {
        Authorization: `Bearer ${session.token}`,
        Origin: 'https://livetv.focussat.ro',
        Referer: 'https://livetv.focussat.ro/'
      };
    }
  },
  parser: async function ({ content }) {
    let programs = [];
    const items = parseItems(content);
    for (const item of items) {
      const detail = await loadProgramDetails(item.id);
      programs.push({
        id: item.id,
        title: detail.title || item.title,
        description: detail.description || '',
        icon: parseImages(item) || '',
        actors: parseRoles(detail, 'sg.ui.role.Cast') || [],
        directors: parseRoles(detail, 'sg.ui.role.Producer') || [],
        season: item.params ? item.params.seriesSeason : null,
        episode: item.params ? item.params.seriesEpisode : null,
        start: parseStart(item),
        stop: parseStop(item)
      });
    }

    return programs;
  },
  async channels() {
    const session = await loadSessionDetails();
    if (!session || !session.token) throw new Error('The session token is missing');

    const data = await axios.get(`${API_ENDPOINT}/bouquet`, {
      headers: {
        Authorization: `Bearer ${session.token}`
      }
    }).then(r => r.data).catch(console.error);

    return data.channels.map(item => ({
      lang: 'ro',
      site_id: item.assetInfo.id,
      name: item.assetInfo.title
    }));
  }
};

async function fetchSessionData(ssoToken, token) {
  const url = 'https://tvapi.solocoo.tv/v1/session';

  try {
    const response = await axios.post(url, {
      "userName": "Demo Chrome 131.0.0.0",
      "demo": true,
      "userLogin": "demo_fsro_fNxR2lPk118zQE9K3d9uWg",
      "userId": "9c6e0419-f77f-0b59-f309-9cfc8175b954",
      "countryCode": "RO",
      "communityName": "Focus Sat",
      "ssoToken": ssoToken,
      "update": true,
      "language": "en_US",
      "brandName": "Focus Sat",
      "token": token,
      "consent": false
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = response.data;

    const ssoTokenResponse = data.ssoToken;
    const provisionData = data.token; // Assigning token to provisionData

    console.log('Fetched session data successfully:', { ssoToken: ssoTokenResponse, provisionData });
    return { ssoToken: ssoTokenResponse, provisionData };
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

async function loadSessionDetails() {
  // Assume these values are dynamically obtained for each session
  const dynamicSsoToken = "your_dynamic_ssoToken_here";
  const dynamicToken = "your_dynamic_token_here";

  const sessionData = await fetchSessionData(dynamicSsoToken, dynamicToken);
  if (!sessionData) return null;

  const { ssoToken, provisionData } = sessionData;

  try {
    const response = await axios.post(`${API_ENDPOINT}/session`, {
      ssoToken: ssoToken,
      osVersion: 'Windows 10',
      deviceModel: 'Chrome',
      deviceType: 'PC',
      deviceSerial: 'w112c2a90-da0a-11ef-b249-ad4a0ed7b0a7',
      deviceOem: 'Chrome',
      devicePrettyName: 'Chrome 131.0.0.0',
      appVersion: '12.0',
      language: 'en_US',
      brand: 'fsro',
      memberId: '0',
      featureLevel: 6,
      provisionData: provisionData
    });

    const data = response.data;
    console.log('Loaded session details successfully:', data);
    return data;
  } catch (error) {
    console.error('Load session details error:', error);
    return null;
  }
}

// Helper functions
function parseImages(item) {
  return Array.isArray(item.images)
    ? item.images.find(i => i.type === 'la')?.url || ''
    : '';
}

function parseStart(item) {
  return item?.params?.start ? dayjs.utc(item.params.start, 'YYYY-MM-DDTHH:mm:ss[Z]') : null;
}

function parseStop(item) {
  return item?.params?.end ? dayjs.utc(item.params.end, 'YYYY-MM-DDTHH:mm:ss[Z]') : null;
}

function parseRoles(detail, role_name) {
  if (!detail.credits) return [];
  return detail.credits
    .filter(role => role.roleLabel === role_name)
    .map(role => role.person);
}

function parseItems(content) {
  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : [];
}
