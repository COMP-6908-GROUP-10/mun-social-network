import {getComments} from "@/app/home/actions";
import {InfoIcon} from "lucide-react";
import {TypographySmall} from "@/components/ui/typography";
import ActivityItem from "@/components/activities/activity-item";

async function Activities() {
    const comments = await getComments();

    if (comments.length === 0) {
        return (
            <div className={"flex gap-2 items-center"}>
                <InfoIcon size={18}/>
                <TypographySmall className={"block"}> Select post to read comments </TypographySmall>
            </div>
        );
    }

    return (
        <ul className={"list-none space-y-8"}>
            {
                comments.map((comment) => (
                    <ActivityItem key={comment.id} comment={comment}/>
                ))
            }
        </ul>
    )
}

export default Activities;