import { MessageCircleIcon } from "lucide-react";
import {IComment} from "@/lib/model-types";
import {formatCountToSocial} from "@/lib/utils";
import PostActionActionItem from "@/components/post-actions/post-action-action-item";

type Props = {
    comment: IComment
}
function PostActionActionBar({ comment }: Props ) {
    return (
        <div className={"flex flex-row gap-4"}>
            <PostActionActionItem icon={MessageCircleIcon} text={`${formatCountToSocial(comment.reply_count)} replies`} />
        </div>
    )
}


export default PostActionActionBar;