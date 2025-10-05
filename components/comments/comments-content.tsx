import {Suspense} from "react";
import Comments from "@/components/comments/comments";

function CommentsContent() {

    return (
        <main className={"px-4 py-8"}>
            <Suspense fallback={<p> loading.. </p>} >
                <Comments />
            </Suspense>
        </main>
    )
}

export default CommentsContent;