"use client"

import {IconPlus} from "@tabler/icons-react"
import { ArrowUpIcon } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupTextarea,
} from "@/components/ui/input-group"
import {Input} from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {QueryClientProvider, useMutation} from "@tanstack/react-query";
import {createPost, CreatePostInput} from "@/app/create-post/action";
import {axiosErrorHandler} from "@/lib/utils";
import { useCallback } from "react"
import {useForm} from "react-hook-form";
import {appQueryClient} from "@/lib/constants";

export default function CreatePostPage() {

    return (
        <QueryClientProvider client={appQueryClient}>
            <CreatePostPageView />
        </QueryClientProvider>
    )
}

function CreatePostPageView() {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CreatePostInput>();

    // send information to action
    const { mutate, isPending } = useMutation({
        mutationKey: ['send-admin-message'],
        mutationFn: (input: CreatePostInput) => createPost(input),
        onSuccess: async (res) => {
            console.log("response:", res)
            reset()
        },
        onError: axiosErrorHandler
    })

    // handle form
    const createPostHandler = useCallback((formData: CreatePostInput) => {
        mutate(formData)
    }, [mutate])

    return (
        <div className={"w-[70%]"}>
            <div className={"max-w-2xl mx-auto py-18 space-y-6"}>
                <h4 className={"block font-semibold"}> Create New IPost </h4>
                <form className={"space-y-4"} onSubmit={handleSubmit(createPostHandler)}>
                    <div className={"space-y-1"}>
                        <Input type="text" { ...register("title", { required: "This field is required" }) } placeholder="IPost Title"/>
                        { errors.title && (<div className={"text-sm text-red-500"}>{ errors.title.message }</div>)}
                    </div>
                    <div className={"space-y-1"}>
                        <InputGroup>
                            <InputGroupTextarea placeholder="IPost Content..." {...register("content", { required: "This field is required"})}/>
                            <InputGroupAddon align="block-end">
                                <InputGroupButton
                                    variant="outline"
                                    className="rounded-full"
                                    size="icon-xs"
                                >
                                    <IconPlus/>
                                </InputGroupButton>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <InputGroupButton variant="ghost">Image</InputGroupButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        side="top"
                                        align="start"
                                        className="[--radius:0.95rem]"
                                    >
                                        <DropdownMenuItem>Attach Image</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </InputGroupAddon>
                        </InputGroup>
                        { errors.content && (<div className={"text-sm text-red-500"}>{errors.content.message}</div>)}
                    </div>
                    <Button type={"submit"}>IPost <ArrowUpIcon size={16} /></Button>
                </form>
            </div>
        </div>
    )
}
