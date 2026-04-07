import Link from "next/link";
import type { RevivalStory } from "@/lib/core/dashboard/stories";

export function RevivedThisWeek({
  stories,
  totalThisWeek,
}: {
  stories: RevivalStory[];
  totalThisWeek: number;
}) {
  if (totalThisWeek === 0) return null;

  return (
    <div className="card revived-card">
      <div className="card-header-row">
        <div>
          <h2>
            <span className="up-icon">↗</span> Revived this week
          </h2>
          <div className="subtitle">These leads came back this week.</div>
        </div>
        <Link className="btn" href="/revival">See all</Link>
      </div>

      <div className="revived-list">
        {stories.length === 0 ? (
          <div className="empty">
            {totalThisWeek} lead{totalThisWeek === 1 ? "" : "s"} came back to
            life — open the revival center to see them.
          </div>
        ) : (
          stories.map((story) => (
            <div className="revived-row" key={story.leadId}>
              <div className="revived-body">
                <div className="revived-headline">{story.headline}</div>
                {story.detail && (
                  <div className="revived-detail">{story.detail}</div>
                )}
              </div>
              <Link className="btn" href={`/leads/${story.leadId}`}>
                Open lead →
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
