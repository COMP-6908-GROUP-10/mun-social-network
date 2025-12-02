import React, {ForwardedRef, forwardRef, useImperativeHandle, useState} from "react";
import {DialogImperative} from "@/lib/types";
import {
    Dialog, DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {LoaderCircleIcon} from "lucide-react";

type Props = {
    children?: React.ReactNode;
    title?: string;
    description?: string;
    onClickSave?: () => void;
    showProgress?: boolean;
}

export default forwardRef(function ActivityConfigDialog( { children, title, description, onClickSave, showProgress }: Props, ref: ForwardedRef<DialogImperative>) {

    const [open, setOpen] = useState<boolean>(false)

    useImperativeHandle(ref, () => {
        return {
            open() {
                setOpen(true)
            },
            close() {
                setOpen(false)
            },
        }
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{ title }</DialogTitle>
                    <DialogDescription>
                        { description }
                    </DialogDescription>
                </DialogHeader>
                <div className={"pb-5"}>
                    {children}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="button" onClick={onClickSave} disabled={showProgress}>
                        { showProgress ? (<span className={"inline-flex gap-2"}>
                            <LoaderCircleIcon className={"animate-spin"} />
                            <span>In progress</span>
                        </span>) : (<span>Save changes</span>) }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
})