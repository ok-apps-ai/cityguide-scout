# Marbella — Grid Precision Benchmark

Grid precision test for Marbella bounding box: SW (36.47, -4.99) to NE (36.53, -4.73).

## Google Places

| GRID_STEP_DEGREES | Grid points | API requests | Unique places | Total time | Avg time/request |
|-------------------|-------------|--------------|---------------|------------|------------------|
| 0.01              | 189         | 378          | 809           | ~187 s     | ~495 ms          |
| 0.02              | 56          | 112          | 512           | ~39 s      | ~348 ms          |
| 0.03              | 27          | 54           | 346           | ~19 s      | ~352 ms          |

*API requests = grid points × 2 (NEARBY_SEARCH_TYPES split into 2 batches of 50).*

## OSM Overpass

Tiles use aspect-ratio-aware split (nLat×nLng from lat/lng spans). Element counts from Overpass progress logs.

| TILE_SIZE_DEG | nLat×nLng | Tiles | API requests | Elements | Total time | Avg time/request |
|---------------|-----------|-------|--------------|----------|------------|------------------|
| 0.01          | 7×27      | 189   | 189          | ~2094    | ~553 s     | ~2927 ms         |
| 0.02          | 4×14      | 56    | 56           | ~2094    | ~368 s     | ~6570 ms         |
| 0.03          | 3×9       | 27    | 27           | ~2089    | ~109 s     | ~4035 ms         |
