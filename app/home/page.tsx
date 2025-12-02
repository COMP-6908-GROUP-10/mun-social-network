"use client"


import {QueryClientProvider} from "@tanstack/react-query";
import {appQueryClient} from "@/lib/constants";
import Posts from "@/components/posts/posts";
import PostActionSection from "@/components/post-actions/post-action-section";
import {Suspense} from "react";

export default function HomePage() {

  return (
      <QueryClientProvider client={appQueryClient}>
          <main className={"w-full flex h-full divide-x"}>
              <div className={"w-[70%] h-full overflow-y-auto"}>
                  <Suspense fallback={null}>
                      <Posts />
                  </Suspense>
              </div>
              <div className={"w-[30%] h-full overflow-y-auto"}>
                  <Suspense fallback={null}>
                      <PostActionSection />
                  </Suspense>
              </div>
          </main>
      </QueryClientProvider>

  );
}
