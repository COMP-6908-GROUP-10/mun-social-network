import ConnectionItem from "@/components/ui/connection-item";
import {TypographyLarge, TypographySmall} from "@/components/ui/typography";
import {InfoIcon} from "lucide-react";

export default function  FollowingPage() {
    return (
        <div className={"flex flex-row w-full h-full divide-x"}>

            <div className={"w-[70%] h-full overflow-y-auto"}>
                <div className={"max-w-2xl mx-auto py-18 divide-y"}>
                    {
                        Array.from({length: 50}).map((_, i) => (
                            <ConnectionItem key={"posts-item-" + i}></ConnectionItem>
                        ))
                    }
                </div>
            </div>

            <div className={"w-[30%] h-full"}>
                <div className={"pt-18 flex flex-col"}>
                    <div className={"border-b px-4 pt-2 pb-6"}>
                        <TypographyLarge> Following </TypographyLarge>
                    </div>
                    <div className={"px-4 py-8"}>
                        <div className={"flex gap-2 items-center"}>
                            <InfoIcon size={18}/>
                            <TypographySmall className={"block"}> 2.25k following </TypographySmall>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}