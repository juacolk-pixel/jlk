import { StaticSnapshotAdapter } from './static-snapshot-adapter';

// Punto único de cambio: reemplazar este adaptador por uno HTTP/Turso cuando
// la capa normalizada esté lista. La interfaz de la página no necesita cambiar.
export const odepaData = new StaticSnapshotAdapter();

export type * from './types';
