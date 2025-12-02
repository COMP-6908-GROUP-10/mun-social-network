import {Item, ItemContent, ItemMedia, ItemTitle} from "@/components/ui/item";
import {Spinner} from "@/components/ui/spinner";
import {ReactNode} from "react";
import {cn} from "@/lib/utils";

export default function ListLoader({ children = "Loading...", className }: { children?: ReactNode, className?: string }) {
    return (
        <div className={cn("flex w-full flex-col gap-4 [--radius:1rem]", className)}>
            <Item variant="muted">
                <ItemMedia>
                    <Spinner/>
                </ItemMedia>
                <ItemContent>
                    <ItemTitle className="line-clamp-1">{ children }</ItemTitle>
                </ItemContent>
            </Item>
        </div>
    )
}