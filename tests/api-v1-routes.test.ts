import assert from "node:assert/strict";
import test from "node:test";

import * as postingsByIdRoute from "@/app/api/v1/postings/[id]/route";
import * as bidsRoute from "@/app/api/v1/postings/[id]/bids/route";
import * as bidVoteRoute from "@/app/api/v1/postings/[id]/bids/[bid_id]/vote/route";
import * as postingsRoute from "@/app/api/v1/postings/route";
import * as potRoute from "@/app/api/v1/pot/route";
import * as stubMessagesRoute from "@/app/api/v1/stubs/[slug]/messages/route";
import * as stubsBySlugRoute from "@/app/api/v1/stubs/[slug]/route";
import * as stubVotesRoute from "@/app/api/v1/stubs/[slug]/votes/route";
import * as stubsRoute from "@/app/api/v1/stubs/route";

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

test("GET /api/v1/stubs returns list format", async () => {
  await expectListResponse(stubsRoute.GET());
});

test("POST /api/v1/stubs returns item format", async () => {
  await expectItemResponse(stubsRoute.POST());
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

test("GET /api/v1/postings returns list format", async () => {
  await expectListResponse(postingsRoute.GET());
});

test("GET /api/v1/postings/[id] returns item format", async () => {
  await expectItemResponse(postingsByIdRoute.GET());
});

test("POST /api/v1/postings/[id]/bids returns item format", async () => {
  await expectItemResponse(bidsRoute.POST());
});

test("POST /api/v1/postings/[id]/bids/[bid_id]/vote returns item format", async () => {
  await expectItemResponse(bidVoteRoute.POST());
});

test("GET /api/v1/pot returns list format", async () => {
  await expectListResponse(potRoute.GET());
});
