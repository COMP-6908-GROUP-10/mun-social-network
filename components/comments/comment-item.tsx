import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {MoreVerticalIcon} from "lucide-react";
import {Comment} from "@/lib/models";
import {TypographySmall} from "@/components/ui/typography";
import CommentActionBar from "@/components/comments/comment-action-bar";
import {Button} from "@/components/ui/button";

function CommentItem({ comment }: { comment: Comment }) {
    return (
        <div className={"flex flex-row justify-between"}>
            <div className={"flex gap-4"}>
                <Avatar className={"size-12"}>
                    <AvatarImage src="https://github.com/shadcn.png"/>
                    <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <div className={"flex flex-col gap-2 "}>
                    <div className={"inline-flex gap-2"}>
                        <small className={"text-xs text-muted-foreground"}>{comment.user.name}</small>
                        <small className={"text-xs text-muted-foreground"}>1w ago</small>
                    </div>
                    <TypographySmall className={"leading-normal"}> { comment.message } </TypographySmall>
                    <CommentActionBar />
                </div>
            </div>

            <Button variant={"ghost"}>
                <MoreVerticalIcon/>
            </Button>
        </div>
    )
}

export default CommentItem;