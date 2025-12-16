import type { Metadata } from "next";
import { Questrial } from 'next/font/google'
import "./globals.css";
import NavBar from "@/components/nav/nav-bar";
import SidebarMain from "@/components/sidebar/sidebar-main";
import {ReactNode} from "react";
import {Toaster} from "sonner";
import {SidebarLayout} from "@/components/sidebar/sidebar-layout";
import ContentLayout from "@/components/content/content-layout";

const questrial = Questrial({
    weight: "400",
    subsets: ["latin"]
})

export const metadata: Metadata = {
  title: "MUN social platform",
  description: "Relational vs Graph Database",
}

export default function RootLayout({ children,}: Readonly<{ children: ReactNode; }>) {

    return (
        <html lang="en">
            <body
                className={`${questrial.className}`}
            >
            <main>
                <NavBar/>
                <div className={"flex divide-x h-screen"}>
                    <SidebarLayout />
                    <ContentLayout>{ children }</ContentLayout>
                </div>
            </main>
            <Toaster />
            </body>
        </html>
  );
}
