# tvinfo.uz

https://tvinfo.uz/

### Download the guide

```sh
npm run grab --- --site=tvinfo.uz
```

### Update channel list

```sh
npm run channels:parse --- --config=./sites/tvinfo.uz/tvinfo.uz.config.js --output=./sites/tvinfo.uz/tvinfo.uz.channels.xml
```

### Test

```sh
npm test --- tvinfo.uz
```