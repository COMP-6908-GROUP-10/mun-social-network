import {LucideIcon, MessageCircleIcon, ThumbsUpIcon} from "lucide-react";

function ActivityActionBar() {
    return (
        <div className={"flex flex-row gap-4"}>
            <CommentActionItem icon={ThumbsUpIcon} text={"1.4 k"} />
            <CommentActionItem icon={MessageCircleIcon} text={"25 replies"} />
            <CommentActionItem text={"Reply"} textColor={"#155DFC"} />
        </div>
    )
}

function CommentActionItem({ icon, text, textColor } : { icon?: LucideIcon, text: string, textColor?: string } ) {

    const iconElement = () => {
        if (icon) {
            const Icon = icon
            return <Icon size={14} style={ { color: textColor } } />
        }
        return undefined
    }

    return (
        <div className={"flex gap-2 items-center"}>
            <div>{ iconElement() }</div>
            <p className={`text-sm text-muted-foreground font-bold`} style={ { color: textColor } }> { text } </p>
        </div>
    )
}

export default ActivityActionBar;