"use client"

import AppLogo from "@/components/ui/app-logo";
import {Button} from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { usePrintViewStore } from "@/store/full-screen-state";
import {FullscreenIcon, ScreenShareOff} from "lucide-react";

function NavBar() {
    const  fullScreenState = usePrintViewStore(state => state);

    const toggleFullScreen = (state: "full" | "default") => {
        if (state === "full") {
            fullScreenState.setPrintView(true);
        }else {
            fullScreenState.setPrintView(false);
        }
    }

    return (
        <nav className="fixed w-full py-2 border-b bg-slate-700 z-20">
            <div className={"flex justify-between px-10"}>
                <AppLogo size={30} className={"text-lg text-white"} />
                <div className={"flex items-center"}>
                    <Avatar className={"size-6"}>
                        <AvatarImage src="https://github.com/shadcn.png"/>
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <Button variant={"ghost"} className={"text-md font-semibold text-white"}> Logout </Button>
                    { !fullScreenState.printView && <Button variant={"ghost"} onClick={ () => toggleFullScreen("full") } className={"text-md font-semibold text-white"}> <FullscreenIcon/> Print View  </Button> }
                    { fullScreenState.printView && <Button variant={"ghost"} onClick={ () => toggleFullScreen("default") } className={"text-md font-semibold text-white"}> <ScreenShareOff /> Default View </Button> }
                </div>
            </div>
        </nav>
    )
}

export default NavBar;