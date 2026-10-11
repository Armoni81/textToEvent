import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import SignOutButton from "@/components/SignOutButton";

export const metadata = {
  title: "textToEvent",
  description: "Manage your guest list and messaging",
};

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <header style={{ backgroundColor: "var(--violet)" }}>
          <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
            <a href="/" className="text-2xl font-bold tracking-tight text-white">
              text<span style={{ color: "var(--sunshine)" }}>To</span>Event
            </a>
            <nav className="flex items-center gap-1 text-sm font-medium">
              <a
                href="/"
                className="px-3 py-1.5 rounded-full text-white/90 hover:bg-white/10"
              >
                Guests
              </a>
              <a
                href="/upload"
                className="px-3 py-1.5 rounded-full text-white/90 hover:bg-white/10"
              >
                Upload
              </a>
              <ThemeToggle />
              <SignOutButton />
            </nav>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer
          className="border-t mt-10"
          style={{ borderColor: "var(--cloud-line)" }}
        >
          <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between text-xs opacity-60">
            <span>© textToEvent</span>
            <a href="/privacy" className="underline hover:opacity-70">
              Privacy Policy
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
