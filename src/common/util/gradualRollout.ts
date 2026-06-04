import { useSession } from "../ui/store/sessionStore";

// https://stackoverflow.com/a/7616484
const generateHash = (str: string) => {
    let hash = 0;
    for (const char of str) {
        hash = (hash << 5) - hash + char.charCodeAt(0);
        hash |= 0; // Constrain to 32bit integer
    }
    return hash;
};

function mod(n: number, m: number) {
    return ((n % m) + m) % m;
}

function getUrlStringToHash() {
    // Attempt various methods of obtaining a user-specific string to hash,
    // falling back to the URL if all else fails.
    //
    // Distribution-specific code can be added here to try to obtain a more stable
    // identifier for the user if needed.

    // If we have a session, use the username if available
    try {
        if (useSession.getState().hasSession()) {
            const session = useSession.getState().getSession();
            if (session.profile.username) {
                return session.profile.username;
            }
        }
    } catch {}

    // Try to read the username from the URL in case the session is not available yet
    const url = new URL(location.href);
    try {
        const username = url.searchParams.get("username");
        if (username) {
            return username;
        }
    } catch {}

    // Fallback to entire URL. This may change for users in some situations, but
    // might be acceptable for many situations.
    return url.href;
}

export class GradualRollout {
    private name: string;
    private startDate: Date;
    private durationDays: number;

    constructor(name: string, startDate: Date, durationDays: number) {
        this.name = name;
        this.startDate = startDate;
        this.durationDays = durationDays;
    }

    probability(date: Date) {
        if (date < this.startDate) {
            return 0; // Before start date, 0% probability
        }
        // Gradually increase the probability
        const startDate = this.startDate.getTime();
        const endDate = startDate + this.durationDays * 24 * 60 * 60 * 1000;
        if (date.getTime() >= endDate) {
            return 1; // After the duration, 100% chance
        }
        return (date.getTime() - startDate) / (endDate - startDate); // Linear increase from 0 to 1
    }

    evaluate() {
        const href = String(location.href);
        if (href.includes(this.name)) {
            return true;
        }
        const stringToHash = getUrlStringToHash();
        const hash = generateHash(stringToHash);
        const probabilityPercentage = this.probability(new Date()) * 100;
        const randomValue = mod(hash, 100);
        console.log(
            `Hashed string: ${stringToHash}, Hash: ${hash}, Probability for ${this.name}: ${probabilityPercentage.toFixed(2)}%, Random value: ${randomValue}`,
        );
        return randomValue < probabilityPercentage;
    }
}

// Example:
// export const ui2Rollout = new GradualRollout("ui2", new Date("2026-03-03T00:00:00Z"), 14);
