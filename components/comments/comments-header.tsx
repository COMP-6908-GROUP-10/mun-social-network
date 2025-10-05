import {TypographyLarge} from "@/components/ui/typography";

function CommentsHeader() {
    return (
        <main className={"border-b px-4 pt-2 pb-6"}>
            <TypographyLarge> <strong>Comments</strong> 3.3k </TypographyLarge>
        </main>
    )
}

export default CommentsHeader;