import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {MoreVerticalIcon, Users2Icon, UserStarIcon} from "lucide-react";
import {IPostLike} from "@/lib/model-types";
import {TypographySmall} from "@/components/ui/typography";
import {Button} from "@/components/ui/button";
import {quickFormatDateTime} from "@/lib/utils";
import PostActionActionItem from "@/components/post-actions/post-action-action-item";

type Props = {
    postLike: IPostLike;
}
function PostActionLikeItem({ postLike }: Props ) {
    return (
        <div className={"flex flex-row justify-between"}>
            <div className={"flex gap-4"}>
                <Avatar className={"size-12"}>
                    <AvatarImage src="https://github.com/shadcn.png"/>
                    <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <div className={"flex flex-col gap-2 "}>
                    <div className={"flex flex-col"}>
                        <p className={""}>{postLike.user?.username}</p>
                        <small className={"text-xs text-muted-foreground"}>{ postLike.user?.email }</small>
                    </div>
                    <div className={"flex gap-2"}>
                        <PostActionActionItem icon={Users2Icon} text={`${postLike.user?.followers_count} followers`}  />
                        <PostActionActionItem icon={UserStarIcon} text={`${postLike.user?.following_count} following`}  />
                    </div>
                </div>
            </div>

            <Button variant={"ghost"}>
                <MoreVerticalIcon/>
            </Button>
        </div>
    )
}

export default PostActionLikeItem;