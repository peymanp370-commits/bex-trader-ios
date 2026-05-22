# BEX CHANNEL_SCALP Phase 1 - Shadow Only

## What this adds

A new detector for:

- `CHANNEL_SCALP`
- `SLOPING_RANGE_CHANNEL_SCALP`

It detects when price is moving inside a clean sloping channel and marks a possible scalp near the channel edge.

## Safety

This package is **shadow only** by default:

```text
PHASE=shadow
CHANNEL_SCALP_PHASE=shadow
ALLOW_CHANNEL_SCALP_LIVE=0
```

It does not open real trades.

## Outputs

The `/analyze` endpoint returns:

```json
{
  "setup_type": "CHANNEL_SCALP",
  "channel": {
    "detected": true,
    "direction": "DESCENDING",
    "quality_score": 72,
    "upper": 75.45,
    "middle": 75.25,
    "lower": 75.05,
    "price_position": 0.82,
    "inside_ratio": 0.74,
    "touches": 5,
    "breakout_risk": "LOW"
  },
  "signal_candidate": {
    "setup_type": "CHANNEL_SCALP",
    "side": "SELL",
    "entry": 75.43,
    "sl": 75.58,
    "tp": 75.18,
    "rr": 1.5,
    "execution_posture": "PROBE",
    "management_profile": "FAST_SCALP_5M_RECHECK"
  }
}
```

## Rollout

1. Phase 1: shadow detection and D1 logs only.
2. Phase 2: owner/demo micro probe.
3. Phase 3: VIP live probe 0.01.
4. Phase 4: adaptive risk only after 50-100 logged outcomes.

## Where it should connect later

- MTF Engine: use detector output as market structure context.
- Signal Engine: create `setup_candidate` when channel is valid.
- Execution Guard: block if news/volatility/breakout risk/spread/MTF conflict is unsafe.
- Position Engine: build entry/sl/tp/lot with PROBE posture.
- Management Engine: use `FAST_SCALP_5M_RECHECK` to close fast if channel breaks.
