import CommentItem from "@/components/comments/comment-item";
import {getComments} from "@/app/posts/actions";
import {InfoIcon} from "lucide-react";
import {TypographySmall} from "@/components/ui/typography";

async function Comments() {
    const comments = await getComments();

    if (comments.length === 0) {
        return (
            <div className={"flex gap-2 items-center"}>
                <InfoIcon size={18}/>
                <TypographySmall className={"block"}> Select post to read comments </TypographySmall>
            </div>
        );
    }

    return (
        <ul className={"list-none space-y-8"}>
            {
                comments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment}/>
                ))
            }
        </ul>
    )
}

export default Comments;