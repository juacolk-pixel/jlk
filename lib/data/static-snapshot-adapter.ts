import type { Catalog, OdepaDataAdapter, Series, SeriesQuery, Snapshot } from './types';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

type Aggregate = {
  volume: number;
  minimum: number;
  maximum: number;
  weighted: number;
  observations: number;
};

function emptyAggregate(): Aggregate {
  return { volume: 0, minimum: Infinity, maximum: -Infinity, weighted: 0, observations: 0 };
}

function addRow(group: Aggregate, row: Snapshot['rows'][number]) {
  group.volume += row[7];
  group.minimum = Math.min(group.minimum, Number(row[8]));
  group.maximum = Math.max(group.maximum, Number(row[9]));
  group.weighted += Number(row[10]) * row[7];
  group.observations += row[11];
}

function average(group: Aggregate) {
  return group.volume > 0 ? group.weighted / group.volume : 0;
}

export class StaticSnapshotAdapter implements OdepaDataAdapter {
  private snapshotPromise?: Promise<Snapshot>;

  private loadSnapshot() {
    this.snapshotPromise ??= fetch(`${basePath}/data/odepa-2026.json`).then(async (response) => {
      if (!response.ok) throw new Error('No se pudo cargar la instantánea ODEPA.');
      return await response.json() as Snapshot;
    });
    return this.snapshotPromise;
  }

  async getCatalog(): Promise<Catalog> {
    const snapshot = await this.loadSnapshot();
    const combinationsByProduct = snapshot.products.map(() => new Map<string, { unit: string; variety: string; quality: string; observations: number }>());
    snapshot.rows.forEach((row) => {
      const unit = snapshot.units[row[4]];
      const variety = snapshot.varieties[row[5]];
      const quality = snapshot.qualities[row[6]];
      const key = `${unit}\u0000${variety}\u0000${quality}`;
      const current = combinationsByProduct[row[1]].get(key) ?? { unit, variety, quality, observations: 0 };
      current.observations += row[11];
      combinationsByProduct[row[1]].set(key, current);
    });

    return {
      meta: snapshot.meta,
      products: snapshot.products.map((name, index) => ({
        name,
        subsector: snapshot.subsectors[snapshot.product_subsectors[index]],
        combinations: [...combinationsByProduct[index].values()]
          .sort((left, right) => right.observations - left.observations),
      })),
      markets: snapshot.markets,
      subsectors: snapshot.subsectors,
    };
  }

  async getSeries(query: SeriesQuery): Promise<Series> {
    const snapshot = await this.loadSnapshot();
    const productIndex = snapshot.products.indexOf(query.product);
    const unitIndex = snapshot.units.indexOf(query.unit);
    const varietyIndex = snapshot.varieties.indexOf(query.variety);
    const qualityIndex = snapshot.qualities.indexOf(query.quality);
    const marketIndex = query.market ? snapshot.markets.indexOf(query.market) : -1;
    if (productIndex < 0 || unitIndex < 0 || varietyIndex < 0 || qualityIndex < 0 || (query.market && marketIndex < 0)) {
      return { daily: [], markets: [] };
    }

    const daily = new Map<number, Aggregate>();
    const markets = new Map<number, Aggregate>();
    snapshot.rows.forEach((row) => {
      const date = snapshot.dates[row[0]];
      if (
        row[1] !== productIndex ||
        row[4] !== unitIndex ||
        row[5] !== varietyIndex ||
        row[6] !== qualityIndex ||
        (query.market && row[2] !== marketIndex) ||
        date < query.from ||
        date > query.to
      ) return;

      const dayGroup = daily.get(row[0]) ?? emptyAggregate();
      addRow(dayGroup, row);
      daily.set(row[0], dayGroup);

      const marketGroup = markets.get(row[2]) ?? emptyAggregate();
      addRow(marketGroup, row);
      markets.set(row[2], marketGroup);
    });

    return {
      daily: [...daily.entries()]
        .sort((left, right) => left[0] - right[0])
        .map(([dateIndex, group]) => ({
          date: snapshot.dates[dateIndex],
          volume: group.volume,
          minimum: group.minimum,
          maximum: group.maximum,
          average: average(group),
          observations: group.observations,
        })),
      markets: [...markets.entries()]
        .map(([currentMarketIndex, group]) => ({
          market: snapshot.markets[currentMarketIndex],
          volume: group.volume,
          minimum: group.minimum,
          maximum: group.maximum,
          average: average(group),
          observations: group.observations,
        }))
        .sort((left, right) => right.average - left.average),
    };
  }
}
