import {IFollow} from "@/lib/model-types";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {quickFormatDateTime} from "@/lib/utils";
import PostActionActionItem from "@/components/post-actions/post-action-action-item";
import {Button} from "@/components/ui/button";
import {MoreVerticalIcon, Users2Icon, UserStarIcon} from "lucide-react";

type Props = {
    follow: IFollow;
}
function PostActionFollowersItem({ follow }: Props ) {
    return (
        <div className={"flex flex-row justify-between"}>
            <div className={"flex gap-4"}>
                <Avatar className={"size-12"}>
                    <AvatarImage src="https://github.com/shadcn.png"/>
                    <AvatarFallback>CN</AvatarFallback>
                </Avatar>

                <div className={"flex flex-col gap-2 "}>
                    <div className={"flex flex-col"}>
                        <p className={""}>{follow.follower?.username}</p>
                        <small className={"text-xs text-muted-foreground"}>{follow.follower?.email}</small>
                    </div>
                    <div className={"flex gap-2"}>
                        <PostActionActionItem icon={Users2Icon} text={`${follow.follower?.followers_count} followers`}/>
                        <PostActionActionItem icon={UserStarIcon} text={`${follow.follower?.following_count} following`}/>
                    </div>
                </div>

            </div>

            <Button variant={"ghost"}>
                <MoreVerticalIcon/>
            </Button>
        </div>
    )
}

export default PostActionFollowersItem;