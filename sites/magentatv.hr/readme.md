# magentatv.hr

https://mojmaxtv.hrvatskitelekom.hr/epg

### Download the guide

```sh
npm run grab --- --site=magentatv.hr
```

### Update channel list

```sh
npm run channels:parse --- --config=./sites/magentatv.hr/magentatv.hr.config.js --output=./sites/magentatv.hr/magentatv.hr.channels.xml
```

### Test

```sh
npm test --- magentatv.hr
```
