import {AccordionItem} from "@/components/ui/accordion";
import {Accordion, AccordionContent, AccordionTrigger} from "@radix-ui/react-accordion";
import {ICorrelation} from "@/lib/types";
import {Card, CardContent} from "@/components/ui/card";

export default function ActivityQueryStatement({ correlation } : { correlation: ICorrelation}) {


    return (
        <Card>

            <CardContent>
                <Accordion
                    type="single"
                    collapsible
                    className="w-full"
                >
                    <AccordionItem value="sql">
                        <AccordionTrigger className={"py-4 cursor-pointer w-full text-start hover:text-blue-500"} >SQL Statement</AccordionTrigger>
                        <AccordionContent className="flex flex-col gap-4 text-balance  pb-4  text-slate-500">
                            <pre>
                                { correlation.sqlQuery }
                            </pre>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="graph">
                        <AccordionTrigger className={"py-4 cursor-pointer w-full text-start  hover:text-blue-500"}>Cypher Statement</AccordionTrigger>
                        <AccordionContent className="flex flex-col gap-4 text-balance pb-4 text-slate-500">
                            <pre>
                                { correlation.neo4jQuery }
                            </pre>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>


        </Card>

    )
}