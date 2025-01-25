# magentatv.at

https://player.telekomtvgo.hu/epg

### Download the guide

```sh
npm run grab --- --site=magentatv.at
```

### Update channel list

```sh
npm run channels:parse --- --config=./sites/magentatv.at/magentatv.at.config.js --output=./sites/magentatv.at/magentatv.at.channels.xml
```

### Test

```sh
npm test --- magentatv.at
```
