import {LucideIcon} from "lucide-react";

export default function PostActionActionItem({ icon, text, textColor } : { icon?: LucideIcon, text: string, textColor?: string } ) {

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
