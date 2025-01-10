const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const URLBASE = 'https://api.frp1.ott.kaltura.com/api_v3/service/';
const Useragent = 'okhttp/3.12.1';
const ClientTag = '30082-Android';
const ApiVersion = '5.4.0.28193';
const PartnerId = '3197';
const PageSize = 500;

async function getAuthToken() {
  const postData = {
    partnerId: PartnerId,
    udid: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  };
  const response = await axios.post(`${URLBASE}OTTUser/action/anonymousLogin`, postData, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return response.data.result.ks;
}

async function getChannels(ks) {
  const postData = {
    apiVersion: ApiVersion,
    clientTag: ClientTag,
    filter: {
      idEqual: 353875,
      kSql: "(and customer_type_blacklist!='1' deep_link_type!='netflix' Is_adult!='1' deep_link_type!='youtube' (and PPV_module!+'') deep_link_type!='amazon')",
      objectType: 'KalturaChannelFilter'
    },
    ks: ks,
    pager: {
      pageIndex: 1,
      pageSize: PageSize
    }
  };
  const response = await axios.post(`${URLBASE}asset/action/list`, postData, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  const channels = response.data.result.objects.map(channel => ({
    lang: 'he',
    name: channel.name,
    id: channel.externalIds
  }));
  return channels;
}

async function getEPGData(ks, date, channelDict) {
  const shows = [];
  let pageIndex = 1;

  while (true) {
    const postData = {
      apiVersion: ApiVersion,
      clientTag: ClientTag,
      filter: {
        kSql: `(and start_date>='${date}' end_date<'${date + 1}' asset_type='epg')`,
        orderBy: 'START_DATE_ASC',
        objectType: 'KalturaSearchAssetFilter'
      },
      ks: ks,
      pager: {
        pageIndex: pageIndex,
        pageSize: PageSize
      }
    };
    const response = await axios.post(`${URLBASE}asset/action/list`, postData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const res = response.data.result;
    if (res.objects) {
      const epgEntries = res.objects;
      for (const epg of epgEntries) {
        const channel = channelDict[epg.epgChannelId];
        if (channel) {
          const show = {
            channel: channel.name,
            title: epg.name.trim(),
            description: epg.description ? epg.description.trim() : 'No description available',
            startTime: dayjs.unix(epg.startDate).utc().format(),
            endTime: dayjs.unix(epg.endDate).utc().format()
          };
          const subTitle = epg.metas?.subTitle?.value?.trim();
          if (subTitle) {
            show.title += ` - ${subTitle}`;
          }
          shows.push(show);
        }
      }
      if (epgEntries.length >= PageSize) {
        pageIndex++;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return shows;
}

module.exports = {
  site: 'cellcomtv.il',
  days: 3, // Default days to grab
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ date }) {
    return date.format('YYYY-MM-DD');
  },
  async parser({ date }) {
    const ks = await getAuthToken();
    const channelDict = (await getChannels(ks)).reduce((acc, channel) => {
      acc[channel.id] = channel;
      return acc;
    }, {});
    return await getEPGData(ks, date, channelDict);
  }
};
