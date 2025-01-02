# mytv.com.vn

https://mytv.com.vn/truyen-hinh

### Download the guide

```sh
npm run grab --- --site=mytv.com.vn
```

### Update channel list

```sh
npm run channels:parse --- --config=./sites/mytv.com.vn/mytv.com.vn.config.js --output=./sites/mytv.com.vn/mytv.com.vn.channels.xml
```

### Test

```sh
npm test --- mytv.com.vn
```
