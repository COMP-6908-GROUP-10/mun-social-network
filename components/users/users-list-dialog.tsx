import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import React, {ForwardedRef, forwardRef, useImperativeHandle, useState} from "react";
import {DialogImperative} from "@/lib/types";

export default forwardRef(function UsersListDialog(_, ref: ForwardedRef<DialogImperative>) {

    const [open, setOpen] = useState<boolean>(false)

    useImperativeHandle(ref, () => {
        return {
            open() {
                setOpen(true)
            },
        }
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Users</DialogTitle>
                    <DialogDescription>
                        List of users with their followers
                    </DialogDescription>
                </DialogHeader>
                <div></div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
})