import {ChartColumnDecreasingIcon, HeartPlusIcon, LucideIcon, MessageCircleMoreIcon, ShareIcon} from "lucide-react";
import {TypographySmall} from "@/components/ui/typography";

function PostActionBar() {
    return (
        <div className={"flex flex-row justify-between pt-10"}>
            <PostActionItem icon={HeartPlusIcon} text={"2.2k "} />
            <PostActionItem icon={MessageCircleMoreIcon} text={"5.2 k"} textColor={"#155DFC"} />
            <PostActionItem icon={ChartColumnDecreasingIcon} text={"2.2 k"} />
            <PostActionItem icon={ShareIcon} text={"1.2 k"} />
        </div>
    )
}

function PostActionItem({ icon, text, textColor } : { icon: LucideIcon, text: string, textColor?: string } ) {
    const Icon = icon

    return (
        <div className={"flex gap-2 items-center"}>
            <Icon size={18} style={ { color: textColor } } />
            <p className={`text-sm text-muted-foreground font-bold`} style={ { color: textColor } }> { text } </p>
        </div>
    )
}
export default PostActionBar;