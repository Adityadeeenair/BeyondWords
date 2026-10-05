import { NAV_GRID, GRID_COLS, GRID_ROWS, CELL_SIZE, MAP_WIDTH, MAP_HEIGHT } from './navGrid'

/**
 * Checks if a pixel coordinate (px, py) on the 1376x768 map is walkable road.
 */
export function isWalkable(px, py) {
  if (px < 0 || px >= MAP_WIDTH || py < 0 || py >= MAP_HEIGHT) return false
  const gx = Math.floor(px / CELL_SIZE)
  const gy = Math.floor(py / CELL_SIZE)
  if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return false
  return NAV_GRID[gy]?.[gx] === '1'
}

/**
 * Given any pixel coordinate (px, py), find the nearest walkable road pixel.
 * Searches in concentric rings.
 */
export function findNearestWalkable(px, py, maxRadius = 35) {
  const startGx = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(px / CELL_SIZE)))
  const startGy = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(py / CELL_SIZE)))

  if (NAV_GRID[startGy]?.[startGx] === '1') {
    return { x: px, y: py }
  }

  let bestDistSq = Infinity
  let bestGx = startGx
  let bestGy = startGy
  let found = false

  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue
        const nx = startGx + dx
        const ny = startGy + dy
        if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) {
          if (NAV_GRID[ny][nx] === '1') {
            const distSq = dx * dx + dy * dy
            if (distSq < bestDistSq) {
              bestDistSq = distSq
              bestGx = nx
              bestGy = ny
              found = true
            }
          }
        }
      }
    }
    if (found) break
  }

  return {
    x: bestGx * CELL_SIZE + CELL_SIZE / 2,
    y: bestGy * CELL_SIZE + CELL_SIZE / 2,
  }
}

/**
 * A* Pathfinding from (startX, startY) to (targetX, targetY) in pixel coordinates.
 * Returns an array of waypoint points [{x, y}, ...], smoothed for natural movement.
 */
export function findPath(startX, startY, targetX, targetY) {
  const startValid = findNearestWalkable(startX, startY)
  const endValid = findNearestWalkable(targetX, targetY)

  const sGx = Math.floor(startValid.x / CELL_SIZE)
  const sGy = Math.floor(startValid.y / CELL_SIZE)
  const eGx = Math.floor(endValid.x / CELL_SIZE)
  const eGy = Math.floor(endValid.y / CELL_SIZE)

  if (sGx === eGx && sGy === eGy) {
    return [{ x: endValid.x, y: endValid.y }]
  }

  // Priority queue / open set using Min-Heap or simple sorted array
  // Since grid is small (172x96), an array or indexed map is fast.
  const openSet = new Set()
  const startKey = `${sGx},${sGy}`
  const endKey = `${eGx},${eGy}`

  openSet.add(startKey)

  const cameFrom = new Map()
  const gScore = new Map()
  gScore.set(startKey, 0)

  const fScore = new Map()
  fScore.set(startKey, heuristic(sGx, sGy, eGx, eGy))

  function heuristic(x1, y1, x2, y2) {
    const dx = Math.abs(x1 - x2)
    const dy = Math.abs(y1 - y2)
    // Octile distance
    return 1 * (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy)
  }

  // 8 directions (cardinals + diagonals)
  const DIRS = [
    { dx: 1, dy: 0, cost: 1 },
    { dx: -1, dy: 0, cost: 1 },
    { dx: 0, dy: 1, cost: 1 },
    { dx: 0, dy: -1, cost: 1 },
    { dx: 1, dy: 1, cost: Math.SQRT2 },
    { dx: -1, dy: 1, cost: Math.SQRT2 },
    { dx: 1, dy: -1, cost: Math.SQRT2 },
    { dx: -1, dy: -1, cost: Math.SQRT2 },
  ]

  let iterations = 0
  const MAX_ITER = 3000

  while (openSet.size > 0 && iterations < MAX_ITER) {
    iterations++

    // Find node in openSet with lowest fScore
    let currentKey = null
    let lowestF = Infinity
    for (const key of openSet) {
      const f = fScore.get(key) ?? Infinity
      if (f < lowestF) {
        lowestF = f
        currentKey = key
      }
    }

    if (!currentKey) break
    if (currentKey === endKey) {
      // Reconstruct path
      return reconstructPath(cameFrom, currentKey, endValid.x, endValid.y)
    }

    openSet.delete(currentKey)
    const [cx, cy] = currentKey.split(',').map(Number)
    const currentG = gScore.get(currentKey) ?? Infinity

    for (const { dx, dy, cost } of DIRS) {
      const nx = cx + dx
      const ny = cy + dy

      if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) continue
      if (NAV_GRID[ny][nx] !== '1') continue

      // For diagonals, ensure both adjacent cardinals are walkable to avoid cutting corners
      if (dx !== 0 && dy !== 0) {
        if (NAV_GRID[cy][cx + dx] !== '1' || NAV_GRID[cy + dy][cx] !== '1') {
          continue
        }
      }

      const neighborKey = `${nx},${ny}`
      const tentativeG = currentG + cost

      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, currentKey)
        gScore.set(neighborKey, tentativeG)
        fScore.set(neighborKey, tentativeG + heuristic(nx, ny, eGx, eGy))
        openSet.add(neighborKey)
      }
    }
  }

  // Fallback: direct line to endValid if path not found
  return [{ x: endValid.x, y: endValid.y }]
}

function reconstructPath(cameFrom, currentKey, finalX, finalY) {
  const rawPath = []
  let curr = currentKey

  while (curr) {
    const [gx, gy] = curr.split(',').map(Number)
    rawPath.push({
      x: gx * CELL_SIZE + CELL_SIZE / 2,
      y: gy * CELL_SIZE + CELL_SIZE / 2,
    })
    curr = cameFrom.get(curr)
  }

  rawPath.reverse()
  // Replace last node with exact target coordinates
  if (rawPath.length > 0) {
    rawPath[rawPath.length - 1] = { x: finalX, y: finalY }
  }

  // Smooth waypoints (skip collinear intermediate nodes)
  return smoothPath(rawPath)
}

function smoothPath(points) {
  if (points.length <= 2) return points

  const smoothed = [points[0]]
  let currentIdx = 0

  while (currentIdx < points.length - 1) {
    // Look ahead as far as possible with line-of-sight check
    let furthest = currentIdx + 1
    for (let i = points.length - 1; i > currentIdx + 1; i--) {
      if (hasLineOfSight(points[currentIdx], points[i])) {
        furthest = i
        break
      }
    }
    smoothed.push(points[furthest])
    currentIdx = furthest
  }

  return smoothed
}

function hasLineOfSight(p1, p2) {
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
  const steps = Math.ceil(dist / (CELL_SIZE / 2))
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    const x = p1.x + (p2.x - p1.x) * t
    const y = p1.y + (p2.y - p1.y) * t
    if (!isWalkable(x, y)) return false
  }
  return true
}
