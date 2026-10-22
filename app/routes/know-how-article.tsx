import type { MetaFunction } from "react-router";
import { useParams } from "react-router";
import { PublicPage } from "../../src/features/landing/components/PublicPage";
import { ArticleView } from "../../src/features/landing/components/ArticleView";

export const meta: MetaFunction = () => {
  return [
    { title: "Guide: Oasis.dev know-how" },
    {
      name: "description",
      content: "A practical how-to from our studio. Plain steps for daily work.",
    },
  ];
};

export default function KnowHowArticleRoute() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  return (
    <PublicPage eyebrow="Know-how guide">
      <ArticleView
        slug={slug}
        kind="know-how"
        backHref="/know-how"
        backLabel="Back to know-how"
        missingTitle="This guide is not here yet."
        missingText="We have not published this guide, or the address is off by a letter. Browse the know-how library for what is live, or send the intake and we reply with plain next steps."
      />
    </PublicPage>
  );
}
