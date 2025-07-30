# gracenote.com

https://tvlistings.gracenote.com/grid-affiliates.html?aid=tribnyc2dl

https://tvlistings.gracenote.com/grid-affiliates.html?aid=digiceltrin

### Providers

https://tvlistings.gracenote.com/gapzap_webapi/api/Providers/getPostalCodeProviders/USA/10001/gapzap/en

### Download the guide

```sh
npm run grab --- --site=gracenote.com
```

### Update channel list

```sh
npm run channels:parse --- --config=./sites/gracenote.com/gracenote.com.config.js --output=./sites/gracenote.com/gracenote.com.channels.xml
```

### Test

```sh
npm test --- gracenote.com
```
