type MessagesProperties = {
  tone: "problem" | "confirmation";
  messages: readonly string[];
};

const tones = {
  problem: "border-red-300 bg-red-50 text-red-900",
  confirmation: "border-emerald-300 bg-emerald-50 text-emerald-900",
};

export function Messages({ tone, messages }: MessagesProperties) {
  if (messages.length === 0) {
    return null;
  }
  return (
    <div
      role={tone === "problem" ? "alert" : "status"}
      className={`rounded-md border px-4 py-3 text-sm ${tones[tone]}`}
    >
      <ul className="space-y-1">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
