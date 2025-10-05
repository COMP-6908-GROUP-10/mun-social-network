import AppLogo from "@/components/ui/app-logo";
import {Button} from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function NavBar() {
    return (
        <nav className="fixed w-full py-2 border-b bg-white z-20">
            <div className={"flex justify-between px-10"}>
                <AppLogo size={30} className={"text-lg"}/>
                <div className={"flex items-center"}>
                    <Avatar className={"size-6"}>
                        <AvatarImage src="https://github.com/shadcn.png"/>
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <Button variant={"ghost"} className={"text-md font-semibold"}> Logout </Button>
                </div>
            </div>
        </nav>
    )
}

export default NavBar;