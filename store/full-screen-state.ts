import {create} from "zustand/index";
import {subscribeWithSelector} from "zustand/middleware";

interface PrintViewStore {
    printView: boolean
    setPrintView: (state: boolean) => void
}

export const usePrintViewStore = create<PrintViewStore>()(subscribeWithSelector(
    (set) => ({
        printView: false,
        setPrintView: (state: boolean) => set(() => ({ printView: state })),
    })
))