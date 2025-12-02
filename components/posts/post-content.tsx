import {IPost} from "@/lib/model-types";
import Image from "next/image";


function PostContent({ post }: { post: IPost }) {
    return (
        <div className={"flex flex-col gap-4"}>
            <h4 className={"block font-semibold"}> {post.title} </h4>
            <p className="block text-muted-foreground "> { post.content} </p>
            <Image  src={`https://loremflickr.com/1000/600/landscape?lock=${post.post_id}`}
                    alt={"Post Image"}  width={800}
                    className="object-cover rounded-lg"
                    height={600} />
        </div>
    )
}

export default PostContent;