import type { MetaFunction } from "react-router";
import { useParams } from "react-router";
import { PublicPage } from "../../src/features/landing/components/PublicPage";
import { ArticleView } from "../../src/features/landing/components/ArticleView";

export const meta: MetaFunction = () => {
  return [
    { title: "Note: Oasis.dev blog" },
    {
      name: "description",
      content: "A short studio note. Plain lessons from real work.",
    },
  ];
};

export default function BlogArticleRoute() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  return (
    <PublicPage eyebrow="Blog note">
      <ArticleView
        slug={slug}
        kind="post"
        backHref="/blog"
        backLabel="Back to blog"
        missingTitle="This note is not here yet."
        missingText="We have not published this note, or the address is off by a letter. Browse the blog for what is live, or send the intake and we reply with plain next steps."
      />
    </PublicPage>
  );
}
