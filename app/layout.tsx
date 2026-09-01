import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://juacolk-pixel.github.io/jlk/'),
  title: 'Campo Claro | Precios mayoristas ODEPA',
  description: 'Evolución de precios de frutas y hortalizas en los principales mercados de Chile.',
  openGraph: {
    title: 'Campo Claro | Precios mayoristas ODEPA',
    description: 'Evolución de precios de frutas y hortalizas en los principales mercados de Chile.',
    images: [{ url: '/jlk/og.jpg', width: 1200, height: 675, alt: 'Campo Claro: precios del campo, sin ruido.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Campo Claro | Precios mayoristas ODEPA',
    description: 'Evolución de precios de frutas y hortalizas en los principales mercados de Chile.',
    images: ['/jlk/og.jpg'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
