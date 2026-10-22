import type { MetaFunction } from "react-router";
import { PublicPage } from "../../src/features/landing/components/PublicPage";
import { PostsIndex } from "../../src/features/landing/components/PostsIndex";

export const meta: MetaFunction = () => {
  return [
    { title: "Blog: Oasis.dev" },
    {
      name: "description",
      content:
        "Short notes from our small studio about tools, websites, and automations. Plain lessons from real work.",
    },
  ];
};

export default function BlogRoute() {
  return (
    <PublicPage eyebrow="Blog">
      <PostsIndex
        kind="post"
        basePath="/blog"
        eyebrow="Blog"
        title="Notes from the studio"
        description="Short notes about tools, websites, and automations. Plain lessons from real work."
        emptyTitle="No notes published yet."
        emptyText="We have not published any notes yet. When we do, they will appear here. For now, send the intake with one line about your repeating task."
      />
    </PublicPage>
  );
}
