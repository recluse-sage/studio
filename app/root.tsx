import { ColorSchemeScript, MantineProvider, createTheme } from "@mantine/core";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { LinksFunction } from "react-router";
import "@mantine/core/styles.css";
// Shared Oasis tokens owned by the designer lane. Read only here, never edited here.
import "../src/styles/oasis-tokens.css";
import "../src/styles/oasis-base.css";

// Route import paths (easy to update if the designer moves files):
// Public landing: src/features/landing/LandingPage.tsx exports LandingPage
// Private admin: src/features/admin/AdminDashboard.tsx exports AdminDashboard

const oasisTheme = createTheme({
  primaryColor: "green",
  fontFamily: "var(--oasis-font-body)",
  headings: { fontFamily: "var(--oasis-font-display)" },
});

export const links: LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ColorSchemeScript defaultColorScheme="dark" />
        <Meta />
        <Links />
      </head>
      <body>
        <MantineProvider theme={oasisTheme} defaultColorScheme="dark">
          {children}
        </MantineProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
