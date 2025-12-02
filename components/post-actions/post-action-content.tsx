"use client"

import {InfoIcon} from "lucide-react";
import {TypographySmall} from "@/components/ui/typography";
import PostActionContentComments from "@/components/post-actions/post-action-content-comments";
import {useSearchParams} from "next/navigation";
import PostActionContentLikes from "@/components/post-actions/post-action-content-likes";
import PostActionContentFollowers from "@/components/post-actions/post-action-content-followers";
import PostActionContentFollowings from "@/components/post-actions/post-action-content-followings";


function PostActionContent() {

    const searchParams = useSearchParams();
    const postId = searchParams.get("postId")
    const action = searchParams.get("action")
    const expId = searchParams.get("expId")
    const userId = searchParams.get("userId")

      switch (action) {
          case "comments":
              return (<PostActionContentComments key={`post-action-content-comments-${postId}-${expId}`} action={action} expId={expId} postId={postId}/>)
          case "likes":
              return (<PostActionContentLikes key={`post-action-content-likes-${postId}-${expId}`}  action={action} expId={expId} postId={postId} />)
          case "followers":
              return (<PostActionContentFollowers key={`post-action-content-followers-${userId}-${expId}`} action={action} expId={expId} userId={userId}/>)
          case "followings":
              return (<PostActionContentFollowings key={`post-action-content-followings-${userId}-${expId}`} action={action} expId={expId} userId={userId}/>)
      }

       return (
           <div className={"flex gap-2 items-center px-4 py-8"}>
               <InfoIcon size={18}/>
               <TypographySmall className={"block"}> Empty list </TypographySmall>
           </div>
       )
}

export default PostActionContent;