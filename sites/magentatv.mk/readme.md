# magentatv.mk

https://www.magentatv.mk/epg

### Download the guide

```sh
npm run grab --- --site=magentatv.mk
```

### Update channel list

```sh
npm run channels:parse --- --config=./sites/magentatv.mk/magentatv.mk.config.js --output=./sites/magentatv.mk/magentatv.mk.channels.xml
```

### Test

```sh
npm test --- magentatv.mk
```
