import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "CBOE Options Scanner — TickerTrace",
    description:
        "Daily diff of CBOE's option universe — stocks gaining options for the first time and weekly-options promotions and demotions.",
};

export default function OptionsListingsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
