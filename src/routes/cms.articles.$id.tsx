import { createFileRoute } from "@tanstack/react-router";
import { CmsHeader } from "@/components/cms/cms-ui";
import { ArticleForm } from "@/components/cms/ArticleForm";

export const Route = createFileRoute("/cms/articles/$id")({
  head: () => ({ meta: [{ title: "Edit Article — Website CMS" }] }),
  component: EditArticle,
});

function EditArticle() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-6">
      <CmsHeader title="Edit article" />
      <ArticleForm postId={id} />
    </div>
  );
}
