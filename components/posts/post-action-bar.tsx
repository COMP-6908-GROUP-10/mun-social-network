import {
    HeartPlusIcon,
    LucideIcon,
    MessageCircleMoreIcon,
    Users2Icon,
    UserStarIcon
} from "lucide-react";
import {formatCountToSocial, getUuid} from "@/lib/utils";
import {IPost} from "@/lib/model-types";
import {useRouter, useSearchParams} from "next/navigation";

function PostActionBar({ post }: { post: IPost }) {

    const router = useRouter();
    const searchParams = useSearchParams();
    const action = searchParams.get("action")
    const postId = searchParams.get("postId")

    function setParams(values: Record<string, string>) {
        const params = new URLSearchParams(searchParams.toString());

        Object.entries(values).forEach(([key, value]) => {
            params.set(key, value);
        });

        router.push(`?${params.toString()}`);
    }

    const handleClickLikes = () => {
        setParams({
            "action": "likes",
            "postId": String(post.post_id),
            "expId": getUuid().toString(),
            "userId": String(post.user?.user_id),

        });
    }

    const handleClickComments = () => {
        setParams({
            "action": "comments",
            "postId": String(post.post_id),
            "expId": getUuid().toString(),
            "userId": String(post.user?.user_id),
        });
    }

    const handleClickFollowers = () => {
        setParams({
            "action": "followers",
            "postId": String(post.post_id),
            "expId": getUuid().toString(),
            "userId": String(post.user?.user_id),
        });
    }

    const handleClickFollowings = () => {
        setParams({
            "action": "followings",
            "postId": String(post.post_id),
            "expId": getUuid().toString(),
            "userId": String(post.user?.user_id),
        });
    }

    const currentPostActive = Number(post.post_id) === Number(postId)

    return (
        <div className={"flex flex-row justify-between pt-10"}>
            <PostActionItem icon={HeartPlusIcon} count={formatCountToSocial(post.like_count)} text={"likes"} onClick={handleClickLikes} textColor={(currentPostActive && action == "likes") ? "#155DFC" : undefined } />
            <PostActionItem icon={MessageCircleMoreIcon} count={formatCountToSocial(post.comment_count)} text={"comments"} textColor={(currentPostActive && action == "comments") ? "#155DFC" : undefined } onClick={handleClickComments}/>
            <PostActionItem icon={UserStarIcon} count={formatCountToSocial(post.user?.followers_count)} text={"followers"} onClick={handleClickFollowers} textColor={(currentPostActive && action == "followers") ? "#155DFC" : undefined } />
            <PostActionItem icon={Users2Icon} count={formatCountToSocial(post.user?.following_count)} text={"following"} onClick={handleClickFollowings} textColor={(currentPostActive && action == "followings") ? "#155DFC" : undefined }  />
        </div>
    )
}

function PostActionItem({ icon, count, text, textColor, onClick } : { icon: LucideIcon, count: string, text?: string, textColor?: string, onClick?: () => void } ) {
    const Icon = icon

    return (
        <div className={"flex gap-2 items-center cursor-pointer"} onClick={onClick}>
            <Icon size={18} style={ { color: textColor } } />
            <p className={`text-sm text-muted-foreground font-bold`} style={ { color: textColor } }> { count } </p>
            {text && <p className={`text-sm text-muted-foreground font-bold`} style={ { color: textColor } }> { text } </p> }
        </div>
    )
}
export default PostActionBar;