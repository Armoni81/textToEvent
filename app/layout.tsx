import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import SignOutButton from "@/components/SignOutButton";

export const metadata = {
  title: "textToEvent",
  description: "Manage your guest list and messaging",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6c5ce7",
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

// Every link in the header nav shares this exact style.
const NAV_ITEM =
  "px-3 py-2 rounded-full text-sm font-medium text-white/90 hover:bg-white/10";

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
          {/*
            Phones: row 1 = logo + theme toggle (top right), row 2 = nav links.
            Larger screens: everything on one row, theme toggle still far right.
          */}
          <div className="max-w-4xl mx-auto px-4 pt-3 pb-2 sm:py-5 flex flex-wrap sm:flex-nowrap items-center">
            <a
              href="/"
              className="order-1 mr-auto text-xl sm:text-2xl font-bold tracking-tight text-white"
            >
              text<span style={{ color: "var(--sunshine)" }}>To</span>Event
            </a>

            <nav className="order-3 sm:order-2 w-[calc(100%+1.5rem)] -mx-3 sm:w-auto sm:mx-0 flex items-center justify-between sm:justify-end sm:gap-1">
              <a href="/" className={NAV_ITEM}>
                Guests
              </a>
              <a href="/upload" className={NAV_ITEM}>
                Upload
              </a>
              <SignOutButton />
            </nav>

            <div className="order-2 sm:order-3 -mr-3 sm:ml-1">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer
          className="border-t mt-10"
          style={{ borderColor: "var(--cloud-line)" }}
        >
          <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between text-xs opacity-60">
            <span>© textToEvent</span>
            <a href="/privacy" className="underline hover:opacity-70 py-2">
              Privacy Policy
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
