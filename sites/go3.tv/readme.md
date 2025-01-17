# go3.tv

https://go3.tv/en/live_tv/

### Download the guide

```sh
npm run grab --- --site=go3.tv
```

### Update channel list

```sh
npm run channels:parse --- --config=./sites/go3.tv/go3.tv.config.js --output=./sites/go3.tv/go3.tv.channels.xml
```

### Test

```sh
npm test --- go3.tv
```
