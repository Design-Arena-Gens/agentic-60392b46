import './globals.css'

export const metadata = {
  title: 'Web Windows',
  description: 'Windows-like web desktop',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
