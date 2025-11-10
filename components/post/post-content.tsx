import {Post} from "@/lib/models";
import Image from "next/image";


function PostContent({ post }: { post: Post }) {
    return (
        <div className={"flex flex-col gap-4"}>
            <h4 className={"block font-semibold"}> {post.title} </h4>
            <p className="block text-muted-foreground "> { post.content} </p>
            {  post.image && <Image src={post.image} alt={"post image"}
                   width={800}
                   height={600}
                   className="object-cover rounded-lg"
                    />
            }
        </div>
    )
}

export default PostContent;