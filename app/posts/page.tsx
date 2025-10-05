import CommentsHeader from "@/components/comments/comments-header";
import CommentsContent from "@/components/comments/comments-content";
import {Suspense} from "react";
import Posts from "@/components/post/posts";

export default function HomePage() {


  return (
      <Suspense fallback={<div>Loading...</div>}>
          <main className={"w-full flex h-full divide-x"}>
              <div className={"w-[70%] h-full overflow-y-auto"}>
                  <Posts />
              </div>
              <div className={"w-[30%] h-full overflow-y-auto"}>
                  <div className={"pt-18 flex flex-col"}>
                      <CommentsHeader/>
                      <CommentsContent/>
                  </div>
              </div>
          </main>
      </Suspense>

  );
}
