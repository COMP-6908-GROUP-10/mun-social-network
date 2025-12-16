import {Card, CardContent} from "@/components/ui/card";
import {getActivityNameByQueryName} from "@/lib/utils";

export default function ActivityHeading({ queryName } : { queryName: string }) {
    return (
        <Card>
            <CardContent>
                <span className={"font-bold text-xl"}> { getActivityNameByQueryName(queryName)}</span>
            </CardContent>
        </Card>
    )
}