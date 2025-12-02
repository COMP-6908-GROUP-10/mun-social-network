import { create } from 'zustand'
import {subscribeWithSelector} from "zustand/middleware";

interface EventsStore {
    event: string | undefined
    setEvent: (event: string | undefined) => void
}

export const useEventStore = create<EventsStore>()(subscribeWithSelector(
    (set) => ({
        event: undefined,
        setEvent: (event: string | undefined) => set(() => ({ event: event })),
    })
))