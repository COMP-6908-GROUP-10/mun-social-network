import {TypographySmall} from "@/components/ui/typography";
import {InfoIcon} from "lucide-react";

function CommentsContent() {
    return (
        <main className={"px-4 py-8"}>
            <div className={"flex gap-2 items-center"}>
                <InfoIcon size={18} />
                <TypographySmall className={"block"}> Select post to read comments </TypographySmall>
            </div>
        </main>
    )
}

export default CommentsContent;