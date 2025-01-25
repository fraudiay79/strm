# magentatv.me

https://www.magentatv.me/epg

### Download the guide

```sh
npm run grab --- --site=magentatv.me
```

### Update channel list

```sh
npm run channels:parse --- --config=./sites/magentatv.me/magentatv.me.config.js --output=./sites/magentatv.me/magentatv.me.channels.xml
```

### Test

```sh
npm test --- magentatv.me
```
