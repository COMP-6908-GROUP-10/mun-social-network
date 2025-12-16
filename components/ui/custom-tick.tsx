import {usePrintViewStore} from "@/store/full-screen-state";

interface CustomTickProps {
    x?: number;
    y?: number;
    payload?: {
        value?: string;
    };
    formatter?: (value: string | number) => string;
}

const CustomTick = ({ x = 0, y = 0, payload, formatter } : CustomTickProps) => {

    const printView = usePrintViewStore(state => state.printView);
    const rawValue = payload?.value ?? "";
    const displayValue =
        typeof formatter === "function" ? formatter(rawValue) : String(rawValue);

    return (
        <text
            x={x - 10}
            y={y}
            textAnchor="start"
            fontSize={printView ? 15 : 12}
            fontWeight="bold"
            fill="#FF0000"
        >
            {displayValue}
        </text>
    );
};

export default CustomTick;