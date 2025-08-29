import './globals.css';
import { AuthProvider } from '@/lib/hooks/useAuth';
import { PublicAuthProvider } from '@/lib/hooks/usePublicAuth';
import { OpenModeProvider } from '@/lib/hooks/useOpenMode';
import { BreadcrumbProvider } from '@/lib/context/breadcrumbContext';
import { APP_CONFIG } from '@/lib/config';

export const metadata = {
  title: APP_CONFIG.APP_NAME,
  description: APP_CONFIG.APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <PublicAuthProvider>
            <OpenModeProvider>
              <BreadcrumbProvider>
                {children}
              </BreadcrumbProvider>
            </OpenModeProvider>
          </PublicAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
