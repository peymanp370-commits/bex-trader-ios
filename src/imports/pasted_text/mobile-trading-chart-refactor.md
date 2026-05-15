Refine and rebuild the chart interaction to behave like a real professional mobile trading chart.

Base URL:
https://bex-app.peymanp370.workers.dev

The chart is better now, but it is still missing critical professional behavior.
Fix all of the following.

=====================================
MAIN INTERACTION REQUIREMENTS
=============================

This must behave like a real mobile candlestick chart.

Required interaction:

* pinch to zoom in
* pinch to zoom out
* drag horizontally to go backward and forward through candle history
* smooth panning left and right
* user must be able to move back in time and inspect older candles
* user must be able to return to the latest live candles easily
* do not lock the chart in one fixed position
* do not reset the chart every refresh
* do not block manual navigation

If the user drags left:

* load or show older candles
* keep the chart where the user moved it
* do not auto-snap back to the latest candle unless the user explicitly returns

If the user is near the latest candle:

* keep live behavior active
* continue updating the newest candle with fresh API data

Add a visible control such as:

* “Live”
* “Go to latest”
  so the user can jump back to the newest candles after exploring older history.

=====================================
CHART SIZE AND MOBILE LAYOUT
============================

This chart must be optimized for iPhone screens.

Set a clear visible chart container size suitable for mobile:

* full available width
* height between 320px and 420px on iPhone
* recommended default height: 360px
* chart must be clearly visible without being too small
* chart must not be compressed into a tiny area
* chart must not leave a huge empty area below

The chart must be the main focus of the screen.
Reduce unnecessary empty padding and decorative space around it.

Keep a premium dark trading-terminal layout.

=====================================
TIME AXIS AND LABEL DENSITY
===========================

The bottom axis must adapt correctly depending on timeframe.

This is mandatory:

* 1m chart must show minute-based candle spacing and labels
* 5m chart must look different from 1m
* 15m chart must look different from 5m
* 1h chart must look different from 15m
* H4 and D1 must also have clearly different candle spacing and time scale

Do not make all timeframes look visually identical.

Candle width and spacing must change by timeframe and zoom level.

Examples:

* M1 = denser, smaller candles, minute labels
* M5 = less dense than M1
* M15 = wider spacing than M5
* H1 = clearly broader time spacing
* H4 = broader again
* D1 = broadest spacing

The user must feel the timeframe difference immediately.

Bottom labels must use exact time:

* M1: show HH:mm
* M5: show proper 5-minute labels
* M15: show proper 15-minute labels
* H1: show hourly labels
* H4: show hour/date labels as appropriate
* D1: show date-based labels

Do not repeat broken labels.
Do not use approximate placeholders.
Do not use fake timestamps.

=====================================
CANDLE HISTORY LOADING
======================

The chart must support viewing previous candles.

Default API:
GET /api/chart?symbol={SYMBOL}&tf={TIMEFRAME}&limit=200

When the user moves left and wants more history:

* request more real candles if supported
* or increase limit using the same API
* or maintain a larger local candle buffer
* but always use real API data only

Recommended behavior:

* initial load: 120 to 200 candles
* when user scrolls near the left edge, load older candles if available
* append older candles on the left side
* preserve scroll position when older candles are added

Do not fake historical candles.

=====================================
ZOOM BEHAVIOR
=============

Zoom must be real and smooth.

Requirements:

* pinch gesture for mobile zoom
* optional double tap to reset zoom
* zoom changes candle density
* zoom changes visible candle count
* zoom must not distort OHLC values
* zoom must not break axis labels
* zoom must not cause chart flicker

When zooming in:

* show fewer candles with more detail

When zooming out:

* show more candles with smaller width

=====================================
PAN / MOVE BEHAVIOR
===================

Horizontal move must be smooth and professional.

Requirements:

* swipe left/right to inspect past and recent candles
* keep crosshair and price scale stable
* do not fight the user
* do not snap back unexpectedly
* preserve viewport after refresh if user is not at live edge

Add logic:

* if user is at live edge, auto-follow live candles
* if user has moved away from live edge, stop auto-follow until user presses “Live” or “Go to latest”

=====================================
TIMEFRAME TABS
==============

Use these tabs:

* M1
* M5
* M15
* H1
* H4
* D1

Mapping:

* M1 = 1m
* M5 = 5m
* M15 = 15m
* H1 = 1h
* H4 = aggregate real H1 candles into 4h candles if native H4 is unavailable
* D1 = aggregate real H1 candles into daily candles if native D1 is unavailable

For H4 aggregation:

* open = first H1 open
* high = highest H1 high
* low = lowest H1 low
* close = last H1 close
* volume = sum of H1 volumes

For D1 aggregation:

* open = first H1 open
* high = highest H1 high
* low = lowest H1 low
* close = last H1 close
* volume = sum of H1 volumes

Do not create random H4 or D1 candles.

=====================================
CHART DATA RULES
================

Expected candle format:
{
"ok": true,
"symbol": "XAUUSD",
"tf": "15m",
"count": 120,
"candles": [
{
"symbol": "XAUUSD",
"bucket": 1710000000000,
"open": 3025.10,
"high": 3028.40,
"low": 3022.80,
"close": 3027.90,
"volume": 0,
"isoTime": "2025-03-29T12:00:00.000Z"
}
]
}

Map:

* time = bucket
* open = open
* high = high
* low = low
* close = close
* volume = volume

Convert timestamp correctly.
If bucket is in milliseconds, handle it correctly for the charting component.

=====================================
VISUAL REQUIREMENTS
===================

Style it like a premium professional metals trading chart.

Required:

* dark background
* subtle grid
* green bullish candles
* red bearish candles
* readable price scale on right
* readable time scale on bottom
* visible wick lines
* correct candle body widths
* no fake decorative blocks
* no oversized empty margins
* chart should look dense, active, and real

=====================================
LIVE REFRESH RULES
==================

The chart must remain live, but not interfere with manual review.

Rules:

* refresh every 10 to 15 seconds using real API data
* if the user is at the latest candle, update live normally
* if the user has moved back in history, do not force jump to latest
* preserve zoom level
* preserve horizontal position
* only update the underlying data

=====================================
USER CONTROLS
=============

Add these controls if helpful:

* Live / Go to latest button
* Reset zoom button
* Timeframe tabs
* Symbol tabs for XAUUSD and XAGUSD

Optional but recommended:

* show current visible timeframe clearly
* show current symbol clearly
* show subtle crosshair on touch

=====================================
IMPORTANT
=========

Do not keep the chart as a simple static UI section.
Replace the current chart area with a real interactive candlestick chart component.

Frontend must only call:
https://bex-app.peymanp370.workers.dev

Do not use internal workers directly.
Do not use mock candle data.
Do not use placeholder chart rendering.

This must feel like a real iPhone trading chart where the user can:

* zoom in
* zoom out
* move backward in history
* return to live
* clearly see time differences between M1, M5, M15, H1, H4, and D1
