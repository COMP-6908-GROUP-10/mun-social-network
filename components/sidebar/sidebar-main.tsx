"use client"

import {TypographySmall} from "@/components/ui/typography";
import {ActivityIcon, CirclePlusIcon, HouseIcon, LucideIcon, Users2Icon} from "lucide-react";
import React, {useCallback, useRef} from "react";
import {usePathname, useRouter} from "next/navigation";
import {ActivityCreateConfigForm, DialogImperative} from "@/lib/types";
import CreateActivityConfigFormDialog from "@/components/activities/create-activity-config-form-dialog";
import {runCreateUsersExperiment} from "@/actions/users/create-users";
import {runCreatePostsExperiment} from "@/actions/posts/create-posts";
import {QueryClientProvider} from "@tanstack/react-query";
import {appQueryClient} from "@/lib/constants";
import UsersListDialog from "@/components/users/users-list-dialog";
import {useEventStore} from "@/store/events-store";
import {cn} from "@/lib/utils";

const MENU_ITEMS: { icon: LucideIcon, title: string, href: string }[] = [
    {
        icon: HouseIcon,
        title: "Home",
        href: "/"
    },
    {
        icon: CirclePlusIcon,
        title: "Generate Users",
        href: "/create-users"
    },
    // {
    //     icon: Users2Icon,
    //     title: "Platform Users",
    //     href: "/fetch-users"
    // },
    {
        icon: CirclePlusIcon,
        title: "Generate Posts",
        href: "/create-posts"
    },
    {
        icon: ActivityIcon,
        title: "Activities",
        href: "/activities"
    },

]

function SidebarMain() {

    const pathname = usePathname();
    const router = useRouter();
    const usersConfigRef = useRef<DialogImperative | null>(null);
    const postsConfigRef = useRef<DialogImperative | null>(null);
    const usersListRef = useRef<DialogImperative | null>(null);
    const setEvent = useEventStore((state) => state.setEvent)

    const onClickSidebarItemHandler = (href: string) => {


        console.log("onClickSidebarItemHandler", href);

        if (href.startsWith("/create-users")) {
            usersConfigRef.current?.open?.()
            return;
        }

        if (href.startsWith("/create-posts")) {
            postsConfigRef.current?.open?.()
            return
        }

        if (href.startsWith("/fetch-users")) {
            usersListRef.current?.open?.()
            return
        }

        if (href === "/") {
            setEvent("home-menu-click");
            // still allow it to push
        }

        router.push(href);
    }

    const runCreateUsers = (data: ActivityCreateConfigForm) => {

        console.log("payload----", data);

        return runCreateUsersExperiment({
            ...data,
            dataScales: data.dataScales?.map(kv => Number.parseInt(String(kv.value))),
        })
    }

    const runCreatePosts = (data: ActivityCreateConfigForm) => {

        console.log("payload----", data);

        return runCreatePostsExperiment({
            ...data,
            dataScales: data.dataScales?.map(kv => Number.parseInt(String(kv.value))),
        })
    }

    const handleCreateUsersSuccess = useCallback(() => {
        usersConfigRef.current?.close?.()
        setEvent("users-generated");
    }, [setEvent])

    const handleCreatePostsSuccess = useCallback(() => {
        setEvent("posts-generated");
        postsConfigRef.current?.close?.()
    }, [setEvent])

    return (
        <QueryClientProvider client={appQueryClient}>
            <div className={"w-full h-full pt-18 "}>
                <ul className={"list-none overflow-x-auto"}>
                    {
                        MENU_ITEMS.map((item) => {
                            const Icon = item.icon
                            let isActive: boolean;
                            if (item.href === "/") {
                                // For the "Home" link, check for exact match only
                                isActive = pathname === "/";
                            } else {
                                // For all other links, check if the path starts with the href
                                // (e.g., "/activities" matches "/activities/hiking")
                                isActive = pathname.startsWith(item.href);
                            }
                            return (
                                <li className={cn("cursor-pointer hover:bg-slate-50 px-10 py-5",
                                    // Check if the current pathname starts with '/activities'
                                    isActive && 'bg-gray-100'
                                )} key={item.title}
                                    onClick={() => onClickSidebarItemHandler(item.href)}>
                                    <div className={"flex gap-4 items-center cursor-pointer"}>
                                        <Icon size={22}/>
                                        <TypographySmall className={"block"}> {item.title} </TypographySmall>
                                    </div>
                                </li>

                            );
                        })
                    }
                </ul>
                <CreateActivityConfigFormDialog
                    key={"create-users-config-form"}
                    title={"Generate users"}
                    description={"Run experiment to generate users for sql and graph database engines"}
                    ref={usersConfigRef}
                    onSubmit={runCreateUsers}
                    onSuccess={ handleCreateUsersSuccess }
                />
                <CreateActivityConfigFormDialog
                    key={"create-posts-config-form"}
                    title={"Generate posts"}
                    description={"Run experiment to generate posts for sql and graph database engines"}
                    ref={postsConfigRef}
                    // includes={[CreateActivityConfigInclude.USER_ID]}
                    onSubmit={runCreatePosts}
                    onSuccess={ handleCreatePostsSuccess }
                />
                <UsersListDialog ref={usersListRef} />
            </div>
        </QueryClientProvider>
    )
}

export default SidebarMain;