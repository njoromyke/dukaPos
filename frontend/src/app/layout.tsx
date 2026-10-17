import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ThemeProvider from '@/theme/ThemeProvider';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'DukaPoS',
  description: 'Multi-Tenant POS & Inventory System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable} style={{ margin: 0 }}>
        <ThemeProvider>
          <Providers>
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
