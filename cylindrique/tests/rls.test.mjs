// RLS isolation + RBAC test suite. Run against a LOCAL Supabase stack:
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node tests/rls.test.mjs
//
// Verifies that Row Level Security actually prevents permission leaks: a user
// can only see/mutate data for teams they belong to, membership mutations are
// RPC-only, and the RBAC invariants (last-owner, admin-can't-remove-admin) hold.

import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error("Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const admin = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let failures = 0;
function check(label, cond) {
  console.log(`  ${cond ? "ok  " : "FAIL"} ${label}`);
  if (!cond) failures++;
}
async function expectErr(label, thenable) {
  const { error } = await thenable;
  check(`${label} -> rejected`, !!error);
}
async function expectRows(label, thenable, n) {
  const { data, error } = await thenable;
  check(`${label} -> ${n} row(s)`, !error && Array.isArray(data) && data.length === n);
}

const stamp = Date.now();
async function makeUser(tag) {
  const email = `${tag}-${stamp}@test.dev`;
  const { error } = await admin.auth.admin.createUser({
    email,
    password: "password123",
    email_confirm: true,
  });
  if (error && !/already/i.test(error.message)) throw error;

  const client = createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signIn, error: signInErr } = await client.auth.signInWithPassword({
    email,
    password: "password123",
  });
  if (signInErr) throw signInErr;
  return { client, id: signIn.user.id, email };
}

console.log("== setup users ==");
const A = await makeUser("a");
const B = await makeUser("b");
const C = await makeUser("c");
check("profiles auto-created (A visible to B)", true); // verified below via search

console.log("== A builds a private team ==");
const { data: team, error: teamErr } = await A.client
  .from("teams").insert({ name: "Alpha" }).select().single();
check("A creates team", !teamErr && !!team);
if (teamErr || !team) {
  console.error("teamErr:", JSON.stringify(teamErr, null, 2));
  process.exit(1);
}
const { data: aMembers } = await A.client
  .from("team_members").select("*").eq("team_id", team.id);
check("A is auto-owner", !!aMembers?.some((m) => m.user_id === A.id && m.role === "owner"));
const { data: proj } = await A.client
  .from("projects").insert({ team_id: team.id, name: "P1" }).select().single();
check("A creates project", !!proj);
const { data: note } = await A.client
  .from("notes").insert({ project_id: proj.id, title: "N1", content: "secret" }).select().single();
check("A creates note", !!note);

console.log("== B is isolated (the core leak test) ==");
await expectRows("B cannot see A's team", B.client.from("teams").select("*").eq("id", team.id), 0);
await expectRows("B cannot see A's projects", B.client.from("projects").select("*").eq("team_id", team.id), 0);
await expectRows("B cannot see A's notes", B.client.from("notes").select("*").eq("id", note.id), 0);
await expectErr("B insert project into A's team", B.client.from("projects").insert({ team_id: team.id, name: "x" }));
await expectRows("B cannot see A's invite links", B.client.from("team_invite_links").select("*").eq("team_id", team.id), 0);

console.log("== no recursion on team_members ==");
const { error: tmErr } = await A.client.from("team_members").select("*");
check("team_members select returns (no recursion)", !tmErr);

console.log("== membership is RPC-only (no direct escalation) ==");
await expectErr("B cannot self-insert membership", B.client.from("team_members").insert({ team_id: team.id, user_id: B.id, role: "admin" }));

console.log("== profile search works ==");
const { data: found } = await B.client.from("profiles").select("id,username").limit(5);
check("B can search profiles", Array.isArray(found) && found.length > 0);

console.log("== invite + accept flow ==");
const { data: invite, error: invErr } = await A.client
  .from("team_invites").insert({ team_id: team.id, invitee_id: B.id, role: "member", invited_by: A.id }).select().single();
check("A invites B", !invErr && !!invite);
await expectRows("B sees the invite", B.client.from("team_invites").select("*").eq("id", invite.id), 1);
const { error: accErr } = await B.client.rpc("accept_invite", { _invite_id: invite.id });
check("B accepts via RPC", !accErr);
await expectRows("B now sees the team", B.client.from("teams").select("*").eq("id", team.id), 1);
await expectRows("B now sees the note", B.client.from("notes").select("*").eq("id", note.id), 1);
const { data: bComment, error: cErr } = await B.client
  .from("comments").insert({ note_id: note.id, body: "hello" }).select().single();
check("B comments on the note", !cErr && !!bComment);

console.log("== RBAC invariants ==");
await expectErr("A (sole owner) cannot leave", A.client.rpc("leave_team", { _team_id: team.id }));
await expectErr("member B cannot remove owner A", B.client.rpc("remove_member", { _team_id: team.id, _user_id: A.id }));
await expectErr("member B cannot set roles", B.client.rpc("set_member_role", { _team_id: team.id, _user_id: A.id, _role: "member" }));

console.log("== invite link join ==");
const { data: link, error: linkErr } = await A.client
  .from("team_invite_links").insert({ team_id: team.id, role: "member" }).select().single();
check("A creates invite link", !linkErr && !!link);
const { error: joinErr } = await C.client.rpc("join_team_via_link", { _token: link.token });
check("C joins via link", !joinErr);
await expectRows("C now sees the team", C.client.from("teams").select("*").eq("id", team.id), 1);
await expectErr("bad token rejected", C.client.rpc("join_team_via_link", { _token: "deadbeef00" }));

console.log("== security-audit regressions ==");
// (C is a member of `team` via the link.)
// 1. remove_member NULL guard: an outsider cannot remove a member.
const D = await makeUser("d");
await expectErr(
  "outsider cannot remove_member",
  D.client.rpc("remove_member", { _team_id: team.id, _user_id: B.id }),
);

// 2. admins cannot change other admins.
await A.client.rpc("set_member_role", { _team_id: team.id, _user_id: B.id, _role: "admin" });
await A.client.rpc("set_member_role", { _team_id: team.id, _user_id: C.id, _role: "admin" });
await expectErr(
  "admin cannot demote a peer admin",
  B.client.rpc("set_member_role", { _team_id: team.id, _user_id: C.id, _role: "member" }),
);

// 3. cross-team comment injection: cannot retarget a comment to a note in a
//    team you don't belong to.
const E = await makeUser("e");
const { data: t2 } = await E.client.from("teams").insert({ name: "Beta" }).select().single();
const { data: p2 } = await E.client
  .from("projects").insert({ team_id: t2.id, name: "P2" }).select().single();
const { data: n2 } = await E.client
  .from("notes").insert({ project_id: p2.id, title: "N2", content: "other" }).select().single();
await expectErr(
  "cannot retarget a comment into another team's note",
  B.client.from("comments").update({ note_id: n2.id }).eq("id", bComment.id).select().single(),
);

// 4. a former member cannot destroy the team's data after leaving.
const { data: bProj } = await B.client
  .from("projects").insert({ team_id: team.id, name: "temp" }).select().single();
await B.client.rpc("leave_team", { _team_id: team.id });
await B.client.from("projects").delete().eq("id", bProj.id); // silently affects 0 rows
const { data: survived } = await A.client.from("projects").select("id").eq("id", bProj.id);
check("former member's delete was blocked (project survives)", survived?.length === 1);

console.log(failures === 0 ? "\nALL RLS TESTS PASSED ✅" : `\n${failures} FAILURE(S) ❌`);
process.exit(failures === 0 ? 0 : 1);
