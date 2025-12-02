"use client"

import { useForm } from "react-hook-form";
import ActivityConfigDialog from "@/components/activities/activity-config-dialog";
import {ForwardedRef, forwardRef, useCallback} from "react";
import {ActivityCreateConfigForm, DialogImperative, IJsonResponse, KeyValue} from "@/lib/types";
import {useMutation} from "@tanstack/react-query";
import {axiosErrorHandler, getUuid} from "@/lib/utils";
import { toast } from "sonner"
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import ActivityDataScaleInput from "@/components/activities/activity-data-scale-input";

type Props = {
    title?: string;
    description?: string;
    includes?: CreateActivityConfigInclude[]
    onSubmit: (values: ActivityCreateConfigForm) => Promise<IJsonResponse>;
    onSuccess?: (res: IJsonResponse) => void;
    initialScale?: KeyValue[],
    initialDepth?: number
}

export enum CreateActivityConfigInclude {
    USER_ID = "user_id",
    DEPTH = "depth",
}

export default forwardRef(function CreateActivityConfigFormDialog({ title, description, includes = [], onSubmit, onSuccess, initialScale, initialDepth = 2 }: Props,  ref: ForwardedRef<DialogImperative>) {

    const { isPending: runCreateExpInProgress, mutate: runCreateUsersExp } = useMutation({
        mutationKey: ["CreateActivityConfigFormDialog"],
        mutationFn: onSubmit,
        onError: axiosErrorHandler,
        onSuccess: (res) => {
            console.log("SUCCESS -----------", res)
            toast(res.message || "SUCCESS",{
                position: "top-center"
            })
            onSuccess?.(res)
        }
    })

    const {
        register,
        handleSubmit,
        setValue,
        setError,
        formState: { errors },
        clearErrors,
    } = useForm<ActivityCreateConfigForm>({
        defaultValues: {
            cachePhase: "warm",
        },
    })

    const dataScaleChangeHandler = useCallback((scales: KeyValue[]) => {

        clearErrors()

        const preparedDataScales= scales.map((sc: KeyValue) => {
            const data: KeyValue = {
                id: getUuid(),
                title: sc.title,
                value: String(sc.value),
            }
            return data
        })

        setValue("dataScales", preparedDataScales)

    }, [clearErrors, setValue])

    // actual submission
    const submitFormHandler = (data: ActivityCreateConfigForm) => {

        if (!data.dataScales || data.dataScales.length === 0) {
            setError("dataScales", { message: "At least one data scale required"})
            return
        }
        if (!data.cachePhase) {
            setError("cachePhase", { message: "Cache phase is required"})
            return
        }
        if (!data.repetitions) {
            setError("repetitions", { message: "Repetitions required"})
            return
        }

        runCreateUsersExp(data)

    }

    // save clicked on dialog
    const onClickDialogSaveHandler = () => {
        handleSubmit(submitFormHandler)()
    }

    return (
        <ActivityConfigDialog showProgress={runCreateExpInProgress} title={title} description={description} onClickSave={onClickDialogSaveHandler} ref={ref}>
            <form onSubmit={handleSubmit(submitFormHandler)}>
                <div className="grid gap-4">
                    {errors && (<div className={"text-red-500 text-sm"}>{Object.values(errors)[0]?.message}</div>)}
                    <div className={"flex flex-col gap-5"}>

                        { includes.includes(CreateActivityConfigInclude.USER_ID) && (
                            <div className="grid w-full items-center gap-3">
                                <Label htmlFor="repetitions">User Id</Label>
                                <div className={"space-y-1"}>
                                    <Input id="repetitions" type="number" {...register("userId")}/>
                                    <div className={"text-xs"}>optional = random users</div>
                                </div>
                            </div>
                        )}
                        { includes.includes(CreateActivityConfigInclude.DEPTH) && (
                            <div className="grid w-full items-center gap-3">
                                <Label htmlFor="repetitions">Depth</Label>
                                <div className={"space-y-1"}>
                                    <Input id="repetitions" defaultValue={initialDepth} type="number" {...register("depth")} autoFocus={false}/>
                                    <div className={"text-xs"}>Specify the number of levels you need</div>
                                </div>
                            </div>
                        )}

                        <div className="grid w-full items-center gap-3">
                            <Label htmlFor="repetitions">Repetitions</Label>
                            <div className={"space-y-1"}>
                                <Input id="repetitions" type="number"
                                       autoFocus={false}
                                       defaultValue={1} {...register("repetitions", {required: "Repetition fields required"})}/>
                                <div className={"text-xs"}>Number of times to repeat for any specific data scale.</div>
                            </div>
                        </div>
                        <div className={"grid w-full items-center gap-3"}>
                            <Label htmlFor="cachePhase">Cache Phase</Label>
                            <div className={"space-y-1"}>
                                <Select defaultValue={"warm"} onValueChange={ (val: "warm" | "cold") => {
                                    setValue("cachePhase", val)
                                } }>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Cache Phase"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cold">Cold</SelectItem>
                                        <SelectItem value="warm">Warm</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className={"text-xs"}>Whether to invalidate cached queries or not</div>
                            </div>
                        </div>
                        <div className="grid w-full items-center gap-3">
                            <Label htmlFor="dataScale">Data Scales</Label>
                            <div className={"space-y-1"}>
                                <ActivityDataScaleInput scale={initialScale} onChange={dataScaleChangeHandler}/>
                                <div className={"text-xs"}>number of items to generate. eg [1000, 2000, 5000]</div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </ActivityConfigDialog>
    )
})