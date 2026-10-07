import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Work: Oasis.dev" },
    {
      name: "description",
      content: "No completed client work to show yet. We publish only real builds with permission.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

export default function WorkRoute() {
  return (
    <main style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 20px" }}>
      <p style={{ fontSize: "14px", letterSpacing: "0.04em", textTransform: "uppercase" }}>Work</p>
      <h1>Nothing to show yet</h1>
      <p>No completed client work to show yet. We publish only real builds with permission.</p>
      <p>
        <a href="/#intake">Start with the intake</a>
      </p>
      <p>
        <a href="/">Back to home</a>
      </p>
    </main>
  );
}
