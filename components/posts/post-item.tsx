import PostHeader from "@/components/posts/post-header";
import PostContent from "@/components/posts/post-content";
import {IPost} from "@/lib/model-types";
import PostActionBar from "@/components/posts/post-action-bar";
import {Suspense} from "react";


function PostItem({ post }: { post: IPost }) {


    return (
        <main className={"w-full py-8"}>
            <PostHeader post={post}/>
            <PostContent post={post}/>
            <Suspense fallback={null}>
                <PostActionBar post={post} />
            </Suspense>
        </main>
    )
}

export default PostItem