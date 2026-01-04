import { Config, ProtocolConfig } from "./config";

export const defaultConfig = {
    websocket_url: "ws://localhost:8081",
    branding: {
        appName: "FTP Client",
        title: "FTP Client",
    },
    hostFilter: {
        enabled: false,
        allowedHosts: [] as string[], // can use * as wildcard
    },
    useNewUiByDefault: false,
    theme: "auto" as "light" | "dark" | "auto",
    themes: {
        light: {
            "bg-dark": "hsl(226 31% 93%)",
            "bg-base": "white",
            "bg-highlight": "hsl(226 73% 96%)",
            "bg-hover": "hsl(195, 40%, 95%)",
            text: "hsl(0, 0%, 5%)",
            "text-muted": "hsl(0, 0%, 50%)",
            border: "hsl(0, 0%, 80%)",
            "primary-color": "hsl(215, 95%, 52%)",
            "primary-color-hover": "hsl(215, 95%, 48%)",
        },
        dark: {
            "bg-dark": "hsl(198, 55%, 5%)",
            "bg-base": "hsl(0, 0%, 12%)",
            "bg-highlight": "hsl(0, 0%, 20%)",
            "bg-hover": "hsl(0, 0%, 18%)",
            text: "hsl(0, 0%, 95%)",
            "text-muted": "hsl(0, 0%, 70%)",
            border: "hsl(0, 0%, 30%)",
            "primary-color": "hsl(215, 95%, 52%)",
            "primary-color-hover": "hsl(215, 95%, 48%)",
        },
    },
    ads: {
        enabled: false,
        slots: {
            rightAd: true,
            bottomAd: true,
            bottomAdDesktop: false,
        },
    },
    protocols: {
        ftp: {
            enabled: true,
            name: "FTP",
            fields: [
                {
                    name: "host",
                    type: "string",
                    label: "Host",
                    placeholder: "example.com",
                },
                { name: "port", type: "number", label: "Port", default: 21 },
                {
                    name: "username",
                    type: "string",
                    label: "Username",
                    placeholder: "Enter your username",
                },
                {
                    name: "password",
                    type: "string",
                    label: "Password",
                    placeholder: "Enter your password",
                },
                {
                    name: "secure",
                    type: "boolean",
                    label: "Use Secure Connection (FTPS)",
                    default: false,
                    optional: true,
                },
            ],
        },
        sftp: {
            enabled: true,
            name: "SFTP",
            fields: [
                {
                    name: "host",
                    type: "string",
                    label: "Host",
                    placeholder: "example.com",
                },
                { name: "port", type: "number", label: "Port", default: 22 },
                {
                    name: "username",
                    type: "string",
                    label: "Username",
                    placeholder: "Enter your username",
                },
                {
                    name: "password",
                    type: "string",
                    label: "Password",
                    placeholder: "Enter your password",
                },
            ],
        },
    } as Record<string, ProtocolConfig>,
};

// Distrubution-specific config defaults
type DeepPartial<T> = T extends object
    ? {
          [P in keyof T]?: DeepPartial<T[P]>;
      }
    : T;
export const distributionConfig: DeepPartial<Config> = {};
