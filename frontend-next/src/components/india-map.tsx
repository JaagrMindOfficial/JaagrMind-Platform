"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { MapPin, Building2 } from "lucide-react"
import { INDIA_STATE_PATHS } from "./india-map-data"

export interface CityMetric {
  city: string
  state: string
  count: number
  schools?: Array<{
    id: string
    name: string
    code: string
    status?: string
  }>
}

interface IndiaMapProps {
  distribution: CityMetric[]
  totalSchools: number
}

// Geometrically projected city coordinates matching viewBox 0 0 600 660
const CITY_PROJECTED_COORDS: Record<string, { x: number; y: number; state: string; labelOffset?: { dx: number; dy: number } }> = {
  "hyderabad": { x: 219.5, y: 436.5, state: "Telangana", labelOffset: { dx: 12, dy: -18 } },
  "bangalore": { x: 202.8, y: 522.0, state: "Karnataka", labelOffset: { dx: 12, dy: -18 } },
  "bengaluru": { x: 202.8, y: 522.0, state: "Karnataka", labelOffset: { dx: 12, dy: -18 } },
  "mumbai": { x: 114.6, y: 403.3, state: "Maharashtra", labelOffset: { dx: -70, dy: -20 } },
  "pune": { x: 132.9, y: 414.2, state: "Maharashtra", labelOffset: { dx: 12, dy: 10 } },
  "delhi": { x: 195.6, y: 208.0, state: "Delhi NCR", labelOffset: { dx: 12, dy: -20 } },
  "new delhi": { x: 195.6, y: 208.0, state: "Delhi NCR", labelOffset: { dx: 12, dy: -20 } },
  "delhi ncr": { x: 195.6, y: 208.0, state: "Delhi NCR", labelOffset: { dx: 12, dy: -20 } },
  "chennai": { x: 252.8, y: 519.9, state: "Tamil Nadu", labelOffset: { dx: 14, dy: -16 } },
  "kolkata": { x: 404.1, y: 333.3, state: "West Bengal", labelOffset: { dx: 14, dy: -18 } },
  "kochi": { x: 178.0, y: 580.0, state: "Kerala", labelOffset: { dx: -60, dy: 10 } },
  "jaipur": { x: 169.0, y: 244.0, state: "Rajasthan", labelOffset: { dx: -65, dy: -18 } },
  "ahmedabad": { x: 108.9, y: 324.2, state: "Gujarat", labelOffset: { dx: -75, dy: -10 } },
  "chandigarh": { x: 187.6, y: 162.4, state: "Punjab", labelOffset: { dx: 12, dy: -20 } },
  "lucknow": { x: 265.5, y: 245.3, state: "Uttar Pradesh", labelOffset: { dx: 12, dy: -20 } },
  "bhopal": { x: 199.4, y: 319.4, state: "Madhya Pradesh", labelOffset: { dx: 12, dy: -16 } },
  "patna": { x: 343.8, y: 271.4, state: "Bihar", labelOffset: { dx: 12, dy: -18 } },
  "bhubaneswar": { x: 356.6, y: 379.0, state: "Odisha", labelOffset: { dx: 14, dy: -16 } },
  "guwahati": { x: 467.1, y: 260.0, state: "Assam", labelOffset: { dx: 14, dy: -18 } },
}

export function IndiaDistributionMap({ distribution, totalSchools }: IndiaMapProps) {
  const [selectedCity, setSelectedCity] = useState<CityMetric | null>(null)
  const [hoveredCity, setHoveredCity] = useState<CityMetric | null>(null)
  const [hoveredState, setHoveredState] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"city" | "state">("city")

  // State aggregation
  const stateMap: Record<string, { state: string; count: number; cities: string[] }> = {}
  distribution.forEach((item) => {
    const s = item.state || "Other"
    if (!stateMap[s]) {
      stateMap[s] = { state: s, count: 0, cities: [] }
    }
    stateMap[s].count += item.count
    if (!stateMap[s].cities.includes(item.city)) {
      stateMap[s].cities.push(item.city)
    }
  })
  const stateList = Object.values(stateMap).sort((a, b) => b.count - a.count)

  const activeCity = hoveredCity || selectedCity

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Map Graphic Area */}
      <div className="lg:col-span-7 bg-muted/15 dark:bg-zinc-950/40 border border-border/60 rounded-xl p-4 relative overflow-hidden flex flex-col items-center">
        {/* Top Controls */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" /> India Geographic Coverage
            </span>
            <Badge variant="outline" className="text-[10px] font-normal py-0 h-4 text-muted-foreground">
              Official Survey Boundaries
            </Badge>
          </div>
          <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border/60 text-[11px]">
            <button
              onClick={() => setViewMode("city")}
              className={`px-2.5 py-0.5 rounded-md font-medium transition-all ${
                viewMode === "city"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              By City
            </button>
            <button
              onClick={() => setViewMode("state")}
              className={`px-2.5 py-0.5 rounded-md font-medium transition-all ${
                viewMode === "state"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              By State
            </button>
          </div>
        </div>

        {/* SVG Container: Authentic GeoJSON India Map with All 37 States */}
        <div className="relative w-full max-w-[520px] aspect-[600/660] my-2">
          <svg
            viewBox="0 0 600 660"
            className="w-full h-full select-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Base landmass outline & state polygons */}
            <g className="states-layer">
              {INDIA_STATE_PATHS.map((state) => {
                const stateData = stateMap[state.name]
                const hasSchools = !!stateData && stateData.count > 0
                const isHovered = hoveredState === state.name

                let fillClass = "fill-muted/30 dark:fill-zinc-900/60"
                if (hasSchools && viewMode === "state") {
                  fillClass = isHovered
                    ? "fill-primary/25"
                    : "fill-primary/15"
                } else if (isHovered) {
                  fillClass = "fill-muted/60 dark:fill-zinc-800/60"
                }

                return (
                  <path
                    key={state.name}
                    d={state.path}
                    className={`${fillClass} stroke-border/70 dark:stroke-zinc-800/90 stroke-[0.75] transition-colors duration-150 cursor-pointer`}
                    onMouseEnter={() => setHoveredState(state.name)}
                    onMouseLeave={() => setHoveredState(null)}
                  >
                    <title>{`${state.name}${hasSchools ? `: ${stateData.count} schools` : ""}`}</title>
                  </path>
                )
              })}
            </g>

            {/* City Pins: Exact pin dot + floating pill card (OpenPanel style) */}
            {viewMode === "city" && (
              <g className="pins-layer">
                {distribution.map((item) => {
                  const cleanCityName = item.city.split(',')[0].trim()
                  const key = cleanCityName.toLowerCase()
                  const coord = CITY_PROJECTED_COORDS[key] || {
                    x: 220 + (Math.sin(cleanCityName.length * 3) * 60),
                    y: 400 + (Math.cos(cleanCityName.length * 3) * 60),
                    state: item.state || "India",
                    labelOffset: { dx: 10, dy: -18 },
                  }

                  const isSelected =
                    selectedCity?.city.toLowerCase() === key ||
                    hoveredCity?.city.toLowerCase() === key ||
                    selectedCity?.city.toLowerCase().startsWith(key)

                  const offset = coord.labelOffset || { dx: 10, dy: -18 }
                  const tagX = coord.x + offset.dx
                  const tagY = coord.y + offset.dy

                  const tagWidth = 85 + cleanCityName.length * 5.5
                  const tagHeight = 22

                  return (
                    <g
                      key={item.city}
                      className="cursor-pointer select-none"
                      onMouseEnter={() => setHoveredCity(item)}
                      onMouseLeave={() => setHoveredCity(null)}
                      onClick={() => setSelectedCity(item)}
                    >
                      {/* Leader Stem Line (from dot to tag) */}
                      <line
                        x1={coord.x}
                        y1={coord.y}
                        x2={tagX + (offset.dx > 0 ? 0 : tagWidth)}
                        y2={tagY + tagHeight / 2}
                        className="stroke-muted-foreground/40 stroke-[1]"
                        strokeDasharray="2 2"
                      />

                      {/* Stationary Pinpoint Dot (DOES NOT MOVE OR SCALE) */}
                      <circle
                        cx={coord.x}
                        cy={coord.y}
                        r={4}
                        className="fill-foreground stroke-background stroke-2"
                      />

                      {/* Floating OpenPanel-style Tag Pill */}
                      <g transform={`translate(${tagX}, ${tagY})`}>
                        <rect
                          width={tagWidth}
                          height={tagHeight}
                          rx={5}
                          className={`transition-colors ${
                            isSelected
                              ? "fill-background stroke-primary stroke-[1.5] filter drop-shadow-md"
                              : "fill-background dark:fill-zinc-900 stroke-border/90 stroke-1 filter drop-shadow-sm"
                          }`}
                        />
                        {/* Green Status Bullet */}
                        <circle
                          cx={10}
                          cy={11}
                          r={3}
                          className="fill-emerald-500"
                        />
                        {/* Count */}
                        <text
                          x={18}
                          y={14.5}
                          className="text-[11px] font-semibold fill-foreground select-none"
                        >
                          {item.count}
                        </text>
                        {/* Vertical Bar */}
                        <text
                          x={26 + (item.count >= 10 ? 6 : 0)}
                          y={14.5}
                          className="text-[11px] font-light fill-muted-foreground/50 select-none"
                        >
                          |
                        </text>
                        {/* City Name */}
                        <text
                          x={34 + (item.count >= 10 ? 6 : 0)}
                          y={14.5}
                          className="text-[11px] font-medium fill-foreground select-none"
                        >
                          {cleanCityName}
                        </text>
                      </g>
                    </g>
                  )
                })}
              </g>
            )}
          </svg>

          {/* Floating Details Footer */}
          {activeCity && (
            <div className="absolute bottom-2 left-2 right-2 bg-background/95 backdrop-blur-md border border-border shadow-xl rounded-lg p-3 text-xs flex items-center justify-between animate-in fade-in-0 duration-150">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-sm">{activeCity.city}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {activeCity.state || "State"}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-[11px] flex items-center gap-2">
                  <span>Registered Institutions: <strong className="text-foreground">{activeCity.count}</strong></span>
                  <span>•</span>
                  <span>Share: <strong>{totalSchools > 0 ? Math.round((activeCity.count / totalSchools) * 100) : 0}%</strong></span>
                </div>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">
                {activeCity.count} Campus{activeCity.count > 1 ? "es" : ""}
              </Badge>
            </div>
          )}

          {/* Hovered State Tooltip (when in state mode) */}
          {viewMode === "state" && hoveredState && (
            <div className="absolute top-2 left-2 bg-background/95 backdrop-blur-md border border-border shadow-md rounded-md px-2.5 py-1 text-xs flex items-center gap-2 pointer-events-none">
              <span className="font-semibold text-foreground">{hoveredState}</span>
              <span className="text-muted-foreground text-[11px]">
                {stateMap[hoveredState] ? `${stateMap[hoveredState].count} schools` : "0 schools"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Breakdown Leaderboard */}
      <div className="lg:col-span-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {viewMode === "city" ? "City Breakdown" : "State Breakdown"}
          </h4>
          <span className="text-[11px] text-muted-foreground font-medium">
            {totalSchools} Total Campuses
          </span>
        </div>

        {viewMode === "city" ? (
          <div className="space-y-2.5">
            {distribution.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border rounded-lg">
                No location data recorded yet.
              </div>
            ) : (
              distribution.map((item) => {
                const percent = totalSchools > 0 ? Math.round((item.count / totalSchools) * 100) : 0
                const isSelected = selectedCity?.city.toLowerCase() === item.city.toLowerCase()

                return (
                  <div
                    key={item.city}
                    onClick={() => setSelectedCity(item)}
                    onMouseEnter={() => setHoveredCity(item)}
                    onMouseLeave={() => setHoveredCity(null)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "bg-card border-border/60 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <MapPin className="h-3 w-3 text-primary" />
                        <span>{item.city}</span>
                        {item.state && (
                          <span className="text-[10px] text-muted-foreground">({item.state})</span>
                        )}
                      </div>
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <span>{item.count}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">({percent}%)</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {stateList.map((item) => {
              const percent = totalSchools > 0 ? Math.round((item.count / totalSchools) * 100) : 0

              return (
                <div
                  key={item.state}
                  className="p-3 rounded-lg border bg-card border-border/60 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{item.state}</span>
                    <div className="font-semibold text-foreground flex items-center gap-1">
                      <span>{item.count}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">({percent}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Cities: {item.cities.join(", ")}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
