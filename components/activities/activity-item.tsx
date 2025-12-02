import {ChartCandlestickIcon, CheckIcon} from "lucide-react";
import {TypographyP, TypographySmall} from "@/components/ui/typography";
import {ICorrelation} from "@/lib/types";
import {cn, getActivityNameByQueryName, quickFormatDateTime} from "@/lib/utils";
import {useRouter, useSearchParams} from "next/navigation";

export default function ActivityItem({ correlation }: { correlation: ICorrelation }) {

    const router = useRouter();
    const searchParams = useSearchParams();
    const cid = searchParams.get("cid")

    function setParam(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString());
        params.set(key, value);

        router.push(`?${params.toString()}`);
    }

    return (

        <div className={cn("px-4 py-4 cursor-pointer hover:bg-gray-100 flex justify-between items-center",
            (cid && cid == correlation.correlationId) && "bg-gray-100"
            )} onClick={() => setParam("cid", correlation.correlationId)}>
            <div className={"flex flex-row items-center gap-8"}>
                <ChartCandlestickIcon className={""} size={18}/>
                <div>
                    <TypographyP className={""}> { getActivityNameByQueryName(correlation.queryName) }</TypographyP>
                    <TypographySmall className={"text-slate-500 text-xs"}>{quickFormatDateTime(correlation.newestAt)}</TypographySmall>
                </div>
            </div>
            { cid && cid == correlation.correlationId && (<CheckIcon size={18} color={"green"}></CheckIcon>)}
        </div>

    )
}