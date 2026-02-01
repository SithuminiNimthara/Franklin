// src/modules/shoreline/utils/clerk.util.js
import { clerkClient } from "@clerk/clerk-sdk-node";

export async function getUserPrimaryEmail(userId) {
  if (!userId) return null;

  const user = await clerkClient.users.getUser(userId);

  const primaryId = user.primaryEmailAddressId;
  const primary = user.emailAddresses?.find((e) => e.id === primaryId);

  return primary?.emailAddress || user.emailAddresses?.[0]?.emailAddress || null;
}
