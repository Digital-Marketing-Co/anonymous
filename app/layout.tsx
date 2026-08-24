import './globals.css';
export const metadata = {
  title: 'Anonymous.cool Historical Reconstruction',
  description: 'Wayback Machine archival reconstruction, chronology, diffs and provenance for anonymous.cool',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
