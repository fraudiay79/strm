# ipko.tv

https://www.ipko.tv/tv-guide/

### Download the guide

```sh
npm run grab --- --site=ipko.tv
```

### Update channel list

```sh
npm run channels:parse --- --config=./sites/ipko.tv/ipko.tv.config.js --output=./sites/ipko.tv/ipko.tv.channels.xml
```

### Test

```sh
npm test --- ipko.tv
```
