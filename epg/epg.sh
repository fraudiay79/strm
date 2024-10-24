#!/bin/bash

cd /home/runner/work/strm/strm/iptv-org-epg && npm install

# AFR EPG

npm run grab -- --channels=../epg/afr.channels.xml --output=../epg/epg-afr.xml --days=2 --maxConnections=10

# AR EPG

npm run grab -- --channels=../epg/ar.channels.xml --output=../epg/epg-ar.xml --days=2 --maxConnections=10

# AT EPG

npm run grab -- --channels=../epg/at.channels.xml --output=../epg/epg-at.xml --days=2 --maxConnections=10

# AU EPG

npm run grab -- --channels=../epg/au.channels.xml --output=../epg/epg-au.xml --days=2 --maxConnections=10

# BE EPG

npm run grab -- --channels=../epg/be.channels.xml --output=../epg/epg-be.xml --days=2 --maxConnections=10

# BEIN EPG

npm run grab -- --channels=../epg/bein.channels.xml --output=../epg/epg-bein.xml --days=2 --maxConnections=10

# BG EPG

npm run grab -- --channels=../epg/bg.channels.xml --output=../epg/epg-bg.xml --days=2 --maxConnections=10

# BR EPG

npm run grab -- --channels=../epg/br.channels.xml --output=../epg/epg-br.xml --days=2 --maxConnections=10

# CA EPG

npm run grab -- --channels=../epg/ca.channels.xml --output=../epg/epg-ca.xml --days=2 --maxConnections=10

# CH EPG

npm run grab -- --channels=../epg/ch.channels.xml --output=../epg/epg-ch.xml --days=2 --maxConnections=10

# CN EPG

npm run grab -- --site=tv.cctv.com --output=../epg/epg-cn.xml --days=2 --maxConnections=10

# CU EPG

#npm run grab -- --site=tvcubana.icrt.cu --output=../epg/epg-cu.xml --days=2 --maxConnections=10

# CZ EPG

npm run grab -- --channels=../epg/cz.channels.xml --output=../epg/epg-cz.xml --days=2 --maxConnections=10

# DE EPG

npm run grab -- --channels=../epg/de.channels.xml --output=../epg/epg-de.xml --days=2 --maxConnections=10

# DK EPG

npm run grab -- --channels=../epg/dk.channels.xml --output=../epg/epg-dk.xml --days=2 --maxConnections=10

# FR EPG

npm run grab -- --channels=../epg/fr.channels.xml --output=../epg/epg-fr.xml --days=2 --maxConnections=10

# ES EPG

npm run grab -- --channels=../epg/es.channels.xml --output=../epg/epg-es.xml --days=2 --maxConnections=10

# FI EPG

npm run grab -- --channels=../epg/fi.channels.xml --output=../epg/epg-fi.xml --days=2 --maxConnections=10

# GE EPG

#npm run grab -- --site=magticom.ge --output=../epg/epg-ge.xml --days=2 --maxConnections=10

# GR EPG

npm run grab -- --channels=../epg/gr.channels.xml --output=../epg/epg-gr.xml --days=2 --maxConnections=10

# HR EPG

npm run grab -- --channels=../epg/hr.channels.xml --output=../epg/epg-hr.xml --days=2 --maxConnections=10

# HU EPG

npm run grab -- --channels=../epg/hu.channels.xml --output=../epg/epg-hu.xml --days=2 --maxConnections=3

# IE EPG

npm run grab -- --channels=../epg/ie.channels.xml --output=../epg/epg-ie.xml --days=2 --maxConnections=10

# IN EPG

#npm run grab -- --site=dishtv.in --output=../epg/epg-in.xml --days=2 --maxConnections=2

# IS EPG

npm run grab -- --channels=../epg/is.channels.xml --output=../epg/epg-is.xml --days=2 --maxConnections=10

# IT EPG

npm run grab -- --channels=../epg/it.channels.xml --output=../epg/epg-it.xml --days=2 --maxConnections=10

# JP EPG

npm run grab -- --site=tvguide.myjcom.jp --output=../epg/epg-jp.xml --days=2 --maxConnections=2

# LU EPG

npm run grab -- --channels=../epg/lu.channels.xml --output=../epg/epg-lu.xml --days=2 --maxConnections=10

# ME EPG

npm run grab -- --channels=../epg/me.channels.xml --output=../epg/epg-me.xml --days=2 --maxConnections=10

# MENA EPG

npm run grab -- --channels=../epg/mena.channels.xml --output=../epg/epg-mena.xml --days=2 --maxConnections=10

# MK EPG

#npm run grab -- --channels=../epg/mk.channels.xml --output=../epg/epg-mk.xml --days=2 --maxConnections=3

# MN EPG

#npm run grab -- --channels=../epg/mn.channels.xml --output=../epg/epg-mn.xml --days=2 --maxConnections=10

# MT EPG

npm run grab -- --channels=../epg/mt.channels.xml --output=../epg/epg-mt.xml --days=2 --maxConnections=10

# NL EPG

npm run grab -- --channels=../epg/nl.channels.xml --output=../epg/epg-nl.xml --days=2 --maxConnections=10

# NO EPG

npm run grab -- --channels=../epg/no.channels.xml --output=../epg/epg-no.xml --days=2 --maxConnections=10

# NZ EPG

npm run grab -- --channels=../epg/nz.channels.xml --output=../epg/epg-nz.xml --days=2 --maxConnections=10

# PK EPG

npm run grab -- --channels=../epg/pk.channels.xml --output=../epg/epg-pk.xml --days=2 --maxConnections=10

# PL EPG

npm run grab -- --channels=../epg/pl.channels.xml --output=../epg/epg-pt.xml --days=2 --maxConnections=10

# PT EPG

npm run grab -- --channels=../epg/pt.channels.xml --output=../epg/epg-pt.xml --days=2 --maxConnections=10

# RO EPG

npm run grab -- --channels=../epg/ro.channels.xml --output=../epg/epg-ro.xml --days=2 --maxConnections=10

# RS EPG

npm run grab -- --channels=../epg/rs.channels.xml --output=../epg/epg-rs.xml --days=2 --maxConnections=10

# SE EPG

npm run grab -- --channels=../epg/se.channels.xml --output=../epg/epg-se.xml --days=2 --maxConnections=10

# SG EPG

npm run grab -- --site=mewatch.sg --output=../epg/epg-sg.xml --days=2 --maxConnections=10

# TR EPG

npm run grab -- --channels=../epg/tr.channels.xml --output=../epg/epg-tr.xml --days=2 --maxConnections=3

# UK EPG

npm run grab -- --channels=../epg/uk.channels.xml --output=../epg/epg-uk.xml --days=2 --maxConnections=10

# US EPG

npm run grab -- --channels=../epg/us.channels.xml --output=../epg/epg-us.xml --days=2 --maxConnections=10

# UY EPG

npm run grab -- --site=programacion.tcc.com.uy --output=../epg/epg-uy.xml --days=2 --maxConnections=10

# XK EPG

npm run grab -- --channels=../epg/xk.channels.xml --output=../epg/epg-xk.xml --days=2 --maxConnections=3

# XX EPG

npm run grab -- --channels=../epg/xx.channels.xml --output=../epg/epg-xx.xml --days=2 --maxConnections=10

# ZA EPG

npm run grab -- --channels=../epg/za.channels.xml --output=../epg/epg-za.xml --days=2 --maxConnections=10


# Compress EPG xml files
cd ../epg/

cat epg*.xml > all.xml

gzip -k -f -9 all.xml

# Remove EPG xml files

rm epg*.xml

rm all.xml

exit 0
