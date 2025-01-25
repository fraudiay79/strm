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

async function fetchSessionData() {
  const url = 'https://tvapi.solocoo.tv/v1/session';

  try {
    const response = await axios.post(url, {
      "userName": "Demo Chrome 131.0.0.0",
      "demo": true,
      "userLogin": "demo_fsro_fNxR2lPk118zQE9K3d9uWg",
      "userId": "9c6e0419-f77f-0b59-f309-9cfc8175b954",
      "countryCode": "RO",
      "communityName": "Focus Sat",
      "ssoToken": "eyJrZXkiOiJtNyIsImFsZyI6ImRpciIsImVuYyI6IkExMjhDQkMtSFMyNTYifQ..B85_TTkG73-dYqeJV_D2ig.deqR9YaejycRRYOGkSsG6DMfAgEt4YU9aRMMoStdXspyR5EjAgoD95NgJvrJekQGpVaEBFPYfTuzxAUnfW2QOu8S7HB0RmtZdakAqPfNkO2Jw_LHj7SKS5pfPuAkEMT-rtAzSnDBPwXfHRwONKpb46U9YN5hV4CTYQkVIwNYQ1K3kyijLpeImxDNUw9jcowUBNZGCGrQUZUGfdSczz5qSkADaEHl_JfpuaTL4OJLesRFSo2PqsQZ3KRD_-1fBiXzC_TrNeru257TKJIVdX_G4cI7IIHS8MwIPtk3aBieVKP3cqLtWv4rAnHmxNkh-GkSpDx9JvbE5v-ek6eiwr4Vtp7FlIBtfPYBN19hL5fL9IVJxG4DDdSfSLjLAsnC95ommc75U7FLeBl4Cm6NdI89sJVZhPQPpTX5ccjrcjeRl--wGPnSiUA5S-ULadMp-hWNFq76PUB_5GtEK8D12mxzZ4QzNWoSVbRfVN1MB2kByVFtRpT-sHybY1xozySyLuSv.9wsWHIs_mZpo4y0ydeSHow",
      "update": true,
      "language": "en_US",
      "brandName": "Focus Sat",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0di5zb2xvY29vLmF1dGgiOnsicyI6IncxMTJjMmE5MC1kYTBhLTExZWYtYjI0OS1hZDRhMGVkN2IwYTciLCJ1IjoiR1FSdW5IXzNXUXZ6Q1p6OGdYVzVWQSIsImwiOiJlbl9VUyIsImQiOiJQQyIsImRtIjoiQ2hyb21lIiwib20iOiJPIiwiYyI6Ik9OcEVfSU9MSURId3ZjZHVkYlVBNDNMMFU4eWZLV2JrcVBFUWg3VFNXdXciLCJzdCI6ImZ1bGwiLCJnIjoiZXlKaWNpSTZJbVp6Y204aUxDSmtZaUk2Wm1Gc2MyVXNJbTl3SWpvaU1URTFJaXdpWkdVaU9pSmljbUZ1WkUxaGNIQnBibWNpTENKd2RDSTZabUZzYzJVc0luVndJam9pYlRkamVpSjkiLCJmIjo2LCJiIjoiZnNybyJ9LCJuYmYiOjE3Mzc4MzI1NjEsImV4cCI6MTczNzgzNDU1MCwiaWF0IjoxNzM3ODMyNTYxLCJhdWQiOiJtN2N6In0.gZ4-rbonUDZKHcuuLSBdIXRIRPbNgPWy4pPwOu7ZTYc",
      "consent": false
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = response.data;

    const ssoToken = data.ssoToken;
    const provisionData = data.token; // Assigning token to provisionData

    return { ssoToken, provisionData };
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

async function loadSessionDetails() {
  const sessionData = await fetchSessionData();
  if (!sessionData) return null;

  const { ssoToken, provisionData } = sessionData;

  return axios.post(`${API_ENDPOINT}/session`, {
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
  }).then(r => r.data).catch(console.log);
}
