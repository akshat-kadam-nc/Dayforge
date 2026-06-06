import { Placeholder } from '../components/Placeholder';

export function GoalsPage() {
  return (
    <Placeholder title="Goals" emoji="🧭">
      <p className="muted">
        Goal hierarchy per life area: Annual &gt; Half-year &gt; Monthly &gt; Weekly, with
        auto-prompted weekly / monthly / half-year reviews.
      </p>
    </Placeholder>
  );
}
