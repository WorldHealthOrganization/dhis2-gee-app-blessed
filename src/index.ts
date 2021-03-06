import React from "react";
import axios from "axios";
import ReactDOM from "react-dom";
//@ts-ignore
import { Provider } from "@dhis2/app-runtime";

import App from "./webapp/components/app/App";
import "./locales";

async function getBaseUrl() {
    if (process.env.NODE_ENV === "development") {
        const baseUrl = process.env.REACT_APP_DHIS2_BASE_URL || "http://localhost:8080";
        console.info(`[DEV] DHIS2 instance: ${baseUrl}`);
        return baseUrl.replace(/\/*$/, "");
    } else {
        const { data: manifest } = await axios.get("manifest.webapp");
        return manifest.activities.dhis.href;
    }
}

async function main() {
    const config = {
        baseUrl: await getBaseUrl(),
        apiVersion: "30",
    };
    try {
        ReactDOM.render(
            React.createElement(Provider, { config }, React.createElement(App, {})),
            document.getElementById("root")
        );
    } catch (err) {
        console.error(err);
        ReactDOM.render(
            React.createElement("div", {}, err.toString),
            document.getElementById("root")
        );
    }
}

main();
