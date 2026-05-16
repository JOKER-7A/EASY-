
import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EASY Prep Master - منصة التدريب اللفظي',
  description: 'منصة تدريب لفظي احترافية بتصحيح ذكي وتايمر ومراجعة أخطاء',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-midnight min-h-screen text-foreground selection:bg-goldenrod selection:text-midnight">
        {children}
      </body>
    </html>
  );
}
