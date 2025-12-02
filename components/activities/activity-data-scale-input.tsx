import {forwardRef, Ref, useEffect, useImperativeHandle, useState} from "react";

import {PlusCircle, TrashIcon} from "lucide-react";
import {DialogImperative, KeyValue} from "@/lib/types";
import { getUuid } from "@/lib/utils";
import { useDebouncedCallback } from "@/hooks/use-debounce-callback";
import { Input } from "../ui/input";
import { Button } from "../ui/button";


type Props = {
    onChange?: (specs: KeyValue[]) => void
    scale?: KeyValue[]
    readOnly?: boolean,
    onDeleteSavedSpecification?: (id: string) => void
};

const starter: KeyValue[] = [
    { id: getUuid(), title: "", value: "100" },
    { id: getUuid(), title: "", value: "200" },
    { id: getUuid(), title: "", value: "500" },
]

export default forwardRef(function ActivityDataScaleInput ({onChange, scale, onDeleteSavedSpecification, readOnly = false}: Props, ref: Ref<DialogImperative>)  {

    const [dataScale, setDataScale] = useState<KeyValue[]>(scale ? scale.map(sc => {
        if(!sc.id) {
            sc.id = getUuid()
        }
        return sc
    }) : starter);

    console.log("data scale count => ", dataScale.length)

    useImperativeHandle(ref, () => {
        return {
            clear() {
                setDataScale(scale || starter);
            }
        }
    })

    const addNewSpecificationField = () => {
        setDataScale(prev => [
            ...prev,
            { id: getUuid(), title: "", value: "" }
        ]);
    };

    const removeSpecificationField = (id?: string) => {
        setDataScale(prev => prev.filter(spec => spec.id !== id));
        const spec = dataScale.find(spec => spec.id == id)
        if(spec?.id && onDeleteSavedSpecification) {
            onDeleteSavedSpecification(spec.id)
        }
    };

    const updateDataScale = (id: string | undefined, field: "title" | "value", value: string) => {
        setDataScale(prev =>
            prev.map(spec =>
                spec.id === id ? { ...spec, [field]: value } : spec
            )
        );
    };

    const notifyParent = useDebouncedCallback((specs: KeyValue[]) => {
        if (onChange) {
            const nonEmpty = specs.filter(spec => spec.title.trim() !== "" || String(spec.value).trim() !== "");
            onChange(nonEmpty);
        }
    }, 500);

    useEffect(() => {
        notifyParent(dataScale);
    }, [dataScale, notifyParent]);

    console.log("dataScales: ", dataScale)

    return (
        <div>
            <div className="space-y-4">
                {dataScale.map((spec) => (
                    <div className="flex flex-col md:flex-row gap-4" key={`${spec.id}`}>
                        <Input
                            placeholder="eg. 1000"
                            type={"number"}
                            value={spec.value as string}
                            onChange={(e) => updateDataScale(spec.id, "value", e.target.value)}
                            className="w-full"
                            readOnly={readOnly}
                        />
                        { <Button
                            type="button"
                            onClick={() => removeSpecificationField(spec.id)}
                            variant="outline"
                        >
                            <TrashIcon className="text-red-700" />
                        </Button> }
                    </div>
                ))}
                { !readOnly && <Button type="button" variant="outline" onClick={addNewSpecificationField}>
                    <PlusCircle/> Add data scale
                </Button>}
            </div>
        </div>
    );
})
