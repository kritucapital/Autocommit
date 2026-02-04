import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "AutoCommit | GitHub Auto-Commit Bot",
    description: "Automatically commit to your repositories when collaborators make changes. Stay active on GitHub effortlessly.",
    keywords: "GitHub, auto commit, bot, repository, commit automation",
    authors: [{ name: "AutoCommit" }],
    icons: {
        icon: "/image.png",
        shortcut: "/image.png",
        apple: "/image.png",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
            </head>
            <body className="gradient-bg">
                {children}
            </body>
        </html>
    );
}
