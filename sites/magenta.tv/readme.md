# magenta.tv

https://www.magenta.tv/tv-guide

### Download the guide

```sh
npm run grab --- --sites=magenta.tv
```

### Update channel list

```sh
npm run channels:parse --- --config=./sites/magenta.tv/magenta.tv.config.js --output=./sites/magenta.tv/magenta.tv.channels.xml
```

### Test

```sh
npm test --- magenta.tv
```
