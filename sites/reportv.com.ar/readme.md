# reportv.com.ar

| Country                  | Code | URL                                                       |
| ------------------------ | ---- | --------------------------------------------------------- |
| Argentina                | `ar` | https://www.reportv.com.ar/buscador/Buscador.php?aid=2313 |
| Bolivia                  | `bo` | https://www.reportv.com.ar/buscador/Buscador.php?aid=2356 |
| Chile                    | `cl` | https://www.reportv.com.ar/buscador/Buscador.php?aid=2354 |
| Colombia                 | `co` | https://www.reportv.com.ar/buscador/Buscador.php?aid=2770 |
| Costa Rica               | `cr` | https://www.reportv.com.ar/buscador/Buscador.php?aid=2295 |
| Ecuador                  | `ec` | https://www.reportv.com.ar/buscador/Buscador.php?aid=3269 |
| Mexico                   | `mx` | https://www.reportv.com.ar/buscador/Buscador.php?aid=3129 |
| Uruguay                  | `uy` | https://www.reportv.com.ar/buscador/Buscador.php?aid=2685 |
| Venezuela                | `ve` | https://www.reportv.com.ar/buscador/Buscador.php?aid=2694 |

### Download the guide

```sh
npm run grab --- --channels=sites/reportv.com.ar/reportv.com.ar_<COUNTRY_CODE>.channels.xml
```

### Update channel list

```sh
npm run channels:parse --- --config=./sites/reportv.com.ar/reportv.com.ar.config.js --output=./sites/reportv.com.ar/reportv.com.ar_<COUNTRY_CODE>.channels.xml --set=country:<COUNTRY_CODE>
```

### Test

```sh
npm test --- reportv.com.ar
```
