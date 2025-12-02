import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {PlusIcon} from "lucide-react";
import {TypographyP, TypographySmall} from "@/components/ui/typography";
import {IPost} from "@/lib/model-types";
import {quickFormatDateTime} from "@/lib/utils";

export default function PostHeader({ post }: { post: IPost }) {
    return (
        <div className={"py-4 px-2 flex gap-2 justify-between"}>
            <div className={"flex flex-row gap-4"}>
                <Avatar className={"size-12"}>
                    <AvatarImage src="https://github.com/shadcn.png"/>
                    <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <div className={"flex flex-col gap-0"}>
                    <TypographyP className={"block font-semibold"}> { post.user?.username } </TypographyP>
                    <TypographySmall className={"text-xs text-muted-foreground"}> { post.user?.email } </TypographySmall>
                    <TypographySmall className={"text-xs text-muted-foreground"}>  </TypographySmall>
                </div>
            </div>
            <Button variant={"ghost"} className={"font-bold text-sm text-muted-foreground"}>
                posted { quickFormatDateTime(post.created_at)}
            </Button>
        </div>
    )
}