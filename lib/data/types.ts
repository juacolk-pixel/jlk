export type CompactRow = [number, number, number, number, number, number, number, number, string, string, string, number];

export type Snapshot = {
  meta: {
    source_url: string;
    fetched_at: string;
    max_data_date: string;
    min_data_date: string;
    source_rows: number;
    aggregated_rows: number;
    file_sha256: string;
  };
  dates: string[];
  products: string[];
  markets: string[];
  subsectors: string[];
  units: string[];
  varieties: string[];
  qualities: string[];
  product_subsectors: number[];
  rows: CompactRow[];
};

export type Catalog = {
  meta: Snapshot['meta'];
  products: Array<{
    name: string;
    subsector: string;
    combinations: Array<{ unit: string; variety: string; quality: string; observations: number }>;
  }>;
  markets: string[];
  subsectors: string[];
};

export type SeriesQuery = {
  product: string;
  unit: string;
  variety: string;
  quality: string;
  market?: string;
  from: string;
  to: string;
};

export type DailyPoint = {
  date: string;
  volume: number;
  minimum: number;
  maximum: number;
  average: number;
  observations: number;
};

export type MarketPoint = {
  market: string;
  volume: number;
  minimum: number;
  maximum: number;
  average: number;
  observations: number;
};

export type Series = { daily: DailyPoint[]; markets: MarketPoint[] };

export interface OdepaDataAdapter {
  getCatalog(): Promise<Catalog>;
  getSeries(query: SeriesQuery): Promise<Series>;
}
