"use client"

import {ButtonGroup, ButtonGroupSeparator} from "../ui/button-group";
import { Button } from "../ui/button";
import {useEffect, useState} from "react";
import {dbEngine} from "@/lib/constants";

export default function SwitchEngine () {

    const [selectedEngine, setSelectedEngine] = useState<string>("sql");

    useEffect(() => {
        const stored = localStorage.getItem("db-engine");
        if (stored) setSelectedEngine(stored);
    }, []);

    const handleSwitchEngine = (engine: "sql" | "graph") => {
        localStorage.setItem(dbEngine, engine);
        window.location.reload();
    }

    return (
        <div className={""}>
            <ButtonGroup className={"w-full"}>
                <Button className={"cursor-pointer"} variant={selectedEngine == "sql" ? "default" : "secondary"} onClick={() => handleSwitchEngine("sql")}>
                    SQL DB
                </Button>
                <ButtonGroupSeparator />
                <Button className={"cursor-pointer"} variant={selectedEngine == "graph" ? "default" : "secondary"}  onClick={() => handleSwitchEngine("graph")}>
                    Graph DB
                </Button>
            </ButtonGroup>
            <small className={"text-blue-500"}>Determines DB data to display</small>
        </div>
    )
};