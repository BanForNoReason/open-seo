import { aliasedTable, and, asc, eq, lt, notExists } from "drizzle-orm";
import { db } from "@/db";
import { member, organization, user as authUser } from "@/db/schema";

type DelegatedOrganizationInput = {
  id: string;
  name: string;
  slug: string;
};

async function upsertDelegatedOrganization(input: DelegatedOrganizationInput) {
  await db
    .insert(organization)
    .values({
      id: input.id,
      name: input.name,
      slug: input.slug,
      logo: null,
      createdAt: new Date(),
      metadata: null,
    })
    .onConflictDoUpdate({
      target: organization.id,
      set: {
        name: input.name,
        slug: input.slug,
      },
    });
}

async function findFirstOrganizationIdForUser(userId: string) {
  const [existingMembership] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
    .orderBy(asc(member.createdAt))
    .limit(1);

  return existingMembership?.organizationId ?? null;
}

// Founded = the user is the org's earliest member (its creator), not merely
// an owner: a later-promoted invitee must never count as founding an org.
async function findFirstFoundedOrganizationIdForUser(userId: string) {
  const earlierMember = aliasedTable(member, "earlier_member");
  const [foundedMembership] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(
      and(
        eq(member.userId, userId),
        eq(member.role, "owner"),
        notExists(
          db
            .select({ id: earlierMember.id })
            .from(earlierMember)
            .where(
              and(
                eq(earlierMember.organizationId, member.organizationId),
                lt(earlierMember.createdAt, member.createdAt),
              ),
            ),
        ),
      ),
    )
    .orderBy(asc(member.createdAt))
    .limit(1);

  return foundedMembership?.organizationId ?? null;
}

async function getHostedUser(userId: string) {
  return db.query.user.findFirst({
    columns: {
      id: true,
      email: true,
      name: true,
    },
    where: eq(authUser.id, userId),
  });
}

export const AuthRepository = {
  upsertDelegatedOrganization,
  findFirstOrganizationIdForUser,
  findFirstFoundedOrganizationIdForUser,
  getHostedUser,
} as const;
