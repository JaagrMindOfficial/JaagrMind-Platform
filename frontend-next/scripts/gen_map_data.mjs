import { geoMercator, geoPath } from 'd3-geo';
import fs from 'fs';

const rawData = fs.readFileSync('./public/maps/india.json', 'utf8');
const data = JSON.parse(rawData);
const width = 600;
const height = 660;

const projection = geoMercator().fitExtent([[20, 20], [width - 20, height - 20]], data);
const pathGenerator = geoPath().projection(projection);

const states = data.features.map(f => ({
  name: f.properties.st_nm,
  path: pathGenerator(f)
}));

const content = `// Official and authentic GeoJSON paths for India with all 37 states & UTs
export interface StateGeoPath {
  name: string
  path: string
}

export const INDIA_STATE_PATHS: StateGeoPath[] = ${JSON.stringify(states, null, 2)};
`;

fs.writeFileSync('./src/components/india-map-data.ts', content, 'utf8');
console.log('Generated india-map-data.ts with', states.length, 'states');
