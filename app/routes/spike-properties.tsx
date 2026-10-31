import type { MetaFunction } from "react-router";
import { PropertiesPanel } from "../../src/features/admin/components/PropertiesPanel";

// TEMPORARY spike 1 harness only. Renders PropertiesPanel in isolation because
// local .dev.vars lacks real Access secrets, so /admin cannot render authed
// locally. Delete this file and its route entry before merging the spike.
export const meta: MetaFunction = () => {
  return [{ name: "robots", content: "noindex, nofollow" }];
};

export default function SpikePropertiesRoute() {
  return (
    <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <p>TEMPORARY spike harness. Remove before merge.</p>
      <PropertiesPanel />
    </main>
  );
}
