import type { MetaFunction } from "react-router";
import { PublicPage } from "../../src/features/landing/components/PublicPage";
import { PostsIndex } from "../../src/features/landing/components/PostsIndex";

export const meta: MetaFunction = () => {
  return [
    { title: "Know-how: Oasis.dev" },
    {
      name: "description",
      content:
        "A small library of practical how-tos from our studio. Short guides for everyday business tasks.",
    },
  ];
};

export default function KnowHowRoute() {
  return (
    <PublicPage eyebrow="Know-how library">
      <PostsIndex
        kind="know-how"
        basePath="/know-how"
        eyebrow="Know-how library"
        title="Practical how-tos"
        description="Short guides for everyday business tasks. Plain steps you can try in daily work."
        emptyTitle="The library is empty for now."
        emptyText="We are writing the first practical guides. When they are ready, they will appear here. For now, send the intake with one line about your repeating task."
      />
    </PublicPage>
  );
}
