export async function triggerNovelResearchQuestionProcess(userQuestion: string) {
  const rq = userQuestion.trim();
  if (!rq) return null;

  const response = await fetch("/api/v1/stub", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "proposed",
      rq,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create proposed stub.");
  }

  return response.json();
}
