import { HazardZone, RouteOption, RouteComparisonResponse, VehicleProfile, IntersectedHazard } from '../types';
import { CITY_VIEWBOXES } from './geocodingService';

/**
 * Calculates distance between two coordinates in meters using Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculates minimum distance in meters from a point P to a line segment AB
 * Using localized planar projection for high-precision street distance calculation
 */
export function distancePointToSegmentMeters(
  pLat: number,
  pLon: number,
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): number {
  const cosLat = Math.cos((pLat * Math.PI) / 180);
  const px = pLon * cosLat * 111320;
  const py = pLat * 110540;
  const ax = aLon * cosLat * 111320;
  const ay = aLat * 110540;
  const bx = bLon * cosLat * 111320;
  const by = bLat * 110540;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  // Projection parameter t clamped to [0, 1]
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;

  return Math.hypot(px - projX, py - projY);
}

/**
 * Canonical Hazard Intersection Detector
 * Tests EVERY segment of the route polyline against EVERY active hazard geometry.
 * Returns intersection details with exact minimum distance and affected segment.
 */
export function detectHazardIntersections(
  coordinates: [number, number][],
  hazards: HazardZone[]
): IntersectedHazard[] {
  const intersected: IntersectedHazard[] = [];
  if (!coordinates || coordinates.length < 2 || !hazards || hazards.length === 0) {
    return intersected;
  }

  // Compute segment start cumulative distances
  let cumulativeDist = 0;
  const segmentCumulativeDists: number[] = [0];
  for (let i = 0; i < coordinates.length - 1; i++) {
    const segDist = calculateDistanceMeters(
      coordinates[i][0],
      coordinates[i][1],
      coordinates[i + 1][0],
      coordinates[i + 1][1]
    );
    cumulativeDist += segDist;
    segmentCumulativeDists.push(cumulativeDist);
  }

  for (const hazard of hazards) {
    let minDistanceMeters = Infinity;
    let closestSegmentIndex = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
      const dist = distancePointToSegmentMeters(
        hazard.center[0],
        hazard.center[1],
        coordinates[i][0],
        coordinates[i][1],
        coordinates[i + 1][0],
        coordinates[i + 1][1]
      );

      if (dist < minDistanceMeters) {
        minDistanceMeters = dist;
        closestSegmentIndex = i;
      }
    }

    // A route intersects if its minimum distance to hazard center is <= hazard radius
    // Adding 5% threshold to account for multilane road width and curb boundaries
    const dangerThresholdMeters = hazard.radiusMeters * 1.05;

    if (minDistanceMeters <= dangerThresholdMeters) {
      const approxDistKm = (segmentCumulativeDists[closestSegmentIndex] || 0) / 1000;
      intersected.push({
        hazardId: hazard.id,
        name: hazard.name,
        severity: hazard.severity,
        waterDepthCm: hazard.waterDepthCm,
        distanceFromStartKm: Math.round(approxDistKm * 10) / 10,
        minimumDistanceMeters: Math.round(minDistanceMeters),
        affectedSegmentIndex: closestSegmentIndex
      });
    }
  }

  return intersected;
}

/**
 * Calculates Deterministic Climate Risk Score (0 - 100)
 */
export function calculateRouteRiskScore(
  hazardsIntersected: IntersectedHazard[],
  hazards: HazardZone[],
  vehicle: VehicleProfile,
  regionalRainMm: number
): { score: number; category: 'SAFE' | 'CAUTION' | 'HAZARDOUS' } {
  let score = Math.min(15, Math.round((regionalRainMm / 50) * 12));

  if (!hazardsIntersected || hazardsIntersected.length === 0) {
    return {
      score: Math.max(5, score),
      category: 'SAFE'
    };
  }

  for (const item of hazardsIntersected) {
    const hazard = hazards.find((h) => h.id === item.hazardId);
    if (!hazard) continue;

    const depthRatio = hazard.waterDepthCm / Math.max(10, vehicle.clearanceCm);
    const clearancePenalty = depthRatio >= 1.0 ? 1.6 : depthRatio >= 0.7 ? 1.2 : 0.8;
    const depthFactor = Math.min(45, (hazard.waterDepthCm / 50) * 35 * clearancePenalty);
    const rainFactor = Math.min(25, (hazard.rainfallIntensityMmPerHour / 50) * 20);
    const severityFactor =
      hazard.severity === 'CRITICAL' ? 35 :
      hazard.severity === 'HIGH' ? 26 :
      hazard.severity === 'MODERATE' ? 16 : 8;

    score += depthFactor + rainFactor + severityFactor;
  }

  const finalScore = Math.min(99, Math.max(5, Math.round(score)));
  let category: 'SAFE' | 'CAUTION' | 'HAZARDOUS' = 'SAFE';
  if (finalScore >= 65) category = 'HAZARDOUS';
  else if (finalScore >= 30) category = 'CAUTION';

  return { score: finalScore, category };
}

/**
 * Determines whether a hazard is considered blocking (impassable/dangerous).
 * Returns true if severity is CRITICAL or HIGH, or depth >= 30 cm.
 */
export function isBlockingHazard(h: { severity: string; waterDepthCm: number }): boolean {
  return h.severity === 'CRITICAL' || h.severity === 'HIGH' || h.waterDepthCm >= 30;
}

export interface CandidateRoute {
  coordinates: [number, number][];
  distanceKm: number;
  durationMinutes: number;
  hazardsIntersected: IntersectedHazard[];
  source: 'OSRM';
  snappedWaypoints?: [number, number][];
}

export interface OSRMFetchResult {
  routes: CandidateRoute[];
  failed: boolean;
  snappedWaypoints?: [number, number][];
}

/**
 * Requests OSRM route candidates between waypoints, tracking success or failure
 */
export async function fetchOSRMRouteResult(
  waypoints: [number, number][],
  alternatives: boolean = true
): Promise<OSRMFetchResult> {
  const results: CandidateRoute[] = [];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const coordsStr = waypoints.map((c) => `${c[1]},${c[0]}`).join(';');
    const altParam = alternatives ? 'alternatives=3' : 'alternatives=false';
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&${altParam}`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return { routes: results, failed: true };
    }

    const data = await res.json();
    if (!data.routes || !Array.isArray(data.routes)) {
      return { routes: results, failed: false };
    }

    // Extract road-network snapped waypoints from OSRM response
    const snappedWaypoints: [number, number][] = [];
    if (Array.isArray(data.waypoints)) {
      for (const wp of data.waypoints) {
        if (wp?.location && Array.isArray(wp.location) && wp.location.length >= 2) {
          snappedWaypoints.push([wp.location[1], wp.location[0]]); // [lat, lng]
        }
      }
    }

    for (const route of data.routes) {
      if (route.geometry?.coordinates?.length > 1) {
        const coords: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        results.push({
          coordinates: coords,
          distanceKm: Math.round((route.distance / 1000) * 10) / 10,
          durationMinutes: Math.round(route.duration / 60),
          hazardsIntersected: [],
          source: 'OSRM',
          snappedWaypoints
        });
      }
    }
    return { routes: results, failed: false, snappedWaypoints };
  } catch (err) {
    clearTimeout(timeoutId);
    return { routes: results, failed: true };
  }
}

/**
 * Requests OSRM route candidates between waypoints
 */
export async function fetchOSRMRouteCandidates(
  waypoints: [number, number][],
  alternatives: boolean = true
): Promise<CandidateRoute[]> {
  const res = await fetchOSRMRouteResult(waypoints, alternatives);
  return res.routes;
}

/**
 * Generates candidate bypass waypoints that steer clean of a specific hazard
 */
function generateBypassWaypoints(
  origin: [number, number],
  dest: [number, number],
  hazard: HazardZone,
  activeHazards: HazardZone[]
): [number, number][] {
  const waypoints: [number, number][] = [];

  const dLat = dest[0] - origin[0];
  const dLon = dest[1] - origin[1];
  const len = Math.hypot(dLat, dLon) || 0.001;

  // Normal unit vectors
  const normLat = -dLon / len;
  const normLon = dLat / len;

  // Distance offsets: 1.5km, 2.5km, 3.5km, 5km
  const offsetsMeters = [1800, 2800, 4000, 5500];

  for (const distM of offsetsMeters) {
    const degLat = (distM / 110540);
    const degLon = (distM / (111320 * Math.cos((hazard.center[0] * Math.PI) / 180)));

    // Candidate 1: Perpendicular positive side
    const p1: [number, number] = [
      hazard.center[0] + normLat * degLat,
      hazard.center[1] + normLon * degLon
    ];

    // Candidate 2: Perpendicular negative side
    const p2: [number, number] = [
      hazard.center[0] - normLat * degLat,
      hazard.center[1] - normLon * degLon
    ];

    // Candidate 3 & 4: North and South lateral shifts
    const p3: [number, number] = [hazard.center[0] + degLat, hazard.center[1]];
    const p4: [number, number] = [hazard.center[0] - degLat, hazard.center[1]];

    // Candidate 5 & 6: East and West lateral shifts
    const p5: [number, number] = [hazard.center[0], hazard.center[1] + degLon];
    const p6: [number, number] = [hazard.center[0], hazard.center[1] - degLon];

    for (const pt of [p1, p2, p3, p4, p5, p6]) {
      // Waypoint must NOT itself be inside any active hazard
      const isInsideAnyHazard = activeHazards.some((h) => {
        const d = calculateDistanceMeters(pt[0], pt[1], h.center[0], h.center[1]);
        return d <= h.radiusMeters + 300;
      });

      if (!isInsideAnyHazard) {
        waypoints.push(pt);
      }
    }
  }

  return waypoints;
}

function inferCityFromCoordinates(lat: number, lon: number): string {
  const cityEntries: [string, [number, number]][] = [
    ['bengaluru', [12.9716, 77.5946]],
    ['chennai', [13.0827, 80.2707]],
    ['mumbai', [19.0760, 72.8777]],
    ['delhi', [28.6139, 77.2090]]
  ];
  let closest = 'bengaluru';
  let minDist = Infinity;
  for (const [cId, coords] of cityEntries) {
    const d = calculateDistanceMeters(lat, lon, coords[0], coords[1]);
    if (d < minDist) {
      minDist = d;
      closest = cId;
    }
  }
  return closest;
}

/**
 * Dual Route Calculation and Real Hazard Avoidance Engine
 *
 * GUARANTEE:
 * A route is ONLY designated as "SAFE" if its polyline has been mathematically
 * verified to avoid the hazards that the fastest route intersects.
 * If no flood-free candidate exists, safeRouteFound is false and safe is null.
 */
export async function calculateDualRoutes(
  origin: [number, number],
  destination: [number, number],
  hazards: HazardZone[],
  vehicle: VehicleProfile,
  regionalRainMm: number = 32,
  _scenarioId?: string,
  requestedCity?: string
): Promise<RouteComparisonResponse> {
  const targetCity = (requestedCity || inferCityFromCoordinates(origin[0], origin[1])).toLowerCase();
  let osrmCallsFailed = false;

  // Hazard filtering:
  // - A hazard with a missing status must be treated as ACTIVE (keep the console.warn).
  // - A hazard with a missing city must be logged and, if the request has a known city,
  //   treated as belonging to it only if its coordinates fall within that city's viewbox; otherwise excluded with the warning.
  const activeCityHazards = hazards.filter((h) => {
    let isActive = false;
    if (!h.status) {
      console.warn(`[HAZARD VALIDATION] Hazard "${h.id}" missing status. Treating as ACTIVE.`);
      isActive = true;
    } else {
      isActive = h.status.toLowerCase() === 'active';
    }

    if (!isActive) {
      return false;
    }

    let belongsToCity = false;
    if (!h.city) {
      console.warn(`[HAZARD VALIDATION] Hazard "${h.id}" missing city.`);
      const cityVb = (CITY_VIEWBOXES as Record<string, { left: number; top: number; right: number; bottom: number }>)[targetCity];
      if (cityVb && h.center) {
        const minLat = Math.min(cityVb.top, cityVb.bottom);
        const maxLat = Math.max(cityVb.top, cityVb.bottom);
        const minLon = Math.min(cityVb.left, cityVb.right);
        const maxLon = Math.max(cityVb.left, cityVb.right);
        const inside =
          h.center[0] >= minLat &&
          h.center[0] <= maxLat &&
          h.center[1] >= minLon &&
          h.center[1] <= maxLon;
        if (inside) {
          belongsToCity = true;
        } else {
          console.warn(`[HAZARD VALIDATION] Hazard "${h.id}" missing city and coordinates outside ${targetCity} viewbox. Excluding.`);
        }
      } else {
        console.warn(`[HAZARD VALIDATION] Hazard "${h.id}" missing city and no viewbox found for city "${targetCity}". Excluding.`);
      }
    } else {
      belongsToCity = h.city.toLowerCase() === targetCity;
    }

    return belongsToCity;
  });

  console.log(`[ROUTING TRACE] Request: origin=[${origin[0]}, ${origin[1]}], dest=[${destination[0]}, ${destination[1]}], city=${targetCity}`);
  console.log(`[ROUTING TRACE] Active city hazards count: ${activeCityHazards.length} (filtered from ${hazards.length})`);

  // 1. Fetch primary route candidates from OSRM
  const primaryResult = await fetchOSRMRouteResult([origin, destination], true);
  if (primaryResult.failed) {
    osrmCallsFailed = true;
  }
  const candidates = primaryResult.routes;

  // If OSRM returned nothing, do not draw synthetic routes; throw and surface service unavailability
  if (candidates.length === 0) {
    throw new Error('Routing service unavailable');
  }

  // 2. Evaluate hazard intersections for every baseline candidate
  for (const c of candidates) {
    c.hazardsIntersected = detectHazardIntersections(c.coordinates, activeCityHazards);
  }

  // 3. Fastest route is candidate with minimum duration
  candidates.sort((a, b) => a.durationMinutes - b.durationMinutes);
  const fastestCandidate = candidates[0];
  const fastestHazards = fastestCandidate.hazardsIntersected;

  console.log(`[ROUTING TRACE] Fastest route: ${fastestCandidate.distanceKm} km, ${fastestCandidate.durationMinutes} min, intersected hazards: ${fastestHazards.length}`);
  fastestHazards.forEach((h) => {
    console.log(`  -> Fastest intersects: ${h.name} (${h.waterDepthCm} cm, min distance: ${h.minimumDistanceMeters}m)`);
  });

  // FIX 2: Safe route logic must use blocking hazards, not "any hazard"
  let safeCandidate: CandidateRoute | null = null;
  const blockingOnFastest = fastestHazards.filter(isBlockingHazard);

  if (blockingOnFastest.length === 0) {
    // If blockingOnFastest is empty, the fastest route IS the safe route:
    // no detour search, no extra bypass call.
    safeCandidate = fastestCandidate;
  } else {
    // Only search for bypasses when blockingOnFastest is non-empty.
    // Check if any other alternative route returned by OSRM avoids all blocking hazards
    const cleanAlternative = candidates.slice(1).find((c) => {
      return c.hazardsIntersected.filter(isBlockingHazard).length === 0;
    });

    if (cleanAlternative) {
      console.log(`[ROUTING TRACE] Found clean alternative route from OSRM alternatives: ${cleanAlternative.distanceKm} km`);
      safeCandidate = cleanAlternative;
    } else {
      // None of the default alternatives avoided the blocking hazards.
      // Systematically search for alternative road corridors via bypass waypoints.
      console.log(`[ROUTING TRACE] Searching bypass corridors around ${blockingOnFastest.length} blocking hazard(s)...`);

      const evaluatedSafeCandidates: CandidateRoute[] = [];

      // Sort blockingOnFastest by severity (descending), then water depth (descending)
      const severityRank: Record<string, number> = {
        CRITICAL: 4,
        HIGH: 3,
        MODERATE: 2,
        LOW: 1
      };
      blockingOnFastest.sort((a, b) => {
        const diffSev = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
        if (diffSev !== 0) return diffSev;
        return b.waterDepthCm - a.waterDepthCm;
      });

      // When choosing the hazard to bypass, pick from blockingOnFastest
      const worstHazardMeta = activeCityHazards.find((h) => h.id === blockingOnFastest[0].hazardId);

      if (worstHazardMeta) {
        const bypassWaypoints = generateBypassWaypoints(origin, destination, worstHazardMeta, activeCityHazards);
        console.log(`[ROUTING TRACE] Generated ${bypassWaypoints.length} candidate bypass waypoints`);

        // Item 1: Run the bypass calls in parallel with Promise.all (max 5)
        const cappedWaypoints = bypassWaypoints.slice(0, 5);

        const bypassResults = await Promise.all(
          cappedWaypoints.map((wp) => fetchOSRMRouteResult([origin, wp, destination], false))
        );

        for (const wpRes of bypassResults) {
          if (wpRes.failed) {
            osrmCallsFailed = true;
          }
          if (wpRes.routes.length > 0) {
            const r = wpRes.routes[0];

            // Strict invariant: route must come from real OSRM road network geometry
            if (r.source !== 'OSRM' || !r.coordinates || r.coordinates.length < 2) {
              continue;
            }

            // Verify bypass waypoint is within the road network:
            // If OSRM returned snapped waypoints, verify that the bypass waypoint was snapped onto the road network
            // and that its snapped road location does not land inside an active hazard.
            if (wpRes.snappedWaypoints && wpRes.snappedWaypoints.length >= 2) {
              const snappedBypass = wpRes.snappedWaypoints.length >= 3 ? wpRes.snappedWaypoints[1] : wpRes.snappedWaypoints[0];
              const isSnappedInsideHazard = activeCityHazards.some((h) => {
                const d = calculateDistanceMeters(snappedBypass[0], snappedBypass[1], h.center[0], h.center[1]);
                return d <= h.radiusMeters * 1.05;
              });
              if (isSnappedInsideHazard) {
                // Discard candidate: snapped road location falls inside an active hazard
                continue;
              }
            }

            const rHazards = detectHazardIntersections(r.coordinates, activeCityHazards);
            r.hazardsIntersected = rHazards;

            // Strict test: does this bypass route avoid blocking hazards and the worst hazard that fastest hit?
            const hitsBlocking = rHazards.some((h) => isBlockingHazard(h));
            const hitsWorst = rHazards.some((h) => h.hazardId === worstHazardMeta.id);

            if (!hitsBlocking && !hitsWorst) {
              evaluatedSafeCandidates.push(r);
            }
          }
        }
      }

      if (evaluatedSafeCandidates.length > 0) {
        // Sort by fewest hazards first, then shortest duration
        evaluatedSafeCandidates.sort((a, b) => {
          if (a.hazardsIntersected.length !== b.hazardsIntersected.length) {
            return a.hazardsIntersected.length - b.hazardsIntersected.length;
          }
          return a.durationMinutes - b.durationMinutes;
        });
        safeCandidate = evaluatedSafeCandidates[0];
      }
    }
  }

  // 5. Verification & Safety Invariant Assertion
  let safeRouteFound = false;
  let finalSafeRoute: RouteOption | null = null;
  let noSafeRouteReason: string | null = null;

  if (safeCandidate) {
    const verifiedSafeHazards = detectHazardIntersections(safeCandidate.coordinates, activeCityHazards);
    const blockingHazardsOnSafe = verifiedSafeHazards.filter((h) => isBlockingHazard(h));

    if (blockingHazardsOnSafe.length === 0) {
      // Verified safe!
      safeRouteFound = true;
      const safeRisk = calculateRouteRiskScore(verifiedSafeHazards, activeCityHazards, vehicle, regionalRainMm);

      let safeExplanation = '';
      if (verifiedSafeHazards.length === 0) {
        const avoidsCount = fastestHazards.length;
        safeExplanation = `Avoids ${avoidsCount} flood hazard(s). No known hazards on this route.`;
      } else {
        const avoidsBlockingCount = blockingOnFastest.length;
        const minorNames = verifiedSafeHazards.map((h) => h.name).join(', ');
        safeExplanation = `Avoids ${avoidsBlockingCount} blocking hazard(s). Minor hazards remain: ${minorNames}.`;
      }

      // Item 5: Add a flag longDetour=true on the safe route when its duration is more than 2.5x the fastest
      const isLongDetour = safeCandidate.durationMinutes > fastestCandidate.durationMinutes * 2.5;

      finalSafeRoute = {
        type: 'SAFE',
        distanceKm: safeCandidate.distanceKm,
        durationMinutes: safeCandidate.durationMinutes,
        riskScore: safeRisk.score,
        riskCategory: safeRisk.category,
        coordinates: safeCandidate.coordinates,
        geometry: safeCandidate.coordinates,
        hazardsIntersected: verifiedSafeHazards,
        explanation: safeExplanation,
        longDetour: isLongDetour,
        source: 'OSRM'
      };
    } else {
      console.warn(`[ROUTING SAFETY CHECK] Candidate safe route intersects blocking hazards:`, blockingHazardsOnSafe);
      safeRouteFound = false;
      finalSafeRoute = null;
      if (osrmCallsFailed) {
        noSafeRouteReason = "Couldn't verify an alternate route (routing service error). Try again.";
      } else {
        noSafeRouteReason = `No flood-safe alternate route found. All evaluated routes cross ${blockingHazardsOnSafe[0].name} (${blockingHazardsOnSafe[0].waterDepthCm} cm water depth).`;
      }
    }
  } else {
    safeRouteFound = false;
    finalSafeRoute = null;
    if (osrmCallsFailed) {
      noSafeRouteReason = "Couldn't verify an alternate route (routing service error). Try again.";
    } else if (blockingOnFastest.length > 0) {
      noSafeRouteReason = `No flood-safe alternate route found. All viable paths traverse ${blockingOnFastest[0].name} (${blockingOnFastest[0].waterDepthCm} cm water depth).`;
    } else {
      noSafeRouteReason = 'No route available between the specified locations.';
    }
  }

  // Calculate fastest route risk
  const fastestRisk = calculateRouteRiskScore(fastestHazards, activeCityHazards, vehicle, regionalRainMm);

  let fastestExplanation = '';
  if (fastestHazards.length === 0) {
    fastestExplanation = 'No known hazards on this route.';
  } else if (blockingOnFastest.length === 0) {
    const minorNames = fastestHazards.map((h) => h.name).join(', ');
    fastestExplanation = `Minor hazards remain: ${minorNames}.`;
  } else {
    const blockingNames = blockingOnFastest.map((h) => `${h.name} (${h.waterDepthCm} cm)`).join(', ');
    const minorRemaining = fastestHazards.filter((h) => !isBlockingHazard(h));
    if (minorRemaining.length > 0) {
      const minorNames = minorRemaining.map((h) => h.name).join(', ');
      fastestExplanation = `Passes through ${blockingOnFastest.length} blocking hazard(s): ${blockingNames}. Minor hazards remain: ${minorNames}.`;
    } else {
      fastestExplanation = `Passes through ${blockingOnFastest.length} blocking hazard(s): ${blockingNames}.`;
    }
  }

  const finalFastestRoute: RouteOption = {
    type: 'FASTEST',
    distanceKm: fastestCandidate.distanceKm,
    durationMinutes: fastestCandidate.durationMinutes,
    riskScore: fastestRisk.score,
    riskCategory: fastestRisk.category,
    coordinates: fastestCandidate.coordinates,
    geometry: fastestCandidate.coordinates,
    hazardsIntersected: fastestHazards,
    explanation: fastestExplanation,
    source: 'OSRM'
  };

  const avoidedHazardsCount = finalSafeRoute
    ? Math.max(0, fastestHazards.length - finalSafeRoute.hazardsIntersected.length)
    : 0;

  const timeDeltaMinutes = finalSafeRoute
    ? Math.max(0, finalSafeRoute.durationMinutes - finalFastestRoute.durationMinutes)
    : 0;

  const distanceDeltaKm = finalSafeRoute
    ? Math.round((finalSafeRoute.distanceKm - finalFastestRoute.distanceKm) * 10) / 10
    : 0;

  const riskDeltaPercent = finalSafeRoute && fastestRisk.score > 0
    ? Math.round(((finalSafeRoute.riskScore - fastestRisk.score) / fastestRisk.score) * 100)
    : 0;

  // Build unambiguous safety summary
  let safetySummary = '';
  if (!safeRouteFound) {
    safetySummary = noSafeRouteReason || 'No flood-safe alternate route found.';
  } else if (avoidedHazardsCount > 0) {
    const worst = blockingOnFastest[0] || fastestHazards[0];
    safetySummary = `Fastest route leads directly through ${worst.name} (${worst.waterDepthCm} cm water depth). Verified safe detour adds ${timeDeltaMinutes} min (+${distanceDeltaKm} km) and completely avoids all critical flood zones.`;
  } else {
    safetySummary = 'Both routes operate within safe thresholds. Maintain wet-weather caution.';
  }

  console.log(`[ROUTING RESULT] safeRouteFound=${safeRouteFound}, avoidedHazardsCount=${avoidedHazardsCount}`);
  if (finalSafeRoute) {
    console.log(`[ROUTING RESULT] Safe route verified: ${finalSafeRoute.distanceKm} km, hazards: ${finalSafeRoute.hazardsIntersected.length}, longDetour=${finalSafeRoute.longDetour}`);
  }

  return {
    fastest: finalFastestRoute,
    safe: finalSafeRoute,
    safeRouteFound,
    noSafeRouteReason,
    riskDeltaPercent,
    timeDeltaMinutes,
    distanceDeltaKm,
    avoidedHazardsCount,
    safetySummary,
    vehicleProfile: vehicle
  };
}
