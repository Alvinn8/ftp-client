import "@testing-library/jest-dom";

// happy-dom setup
console.log(location.href);
location.href = "http://localhost:3000";
document.oninput = null; // prevent react-dom from thinking we are an old internet explorer
(globalThis["WebSocket"] as any) = {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
}