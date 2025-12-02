import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {MoreVerticalIcon} from "lucide-react";
import {IComment} from "@/lib/model-types";
import {TypographySmall} from "@/components/ui/typography";
import {Button} from "@/components/ui/button";
import PostActionActionBar from "@/components/post-actions/post-action-action-bar";
import {quickFormatDateTime} from "@/lib/utils";

type Props = {
    comment: IComment
}
function PostActionCommentItem({ comment }: Props ) {
    return (
        <div className={"flex flex-row justify-between"}>
            <div className={"flex gap-4"}>
                <Avatar className={"size-12"}>
                    <AvatarImage src="https://github.com/shadcn.png"/>
                    <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <div className={"flex flex-col gap-2 "}>
                    <div className={"inline-flex gap-2"}>
                        <small className={"text-xs text-muted-foreground"}>{comment.user?.username}</small>
                        <small className={"text-xs text-muted-foreground"}>{ quickFormatDateTime(comment.created_at)}</small>
                    </div>
                    <TypographySmall className={"leading-normal"}> { comment.content } </TypographySmall>
                    <PostActionActionBar comment={comment} />
                </div>
            </div>

            <Button variant={"ghost"}>
                <MoreVerticalIcon/>
            </Button>
        </div>
    )
}

export default PostActionCommentItem;