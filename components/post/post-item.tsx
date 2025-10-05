import PostHeader from "@/components/post/post-header";
import PostContent from "@/components/post/post-content";
import {Post} from "@/lib/models";
import PostActionBar from "@/components/post/post-action-bar";


function PostItem({ post }: { post: Post }) {
    return (
        <main className={"w-full py-8"}>
            <PostHeader post={post}/>
            <PostContent post={post}/>
            <PostActionBar />
        </main>
    )
}

export default PostItem