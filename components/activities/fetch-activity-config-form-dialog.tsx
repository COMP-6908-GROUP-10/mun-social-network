import {ForwardedRef, forwardRef, useCallback} from "react";
import {ActivityFetchConfigForm, DialogImperative, IJsonResponse} from "@/lib/types";
import ActivityConfigDialog from "./activity-config-dialog";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {useForm} from "react-hook-form";

type Props = {
    onSubmit: (values: ActivityFetchConfigForm) => void;
}

export default forwardRef(function FetchActivityConfigFormDialog({ onSubmit }: Props , ref: ForwardedRef<DialogImperative>) {

    const {
        register,
        handleSubmit,
        formState: { errors },
        clearErrors,
    } = useForm<ActivityFetchConfigForm>()

    const submitFormHandler = useCallback((data: ActivityFetchConfigForm) => {
        onSubmit(data)
    }, [onSubmit])

    const onClickDialogSaveHandler = useCallback(() => {
        clearErrors()
        handleSubmit(submitFormHandler)()
    }, [clearErrors, handleSubmit, submitFormHandler])

    return (
        <ActivityConfigDialog title={"Load more"} description={"Run another experiment for sql and graph database engines"} onClickSave={onClickDialogSaveHandler} ref={ref}>
            <form onSubmit={handleSubmit(submitFormHandler)}>
                <div className="grid gap-4">
                    {errors && (<div className={"text-red-500 text-sm"}>{Object.values(errors)[0]?.message}</div>)}
                    <div className="grid w-full items-center gap-3">
                        <Label htmlFor="picture">Page size</Label>
                        <div className={"space-y-1"}>
                            <Input id="repetitions" placeholder={"eg. 100"} type="number" {...register("pageSize", {required: "Required"})}/>
                            <div className={"text-xs"}>Number of items to load for the next page</div>
                        </div>
                    </div>
                </div>

            </form>
        </ActivityConfigDialog>
    )
})