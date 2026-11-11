import assert from "node:assert/strict";
import test from "node:test";
import {
  filterDirectoryMembers,
  getActiveStatuses,
  type AvailabilityRow,
  type DirectoryMember,
  type DirectoryProfile,
} from "../src/app/directory/directory-filter";

const now = new Date("2026-11-10T12:00:00Z");

function profile(id: string, fields: Partial<DirectoryProfile> = {}): DirectoryProfile {
  return {
    id,
    full_name: id,
    current_role: null,
    current_company: null,
    industry: null,
    location: null,
    graduation_year: null,
    program: "MBA",
    availability_status: null,
    ...fields,
  };
}

function member(person: DirectoryProfile, role: DirectoryMember["role"]): DirectoryMember {
  return {
    profile: person,
    role,
    activeStatuses: getActiveStatuses(person.availability_status, now),
  };
}

const coffee: AvailabilityRow = { type: "coffee_chats", is_active: true, expires_at: null };

test("search matches case-insensitive words across name and alumni company", () => {
  const alice = member(profile("alice", { full_name: "Alice Chen", current_company: "Acme Labs" }), "alumni");
  const ben = member(profile("ben", { full_name: "Ben Rivera", current_company: "Acme Labs" }), "alumni");

  const result = filterDirectoryMembers([alice, ben], "  aLiCe   AcMe  ", "all", "any");

  assert.deepEqual(result.map((item) => item.profile.id), ["alice"]);
});

test("student search ignores stale employer and industry fields", () => {
  const student = member(profile("ben", {
    full_name: "Ben Rivera",
    current_role: "Consultant",
    current_company: "OldCo",
    industry: "Finance",
  }), "student");

  assert.deepEqual(filterDirectoryMembers([student], "OldCo", "all", "any"), []);
  assert.deepEqual(filterDirectoryMembers([student], "Finance", "all", "any"), []);
  assert.deepEqual(filterDirectoryMembers([student], "Ben", "all", "any"), [student]);
});

test("role filter separates students and alumni and excludes unknown roles", () => {
  const alumni = member(profile("alumni"), "alumni");
  const student = member(profile("student"), "student");
  const unknown = member(profile("unknown"), null);
  const people = [alumni, student, unknown];

  assert.deepEqual(filterDirectoryMembers(people, "", "student", "any"), [student]);
  assert.deepEqual(filterDirectoryMembers(people, "", "alumni", "any"), [alumni]);
  assert.deepEqual(filterDirectoryMembers(people, "", "all", "any"), people);
});

test("availability filter excludes inactive, expired, and just-expired statuses", () => {
  const active = member(profile("active", { availability_status: [coffee] }), "alumni");
  const inactive = member(profile("inactive", { availability_status: [
    { type: "coffee_chats", is_active: false, expires_at: null },
  ] }), "alumni");
  const expired = member(profile("expired", { availability_status: [
    { type: "coffee_chats", is_active: true, expires_at: "2026-11-09T12:00:00Z" },
  ] }), "alumni");
  const atBoundary = member(profile("boundary", { availability_status: [
    { type: "coffee_chats", is_active: true, expires_at: now.toISOString() },
  ] }), "alumni");

  assert.deepEqual(
    filterDirectoryMembers([active, inactive, expired, atBoundary], "", "all", "coffee_chats"),
    [active]
  );
});

test("search and both filters compose; clearing selections restores all members", () => {
  const alice = member(profile("alice", {
    full_name: "Alice Chen", location: "Boston", availability_status: [coffee],
  }), "alumni");
  const cara = member(profile("cara", {
    full_name: "Cara Lee", location: "Boston", availability_status: [
      { type: "mentorship", is_active: true, expires_at: null },
    ],
  }), "alumni");
  const ben = member(profile("ben", {
    full_name: "Ben Rivera", location: "Boston", availability_status: [coffee],
  }), "student");
  const people = [alice, cara, ben];

  assert.deepEqual(filterDirectoryMembers(people, "boston", "alumni", "coffee_chats"), [alice]);
  assert.deepEqual(filterDirectoryMembers(people, "zzzz", "alumni", "coffee_chats"), []);
  assert.deepEqual(filterDirectoryMembers(people, "", "all", "any"), people);
});
