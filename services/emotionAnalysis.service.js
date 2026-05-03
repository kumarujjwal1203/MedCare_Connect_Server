const emotionalMappings = [
  { label: "Stress", keywords: ["stress", "stressed", "tension", "pressure in mind"] },
  { label: "Anxiety", keywords: ["anxiety", "ghabrahat", "panic", "restless", "nervous"] },
  { label: "Depression", keywords: ["depression", "sad", "udasi", "hopeless", "low mood"] },
  { label: "Panic", keywords: ["panic attack", "panic", "sudden fear"] }
];

export const detectEmotionalState = (message = "") => {
  const text = message.toLowerCase();
  const matched = emotionalMappings.find((item) =>
    item.keywords.some((keyword) => text.includes(keyword))
  );

  return matched?.label || "None";
};
