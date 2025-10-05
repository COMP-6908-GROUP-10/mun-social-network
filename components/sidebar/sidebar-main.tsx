
import {TypographySmall} from "@/components/ui/typography";
import {ArrowUpFromLineIcon, CableIcon, HouseIcon, LucideIcon, UserRoundPlusIcon} from "lucide-react";
import React from "react";
import Link from "next/link";

const MENU_ITEMS: { icon: LucideIcon, title: string, href: string }[] = [
    {
        icon: HouseIcon,
        title: "Home",
        href: "/"
    },
    {
        icon: CableIcon,
        title: "Connections",
        href: "/connections"
    },
    {
        icon: UserRoundPlusIcon,
        title: "Followers",
        href: "/followers"
    },
    {
        icon: ArrowUpFromLineIcon,
        title: "Following",
        href: "/following"
    },


]

function SidebarMain() {
    return (
        <div className={"w-full h-full pt-18 px-10 "}>
           <ul className={"list-none space-y-10 overflow-x-auto"}>
               {
                   MENU_ITEMS.map((item) => {
                       const Icon = item.icon
                       return (
                               <li key={item.title}>
                                   <Link href={item.href} >
                                       <div className={"flex gap-4 items-center"}>
                                           <Icon size={22}/>
                                           <TypographySmall className={"block"}> {item.title} </TypographySmall>
                                       </div>
                                   </Link>
                               </li>

                       );
                   })
               }
           </ul>
        </div>
    )
}

export default SidebarMain;