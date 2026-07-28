import '../styles/globals.css';

export const metadata = {
    title: {
        default: 'Apni Services - Ride & Delivery SuperApp',
        template: '%s | Apni Services',
    },
    description: 'Book rides, order food, and get deliveries in minutes. Apni Services - Pakistan\'s superapp for rides and delivery.',
    keywords: ['ride hailing', 'food delivery', 'delivery app', 'Lahore', 'Pakistan', 'Apni Services'],
    authors: [{ name: 'Apni Services' }],
    openGraph: {
        title: 'Apni Services - Ride & Delivery SuperApp',
        description: 'Book rides, order food, and get deliveries in minutes.',
        type: 'website',
        locale: 'en_PK',
    },
    themeColor: '#00C851',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    rel="stylesheet"
                    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
                    crossOrigin=""
                />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body>{children}</body>
        </html>
    );
}
