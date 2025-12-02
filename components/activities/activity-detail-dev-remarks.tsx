import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "../ui/card";
import {getActivityNameByQueryName, getDeveloperEffortRemarks} from "@/lib/utils";

type Props = {
    queryName: string
}

export default function ActivityDetailDevRemarks({ queryName }: Props ) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Developer Remarks</CardTitle>
                <CardDescription>Remarks for [{ getActivityNameByQueryName(queryName) }] </CardDescription>
            </CardHeader>
            <CardContent>
                <p>
                    {
                        getDeveloperEffortRemarks(queryName)
                    }
                </p>
            </CardContent>
        </Card>
    )
}