import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {getActivityNameByQueryName, getFindings} from "@/lib/utils";

type Props = {
    queryName: string
}

export default function ActivityDetailFindings({ queryName }: Props ) {
    return (
    //     getFindings
        <Card>
            <CardHeader>
                <CardTitle>Summary of Findings</CardTitle>
                <CardDescription>Remarks for [{ getActivityNameByQueryName(queryName) }] </CardDescription>
            </CardHeader>
            <CardContent>
                <p>
                    {
                        getFindings(queryName)
                    }
                </p>
            </CardContent>
        </Card>
    )
}