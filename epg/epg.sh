#!/bin/bash

cd /home/runner/work/strm/strm/iptv-org-epg && npm install

# AFR EPG

npm run grab -- --channels=../epg/afr.channels.xml --output=../epg/epg-afr.xml --days=3 --maxConnections=10

# AT EPG

npm run grab -- --channels=../epg/at.channels.xml --output=../epg/epg-at.xml --days=3 --maxConnections=10

# AU EPG

npm run grab -- --channels=../epg/au.channels.xml --output=../epg/epg-au.xml --days=3 --maxConnections=10

# BE EPG

npm run grab -- --channels=../epg/be.channels.xml --output=../epg/epg-be.xml --days=3 --maxConnections=10

# BEIN EPG

npm run grab -- --channels=../epg/bein.channels.xml --output=../epg/epg-bein.xml --days=3 --maxConnections=10

# BG EPG

#npm run grab -- --site=vivacom.bg --output=../epg/epg-bg.xml --days=3 --maxConnections=10

# BR EPG

npm run grab -- --channels=../epg/br.channels.xml --output=../epg/epg-br.xml --days=3 --maxConnections=10

# CA EPG

npm run grab -- --channels=../epg/ca.channels.xml --output=../epg/epg-ca.xml --days=3 --maxConnections=10

# CN EPG

npm run grab -- --site=tv.cctv.com --output=../epg/epg-cn.xml --days=3 --maxConnections=10

# CU EPG

#npm run grab -- --site=tvcubana.icrt.cu --output=../epg/epg-cu.xml --days=3 --maxConnections=10

# CZ EPG

npm run grab -- --site=mujtvprogram.cz --output=../epg/epg-cz.xml --days=3 --maxConnections=10

# DE EPG

npm run grab -- --channels=../epg/de.channels.xml --output=../epg/epg-de.xml --days=3 --maxConnections=10

# DK EPG

npm run grab -- --channels=../epg/dk.channels.xml --output=../epg/epg-dk.xml --days=3 --maxConnections=10

# FR EPG

npm run grab -- --channels=../epg/fr.channels.xml --output=../epg/epg-fr.xml --days=3 --maxConnections=10

# ES EPG

npm run grab -- --channels=../epg/es.channels.xml --output=../epg/epg-es.xml --days=3 --maxConnections=10

# FI EPG

npm run grab -- --channels=../epg/fi.channels.xml --output=../epg/epg-fi.xml --days=3 --maxConnections=10

# GE EPG

#npm run grab -- --site=magticom.ge --output=../epg/epg-ge.xml --days=3 --maxConnections=10

# GR EPG

npm run grab -- --channels=../epg/gr.channels.xml --output=../epg/epg-gr.xml --days=3 --maxConnections=10

# HR EPG

npm run grab -- --site=maxtv.hrvatskitelekom.hr --output=../epg/epg-hr.xml --days=3 --maxConnections=10

# HU EPG

npm run grab -- --site=musor.tv --output=../epg/epg-hu.xml --days=3 --maxConnections=10

# IE EPG

npm run grab -- --channels=../epg/ie.channels.xml --output=../epg/epg-ie.xml --days=3 --maxConnections=10

# IN EPG

#npm run grab -- --site=dishtv.in --output=../epg/epg-in.xml --days=3 --maxConnections=2

# IS EPG

npm run grab -- --channels=../epg/is.channels.xml --output=../epg/epg-is.xml --days=3 --maxConnections=10

# IT EPG

npm run grab -- --channels=../epg/it.channels.xml --output=../epg/epg-it.xml --days=3 --maxConnections=10

# JP EPG

npm run grab -- --site=tvguide.myjcom.jp --output=../epg/epg-jp.xml --days=3 --maxConnections=2

# LU EPG

npm run grab -- --channels=../epg/lu.channels.xml --output=../epg/epg-lu.xml --days=3 --maxConnections=10

# MENA EPG

npm run grab -- --channels=../epg/mena.channels.xml --output=../epg/epg-mena.xml --days=3 --maxConnections=10

# MK EPG

npm run grab -- --site=maxtvgo.mk --output=../epg/epg-mk.xml --days=3 --maxConnections=10

# MN EPG

npm run grab -- --channels=../epg/mn.channels.xml --output=../epg/epg-mn.xml --days=3 --maxConnections=10

# MT EPG

npm run grab -- --channels=../epg/mt.channels.xml --output=../epg/epg-mt.xml --days=3 --maxConnections=10

# NL EPG

npm run grab -- --channels=../epg/nl.channels.xml --output=../epg/epg-nl.xml --days=3 --maxConnections=10

# NO EPG

npm run grab -- --channels=../epg/no.channels.xml --output=../epg/epg-no.xml --days=3 --maxConnections=10

# NZ EPG

npm run grab -- --channels=../epg/nz.channels.xml --output=../epg/epg-nz.xml --days=3 --maxConnections=10

# PK EPG

npm run grab -- --channels=../epg/pk.channels.xml --output=../epg/epg-pk.xml --days=3 --maxConnections=10

# PL EPG

npm run grab -- --site=programtv.onet.pl --output=../epg/epg-pl.xml --days=3 --maxConnections=10

# PT EPG

npm run grab -- --channels=../epg/pt.channels.xml --output=../epg/epg-pt.xml --days=3 --maxConnections=10

# RO EPG

npm run grab -- --channels=../epg/ro.channels.xml --output=../epg/epg-ro.xml --days=3 --maxConnections=10

# RS EPG

npm run grab -- --site=mts.rs --output=../epg/epg-rs.xml --days=3 --maxConnections=10

# SE EPG

npm run grab -- --channels=../epg/se.channels.xml --output=../epg/epg-se.xml --days=3 --maxConnections=10

# SG EPG

npm run grab -- --channels=../epg/sg.channels.xml --output=../epg/epg-sg.xml --days=3 --maxConnections=10

# TR EPG

npm run grab -- --channels=../epg/tr.channels.xml --output=../epg/epg-tr.xml --days=3 --maxConnections=10

# UK EPG

npm run grab -- --site=mytelly.co.uk --output=../epg/epg-uk.xml --days=3 --maxConnections=10

# US EPG

npm run grab -- --channels=../epg/us.channels.xml --output=../epg/epg-us.xml --days=3 --maxConnections=10

# UY EPG

npm run grab -- --site=programacion.tcc.com.uy --output=../epg/epg-uy.xml --days=3 --maxConnections=10

# XK EPG

npm run grab -- --channels=../epg/xk.channels.xml --output=../epg/epg-xk.xml --days=3 --maxConnections=10

# XX EPG

npm run grab -- --channels=../epg/xk.channels.xml --output=../epg/epg-xk.xml --days=3 --maxConnections=10

# ZA EPG

npm run grab -- --channels=../epg/za.channels.xml --output=../epg/epg-za.xml --days=3 --maxConnections=10


# Compress EPG xml files
cd ../epg/

gzip -k -f -9 epg*.xml

# Remove EPG xml files

rm epg*.xml

exit 0
