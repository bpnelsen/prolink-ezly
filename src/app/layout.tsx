import AIForeman from '../components/AIForeman'
import { AppProvider } from '../context/AppContext'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-gray-50 text-gray-700">
        <AppProvider>
          {children}
          <AIForeman />
        </AppProvider>
      </body>
    </html>
  );
}
