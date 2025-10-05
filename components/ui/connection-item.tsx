import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {TypographyP, TypographySmall} from "@/components/ui/typography";
import {Button} from "@/components/ui/button";
import {PlusIcon} from "lucide-react";

function ConnectionItem() {
    return (
        <div className={"py-4 px-2 flex gap-2 justify-between"}>
            <div className={"flex flex-row gap-4"}>
                <Avatar className={"size-12"}>
                    <AvatarImage src="https://github.com/shadcn.png"/>
                    <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <div className={"flex flex-col gap-0"}>
                    <TypographyP className={"block font-semibold"}> Daniel Kwakye </TypographyP>
                    <TypographySmall className={"text-xs text-muted-foreground"}> MASC Software Engineering </TypographySmall>
                    <TypographySmall className={"text-xs text-muted-foreground"}> posted 1w ago </TypographySmall>
                </div>
            </div>
            <Button variant={"ghost"}>
                <PlusIcon size={20} />
                Follow
            </Button>
        </div>
    )
}

export default ConnectionItem