#!/bin/bash

cd /home/runner/work/strm/strm/fraudiay79-epg && npm install

# AFR EPG

npm run grab -- --channels=../epg/channels/afr.channels.xml --output=../epg/epg-afr.xml --days=2 --maxConnections=20 --timeout=90000

# AL EPG

npm run grab -- --channels=../epg/channels/al.channels.xml --output=../epg/epg-al.xml --days=2 --maxConnections=20 --timeout=90000

# AR EPG

npm run grab -- --channels=../epg/channels/ar.channels.xml --output=../epg/epg-ar.xml --days=2 --maxConnections=20 --timeout=90000

# AT EPG

npm run grab -- --channels=../epg/channels/at.channels.xml --output=../epg/epg-at.xml --days=2 --maxConnections=20 --timeout=90000

# AU EPG

npm run grab -- --channels=../epg/channels/au.channels.xml --output=../epg/epg-au.xml --days=2 --maxConnections=20 --timeout=90000

# BAL EPG

npm run grab -- --channels=../epg/channels/bal.channels.xml --output=../epg/epg-bal.xml --days=2 --maxConnections=20 --timeout=90000

# BE EPG

npm run grab -- --channels=../epg/channels/be.channels.xml --output=../epg/epg-be.xml --days=2 --maxConnections=20 --timeout=90000

# BEIN EPG

npm run grab -- --channels=../epg/channels/bein.channels.xml --output=../epg/epg-bein.xml --days=2 --maxConnections=20 --timeout=90000

# BG EPG

npm run grab -- --channels=../epg/channels/bg.channels.xml --output=../epg/epg-bg.xml --days=2 --maxConnections=20 --timeout=90000

# BR EPG

npm run grab -- --channels=../epg/channels/br.channels.xml --output=../epg/epg-br.xml --days=2 --maxConnections=20 --timeout=90000

# CA EPG

npm run grab -- --channels=../epg/channels/ca.channels.xml --output=../epg/epg-ca.xml --days=2 --maxConnections=20 --timeout=90000

# CIS EPG

#npm run grab -- --channels=../epg/channels/cis.channels.xml --output=../epg/epg-cis.xml --days=2 --maxConnections=20 --timeout=90000

# CH EPG

npm run grab -- --channels=../epg/channels/ch.channels.xml --output=../epg/epg-ch.xml --days=2 --maxConnections=20 --timeout=90000

# CN EPG

npm run grab -- --site=tv.cctv.com --output=../epg/epg-cn.xml --days=2 --maxConnections=20 --timeout=90000

# CU EPG

##npm run grab -- --site=tvcubana.icrt.cu --output=../epg/epg-cu.xml --days=2 --maxConnections=20 --timeout=90000

# CZ EPG

npm run grab -- --channels=../epg/channels/cz.channels.xml --output=../epg/epg-cz.xml --days=2 --maxConnections=20 --timeout=90000

# DE EPG

npm run grab -- --channels=../epg/channels/de.channels.xml --output=../epg/epg-de.xml --days=2 --maxConnections=20 --timeout=90000

# DK EPG

npm run grab -- --channels=../epg/channels/dk.channels.xml --output=../epg/epg-dk.xml --days=2 --maxConnections=20 --timeout=90000

# FR EPG

npm run grab -- --channels=../epg/channels/fr.channels.xml --output=../epg/epg-fr.xml --days=2 --maxConnections=20 --timeout=90000

# ES EPG

npm run grab -- --channels=../epg/channels/es.channels.xml --output=../epg/epg-es.xml --days=2 --maxConnections=20 --timeout=90000

# FI EPG

npm run grab -- --channels=../epg/channels/fi.channels.xml --output=../epg/epg-fi.xml --days=2 --maxConnections=20 --timeout=90000

# GE EPG

#npm run grab -- --channels=../epg/channels/ge.channels.xml --output=../epg/epg-ge.xml --days=2 --maxConnections=20 --timeout=90000

# GR EPG

npm run grab -- --channels=../epg/channels/gr.channels.xml --output=../epg/epg-gr.xml --days=2 --maxConnections=20 --timeout=90000

# HR EPG

npm run grab -- --channels=../epg/channels/hr.channels.xml --output=../epg/epg-hr.xml --days=2 --maxConnections=20 --timeout=90000

# HU EPG

npm run grab -- --channels=../epg/channels/hu.channels.xml --output=../epg/epg-hu.xml --days=2 --maxConnections=3

# IE EPG

npm run grab -- --channels=../epg/channels/ie.channels.xml --output=../epg/epg-ie.xml --days=2 --maxConnections=20 --timeout=90000

# IN EPG

#npm run grab -- --site=dishtv.in --output=../epg/epg-in.xml --days=2 --maxConnections=2

# IS EPG

npm run grab -- --channels=../epg/channels/is.channels.xml --output=../epg/epg-is.xml --days=2 --maxConnections=20 --timeout=90000

# IT EPG

npm run grab -- --channels=../epg/channels/it.channels.xml --output=../epg/epg-it.xml --days=2 --maxConnections=20 --timeout=90000

# JP EPG

npm run grab -- --channels=../epg/channels/jp.channels.xml --output=../epg/epg-jp.xml --days=2 --maxConnections=2

# LU EPG

npm run grab -- --channels=../epg/channels/lu.channels.xml --output=../epg/epg-lu.xml --days=2 --maxConnections=20 --timeout=90000

# ME EPG

npm run grab -- --channels=../epg/channels/me.channels.xml --output=../epg/epg-me.xml --days=2 --maxConnections=20 --timeout=90000

# MENA EPG

npm run grab -- --channels=../epg/channels/mena.channels.xml --output=../epg/epg-mena.xml --days=2 --maxConnections=20 --timeout=90000

# MK EPG

#npm run grab -- --channels=../epg/channels/mk.channels.xml --output=../epg/epg-mk.xml --days=2 --maxConnections=3

# MN EPG

npm run grab -- --channels=../epg/channels/mn.channels.xml --output=../epg/epg-mn.xml --days=2 --maxConnections=20 --timeout=90000

# MT EPG

npm run grab -- --channels=../epg/channels/mt.channels.xml --output=../epg/epg-mt.xml --days=2 --maxConnections=20 --timeout=90000

# MY EPG

npm run grab -- --channels=../epg/channels/my.channels.xml --output=../epg/epg-my.xml --days=2 --maxConnections=20 --timeout=90000

# NL EPG

npm run grab -- --channels=../epg/channels/nl.channels.xml --output=../epg/epg-nl.xml --days=2 --maxConnections=20 --timeout=90000

# NO EPG

npm run grab -- --channels=../epg/channels/no.channels.xml --output=../epg/epg-no.xml --days=2 --maxConnections=20 --timeout=90000

# NZ EPG

npm run grab -- --channels=../epg/channels/nz.channels.xml --output=../epg/epg-nz.xml --days=2 --maxConnections=20 --timeout=90000

# PK EPG

npm run grab -- --channels=../epg/channels/pk.channels.xml --output=../epg/epg-pk.xml --days=2 --maxConnections=20 --timeout=90000

# PL EPG

npm run grab -- --channels=../epg/channels/pl.channels.xml --output=../epg/epg-pl.xml --days=2 --maxConnections=20 --timeout=90000

# PT EPG

npm run grab -- --channels=../epg/channels/pt.channels.xml --output=../epg/epg-pt.xml --days=2 --maxConnections=20 --timeout=90000

# RO EPG

npm run grab -- --channels=../epg/channels/ro.channels.xml --output=../epg/epg-ro.xml --days=2 --maxConnections=20 --timeout=90000

# RS EPG

npm run grab -- --channels=../epg/channels/rs.channels.xml --output=../epg/epg-rs.xml --days=2 --maxConnections=20 --timeout=90000

# SE EPG

npm run grab -- --channels=../epg/channels/se.channels.xml --output=../epg/epg-se.xml --days=2 --maxConnections=20 --timeout=90000

# SG EPG

npm run grab -- --channels=../epg/channels/sg.channels.xml --output=../epg/epg-sg.xml --days=2 --maxConnections=20 --timeout=90000

# TR EPG

npm run grab -- --channels=../epg/channels/tr.channels.xml --output=../epg/epg-tr.xml --days=2 --maxConnections=3

# UK EPG

npm run grab -- --channels=../epg/channels/uk.channels.xml --output=../epg/epg-uk.xml --days=2 --maxConnections=20 --timeout=90000

# US EPG

npm run grab -- --channels=../epg/channels/us.channels.xml --output=../epg/epg-us.xml --days=2 --maxConnections=20 --timeout=90000

# UY EPG

npm run grab -- --channels=../epg/channels/uy.channels.xml --output=../epg/epg-uy.xml --days=2 --maxConnections=20 --timeout=90000

# XK EPG

npm run grab -- --channels=../epg/channels/xk.channels.xml --output=../epg/epg-xk.xml --days=2 --maxConnections=3

# XX EPG

npm run grab -- --channels=../epg/channels/xx.channels.xml --output=../epg/epg-xx.xml --days=2 --maxConnections=20 --timeout=90000

# ZA EPG

npm run grab -- --channels=../epg/channels/za.channels.xml --output=../epg/epg-za.xml --days=2 --maxConnections=20 --timeout=90000

# Compress EPG xml files
cd ../epg/

#cat epg*.xml > all.xml

#tar cvzf epg.tar.gz epg*.xml

#gzip -k -f -9 all.xml
gzip -k -f -9 epg*.xml

# Remove EPG xml files

rm epg*.xml

#rm all.xml

exit 0
