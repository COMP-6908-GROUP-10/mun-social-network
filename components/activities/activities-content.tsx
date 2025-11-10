import {Suspense} from "react";
import Activities from "@/components/activities/activities";

function ActivitiesContent() {

    return (
        <main className={"px-4 py-8"}>
            <Suspense fallback={<p> loading.. </p>} >
                <Activities />
            </Suspense>
        </main>
    )
}

export default ActivitiesContent;