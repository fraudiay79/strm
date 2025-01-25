# magentatv.pl

https://www.magentatv.pl/epg

### Download the guide

```sh
npm run grab --- --site=magentatv.pl
```

### Update channel list

```sh
npm run channels:parse --- --config=./sites/magentatv.pl/magentatv.pl.config.js --output=./sites/magentatv.pl/magentatv.pl.channels.xml
```

### Test

```sh
npm test --- magentatv.pl
```
