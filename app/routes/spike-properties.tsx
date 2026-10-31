import type { MetaFunction } from "react-router";
import { Text } from "@mantine/core";
import { PropertiesPanel } from "../../src/features/admin/components/PropertiesPanel";
import { PROPERTIES } from "../../src/features/admin/registry/properties";
import {
  applyApexReport,
  parseApexReport,
} from "../../src/features/admin/registry/reporter";
import fixture from "../../src/features/admin/registry/apex-report.fixture.json";

// TEMPORARY spike 2 harness only. Renders PropertiesPanel twice: once from the
// static seed (no reporter data: proves the decoupled empty state) and once
// with the apex fixture applied through the real adapter (proves the live
// pulse state). Same reason as spike 1: local .dev.vars lacks real Access
// secrets, so /admin cannot render authed locally. Delete this file and its
// route entry before merging the spike.
export const meta: MetaFunction = () => {
  return [{ name: "robots", content: "noindex, nofollow" }];
};

const report = parseApexReport(fixture);
const withLiveApex = PROPERTIES.map((row) =>
  row.id === "apex" && report ? applyApexReport(row, report) : row,
);

export default function SpikePropertiesRoute() {
  return (
    <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <p>TEMPORARY spike harness. Remove before merge.</p>
      <Text fw={700} mb="xs">
        State 1: seed only, no reporter data (must render, all pulse unknown)
      </Text>
      <PropertiesPanel />
      <Text fw={700} mt="xl" mb="xs">
        State 2: apex fixture applied via reporter adapter (health up + chips)
      </Text>
      <PropertiesPanel items={withLiveApex} />
    </main>
  );
}
