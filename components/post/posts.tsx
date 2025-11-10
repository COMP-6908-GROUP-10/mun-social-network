import {getPosts} from "@/app/home/actions";
import PostItem from "@/components/post/post-item";

export default async function Posts() {
    const posts = await getPosts()
    return (
        <div className={"max-w-2xl mx-auto divide-y pt-8"}>
            {
                posts.map((post, i) => (
                    <PostItem post={post} key={"post-item-" + i} />
                ))
            }
        </div>
    )
}