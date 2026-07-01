import { useState, useRef } from "react";
import { flushSync } from "react-dom";

const api_key = ""; // i have sent you the api key on wp
const model = "gemini-2.5-flash";

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  async function sendMsg() {
    if (input.trim() === "") return;

    const userMsg = input;
    setInput("");

    setMessages((prev) => [...prev, { from: "user", text: userMsg }]);
    setMessages((prev) => [...prev, { from: "bot", text: "gemini is thinking..." }]);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${api_key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userMsg }] }],
          }),
        }
      );

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = ""; 

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); 

        for (let line of lines) {
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6);
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            const chunk = data.candidates[0].content.parts[0].text;

            accumulated += chunk; 

            flushSync(() => {
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1].text = accumulated; 
                return copy;
              });
            });
          } catch (e) {
            console.log("bad chunk, skipping", e);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1].text = "something went wrong";
        return copy;
      });
    }

    inputRef.current.focus();
  }

  function handleKey(e) {
    if (e.key === "Enter") sendMsg();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#15151a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          fontFamily: "Arial, sans-serif",
          color: "#ddd",
        }}
      >
        <h2 style={{ marginBottom: 12 }}>chatbot</h2>

        <div
          style={{
            background: "#1e1e24",
            border: "1px solid #333",
            borderRadius: 8,
            height: 350,
            overflowY: "auto",
            padding: 12,
            marginBottom: 10,
          }}
        >
          {messages.length === 0 && (
            <p style={{ color: "#666" }}>say something...</p>
          )}
          {messages.map((m, i) => (
            <p key={i} style={{ margin: "8px 0", lineHeight: 1.4 }}>
              <b style={{ color: m.from === "user" ? "#8ab4f8" : "#9ed6a0" }}>
                {m.from === "user" ? "you" : "bot"}:
              </b>{" "}
              {m.text}
            </p>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="type a message"
            style={{
              flex: 1,
              padding: 8,
              background: "#1e1e24",
              border: "1px solid #333",
              borderRadius: 6,
              color: "#eee",
              outline: "none",
            }}
          />
          <button
            onClick={sendMsg}
            style={{
              padding: "8px 14px",
              background: "#333",
              border: "1px solid #444",
              borderRadius: 6,
              color: "#eee",
              cursor: "pointer",
            }}
          >
            send
          </button>
        </div>
      </div>
    </div>
  );
}