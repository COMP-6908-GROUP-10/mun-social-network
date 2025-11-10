
import {Suspense} from "react";
import Posts from "@/components/post/posts";
import ActivitiesHeader from "@/components/activities/activities-header";
import ActivitiesContent from "@/components/activities/activities-content";

export default function HomePage() {

  return (
      <Suspense fallback={<div>Loading...</div>}>
          <main className={"w-full flex h-full divide-x"}>
              <div className={"w-[70%] h-full overflow-y-auto"}>
                  <Posts />
              </div>
              <div className={"w-[30%] h-full overflow-y-auto"}>
                  <div className={"pt-18 flex flex-col"}>
                      <ActivitiesHeader/>
                      <ActivitiesContent/>
                  </div>
              </div>
          </main>
      </Suspense>

  );
}
