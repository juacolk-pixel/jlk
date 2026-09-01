# Campo Claro ODEPA

Web pública para consultar precios y volúmenes mayoristas de frutas y hortalizas publicados por ODEPA. Esta primera versión reproduce la experiencia de Campo Claro con filtros por tipo, producto, mercado, unidad y fechas; métricas, gráficos y tabla comparativa.

## Arquitectura

```text
GitHub Pages
  → interfaz Next.js exportada como sitio estático
  → OdepaDataAdapter
  → instantánea original ODEPA 2026 (public/data/odepa-2026.json)
```

La versión actual no incluye credenciales ni conecta el navegador directamente a Turso. La publicación descarga el CSV oficial y genera una instantánea compacta; las consultas se calculan en el navegador.

El contrato `OdepaDataAdapter` vive en `lib/data/types.ts`. Para cambiar a Silver/Gold o capa 3, se crea otro adaptador que implemente `getCatalog()` y `getSeries()`, y se cambia únicamente la instancia exportada por `lib/data/index.ts`. Si la nueva fuente requiere credenciales, el adaptador debe llamar una API segura; los tokens de Turso deben permanecer como secretos del backend y nunca usar prefijos públicos.

## Desarrollo

```bash
pnpm install
pnpm dev
node scripts/build-snapshot.mjs  # opcional: refresca el CSV oficial
pnpm build
```

GitHub Actions genera y publica automáticamente el sitio estático en GitHub Pages desde la rama `main`.

Fuente: [ODEPA, precios mayoristas de frutas y hortalizas](https://datos.odepa.gob.cl/).
