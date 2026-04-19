import assert from "node:assert/strict";
import test from "node:test";

import * as postingsByIdRoute from "@/app/api/v1/postings/[id]/route";
import * as postingBidsRoute from "@/app/api/v1/postings/[id]/bids/route";
import * as bidVoteRoute from "@/app/api/v1/postings/[id]/bids/[bid_id]/vote/route";
import * as postingsRoute from "@/app/api/v1/postings/route";
import * as potRoute from "@/app/api/v1/pot/route";
import * as stubMessagesRoute from "@/app/api/v1/stubs/[slug]/messages/route";
import * as stubsBySlugRoute from "@/app/api/v1/stubs/[slug]/route";
import * as stubVotesRoute from "@/app/api/v1/stubs/[slug]/votes/route";
import * as stubBiasVoteRoute from "@/app/api/v1/stubs/[slug]/bias-vote/route";
import * as stubsRoute from "@/app/api/v1/stubs/route";
import * as voteRoute from "@/app/api/v1/vote/route";
import * as stubBidsRoute from "@/app/api/v1/bids/route";
import * as voteBidRoute from "@/app/api/v1/voteBid/route";

async function expectListResponse(responsePromise: Promise<Response>) {
  const response = await responsePromise;
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok("data" in body);
  assert.ok(Array.isArray(body.data));
}

async function expectItemResponse(responsePromise: Promise<Response>) {
  const response = await responsePromise;
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok("data" in body);
  assert.equal(body.data, null);
}

async function expectPotStateResponse(responsePromise: Promise<Response>) {
  const response = await responsePromise;
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok("data" in body);
  const data = body.data as { site?: unknown; research?: unknown };
  assert.ok(data && typeof data === "object");
  assert.ok("site" in data);
  assert.ok("research" in data);
}

test("GET /api/v1/stubs returns list format", async () => {
  await expectListResponse(stubsRoute.GET());
});

test("POST /api/v1/stubs returns item format", async () => {
  await expectItemResponse(
    stubsRoute.POST(
      new Request("http://localhost/api/v1/stubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "" }),
      }),
    ),
  );
});

test("GET /api/v1/stubs/[slug] returns item format", async () => {
  await expectItemResponse(stubsBySlugRoute.GET());
});

test("GET /api/v1/stubs/[slug]/messages returns list format", async () => {
  await expectListResponse(stubMessagesRoute.GET());
});

test("POST /api/v1/stubs/[slug]/messages returns item format", async () => {
  await expectItemResponse(stubMessagesRoute.POST());
});

test("POST /api/v1/stubs/[slug]/votes returns item format", async () => {
  await expectItemResponse(stubVotesRoute.POST());
});

test("POST /api/v1/stubs/[slug]/bias-vote rejects invalid axis", async () => {
  const response = await stubBiasVoteRoute.POST(
    new Request("http://localhost/api/v1/stubs/example/bias-vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ axis: "north" }),
    }),
    { params: { slug: "example" } },
  );
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.ok("error" in body);
});

test("POST /api/v1/vote rejects invalid voteType", async () => {
  const response = await voteRoute.POST(
    new Request("http://localhost/api/v1/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stubId: "00000000-0000-0000-0000-000000000001",
        voteType: "invalid_vote",
      }),
    }),
  );
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.ok("error" in body);
});

test("GET /api/v1/bids requires stubId", async () => {
  const response = await stubBidsRoute.GET(
    new Request("http://localhost/api/v1/bids"),
  );
  assert.equal(response.status, 400);
});

test("POST /api/v1/bids requires orcid", async () => {
  const response = await stubBidsRoute.POST(
    new Request("http://localhost/api/v1/bids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stubId: "00000000-0000-0000-0000-000000000001",
      }),
    }),
  );
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.ok("error" in body);
});

test("POST /api/v1/voteBid rejects invalid direction", async () => {
  const response = await voteBidRoute.POST(
    new Request("http://localhost/api/v1/voteBid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bidId: "00000000-0000-0000-0000-000000000001",
        direction: "sideways",
      }),
    }),
  );
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.ok("error" in body);
});

test("GET /api/v1/postings returns list format", async () => {
  await expectListResponse(postingsRoute.GET());
});

test("GET /api/v1/postings/[id] returns item format", async () => {
  await expectItemResponse(postingsByIdRoute.GET());
});

test("POST /api/v1/postings/[id]/bids returns item format", async () => {
  await expectItemResponse(postingBidsRoute.POST());
});

test("POST /api/v1/postings/[id]/bids/[bid_id]/vote returns item format", async () => {
  await expectItemResponse(bidVoteRoute.POST());
});

test("GET /api/v1/pot returns site and research", async () => {
  await expectPotStateResponse(potRoute.GET());
});

test("POST /api/v1/pot requires message", async () => {
  const response = await potRoute.POST(
    new Request("http://localhost/api/v1/pot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }),
  );
  assert.equal(response.status, 400);
});
