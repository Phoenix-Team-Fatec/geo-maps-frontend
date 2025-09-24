import { Platform } from "react-native";
import Constants from "expo-constants";
import axios, { AxiosHeaders } from "axios";

function autoDetectExpoLanURL(port = 8000) {

    const manifestHost =
        // @ts-ignore
        Constants?.manifest2?.extra?.expoClient?.hostUri ||
        Constants?.expoConfig?.hostUri ||
        // @ts-ignore
        Constants?.manifest?.hostUri ||
        // @ts-ignore
        Constants?.manifest?.debuggerHost;

    if (!manifestHost) return null;
    const ip = String(manifestHost).split(":")[0];

    if (Platform.OS === "android" && (ip === "127.0.0.1" || ip === "localhost")) {
        return `http://10.0.2.2:${port}`;
    }
    return `http://${ip}:${port}`;
}

const fromEnv = Constants.expoConfig?.extra?.apiUrl as string | undefined;
const devFallback = __DEV__ ? autoDetectExpoLanURL(8000) : undefined;

export const BASE_URL =
    fromEnv?.replace(/\/+$/, "") ||
    devFallback ||
    "https://api.seu-dominio.com";

const isAbsoluteURL = (url?: string) => !!url && /^https?:\/\//i.test(url);
const joinUrl = (base: string, path: string) =>
    base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");

function setupAxios() {
    axios.defaults.baseURL = BASE_URL;

    axios.interceptors.request.use((config) => {
        if (!isAbsoluteURL(config.url || "")) {
            config.url = joinUrl(BASE_URL, config.url || "");
        }

        const headers = AxiosHeaders.from(config.headers);
        headers.set("Content-Type", "application/json");
        config.headers = headers;

        return config;
    });

    axios.interceptors.response.use(
        (res) => res,
        async (err) => {
            let message = "Erro na requisição.";
            const res = err?.response;

            if (res) {
                message = `Erro ${res.status}`;
                const data = res.data;
                if (data) {
                    const d = data?.detail ?? data?.message ?? data?.error ?? data;
                    if (typeof d === "string") message = d;
                    else if (Array.isArray(d)) {
                        const parts = d.map((x) => x?.msg || x?.message || String(x)).filter(Boolean);
                        if (parts.length) message = parts.join("\n");
                    }
                }
            } else if (err?.message) {
                message = err.message;
            }

            const e: any = new Error(message);
            e.status = res?.status;
            e.data = res?.data;
            return Promise.reject(e);
        }
    );
}

function setupFetch() {
    const originalFetch = global.fetch.bind(global);

    // @ts-ignore
    global.fetch = async (input: RequestInfo, init?: RequestInit) => {
        let url: string;
        let options: RequestInit = { ...init };

        if (typeof input === "string") {
            url = input;
        } else {

            // @ts-ignore
            url = input.url;
            options = {
                method: (input as any).method,
                headers: (input as any).headers,

                // @ts-ignore
                body: (input as any)._bodyInit ?? undefined,
                ...init,
            };
        }

        if (!isAbsoluteURL(url)) {
            url = joinUrl(BASE_URL, url);
        }

        options.headers = {
            "Content-Type": "application/json",
            ...(options.headers as any),
        };

        const res = await originalFetch(url, options);

        if (!res.ok) {
            let message = `Erro ${res.status}`;
            try {
                const text = await res.text();
                if (text) {
                    try {
                        const j = JSON.parse(text);
                        const d = j?.detail ?? j?.message ?? j?.error ?? j;
                        if (typeof d === "string") message = d;
                        else if (Array.isArray(d)) {
                            const parts = d.map((x) => x?.msg || x?.message || String(x)).filter(Boolean);
                            if (parts.length) message = parts.join("\n");
                            else message = text;
                        } else message = text;
                    } catch {
                        message = text;
                    }
                }
            } catch { }
            const e: any = new Error(message);
            (e as any).status = res.status;
            throw e;
        }

        return res; 
    };
}

export function setupNetworking() {
    setupAxios();
    setupFetch();
    if (__DEV__) {
        console.log(`[Networking] BASE_URL = ${BASE_URL}`);
    }
}
