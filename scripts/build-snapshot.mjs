import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

const SOURCE_URL = 'https://datos.odepa.gob.cl/dataset/33f10516-acbe-4446-b633-68244b9b6b26/resource/580beca0-e87e-4dd4-9e8a-0bd92773f4a6/download/precio_mayorista_fruta-hortaliza_2026.csv';
const OUTPUT_PATH = new URL('../public/data/odepa-2026.json', import.meta.url);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}

function decimal(value) {
  return Number(value.replace(/\./g, '').replace(',', '.'));
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right, 'es-CL'));
}

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`ODEPA respondió con estado ${response.status}.`);
const bytes = new Uint8Array(await response.arrayBuffer());
const text = new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/, '');
const csv = parseCsv(text);
const header = csv.shift();
const columns = new Map(header.map((name, index) => [name, index]));
const required = ['Fecha', 'Mercado', 'Subsector', 'Producto', 'Variedad / Tipo', 'Calidad', 'Unidad de comercializacion', 'Volumen', 'Precio minimo', 'Precio maximo', 'Precio promedio'];
for (const name of required) if (!columns.has(name)) throw new Error(`Falta la columna ${name}.`);

const groups = new Map();
const dates = new Set();
const products = new Set();
const markets = new Set();
const subsectors = new Set();
const units = new Set();
const varieties = new Set();
const qualities = new Set();
const productSubsector = new Map();

for (const row of csv) {
  const date = row[columns.get('Fecha')];
  const market = row[columns.get('Mercado')];
  const subsector = row[columns.get('Subsector')];
  const product = row[columns.get('Producto')];
  const unit = row[columns.get('Unidad de comercializacion')];
  const variety = row[columns.get('Variedad / Tipo')];
  const quality = row[columns.get('Calidad')];
  const volume = decimal(row[columns.get('Volumen')]);
  const minimum = decimal(row[columns.get('Precio minimo')]);
  const maximum = decimal(row[columns.get('Precio maximo')]);
  const average = decimal(row[columns.get('Precio promedio')]);
  if (![volume, minimum, maximum, average].every(Number.isFinite)) continue;

  dates.add(date);
  products.add(product);
  markets.add(market);
  subsectors.add(subsector);
  units.add(unit);
  varieties.add(variety);
  qualities.add(quality);
  productSubsector.set(product, subsector);

  const key = [date, product, market, subsector, unit, variety, quality].join('\u0000');
  const group = groups.get(key) ?? { date, product, market, subsector, unit, variety, quality, volume: 0, minimum: Infinity, maximum: -Infinity, weighted: 0, observations: 0 };
  group.volume += volume;
  group.minimum = Math.min(group.minimum, minimum);
  group.maximum = Math.max(group.maximum, maximum);
  group.weighted += average * volume;
  group.observations += 1;
  groups.set(key, group);
}

const dateList = sorted(dates);
const productList = sorted(products);
const marketList = sorted(markets);
const subsectorList = sorted(subsectors);
const unitList = sorted(units);
const varietyList = sorted(varieties);
const qualityList = sorted(qualities);
const indexes = (values) => new Map(values.map((value, index) => [value, index]));
const dateIndex = indexes(dateList);
const productIndex = indexes(productList);
const marketIndex = indexes(marketList);
const subsectorIndex = indexes(subsectorList);
const unitIndex = indexes(unitList);
const varietyIndex = indexes(varietyList);
const qualityIndex = indexes(qualityList);

const rows = [...groups.values()]
  .map((group) => [
    dateIndex.get(group.date),
    productIndex.get(group.product),
    marketIndex.get(group.market),
    subsectorIndex.get(group.subsector),
    unitIndex.get(group.unit),
    varietyIndex.get(group.variety),
    qualityIndex.get(group.quality),
    group.volume,
    group.minimum.toFixed(4),
    group.maximum.toFixed(4),
    (group.volume > 0 ? group.weighted / group.volume : 0).toFixed(4),
    group.observations,
  ])
  .sort((left, right) => {
    for (let index = 0; index < 7; index += 1) {
      if (left[index] !== right[index]) return left[index] - right[index];
    }
    return 0;
  });

const snapshot = {
  meta: {
    source_url: SOURCE_URL,
    source_year: 2026,
    fetched_at: new Date().toISOString(),
    max_data_date: dateList.at(-1),
    min_data_date: dateList[0],
    source_rows: csv.length,
    aggregated_rows: rows.length,
    file_sha256: createHash('sha256').update(bytes).digest('hex'),
  },
  dates: dateList,
  products: productList,
  markets: marketList,
  subsectors: subsectorList,
  units: unitList,
  varieties: varietyList,
  qualities: qualityList,
  product_subsectors: productList.map((product) => subsectorIndex.get(productSubsector.get(product))),
  rows,
};

await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await writeFile(OUTPUT_PATH, JSON.stringify(snapshot));
console.log(`Snapshot listo: ${snapshot.meta.source_rows} filas, datos hasta ${snapshot.meta.max_data_date}.`);
