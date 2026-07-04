import { createFileRoute } from "@tanstack/react-router";
import { CmsHeader } from "@/components/cms/cms-ui";
import { ArticleForm } from "@/components/cms/ArticleForm";

export const Route = createFileRoute("/cms/articles/new")({
  head: () => ({ meta: [{ title: "New Article — Website CMS" }] }),
  component: NewArticle,
});

function NewArticle() {
  return (
    <div className="space-y-6">
      <CmsHeader title="New article" />
      <ArticleForm />
    </div>
  );
}
