import {InfoIcon} from "lucide-react";
import {TypographySmall} from "@/components/ui/typography";

export default function ErrorLoader({ message }: { message?: string }) {
    return (
        <div className={"px-4 py-8"}>
            <div className={"flex gap-2 items-center"}>
                <InfoIcon size={18}/>
                <TypographySmall className={"block"}> { message || "Error loading data"} </TypographySmall>
            </div>
        </div>
    )
}