// config.js (ESM)
// Load envs if you use a .env file
import 'dotenv/config';

/**
 * Roles (single source of truth)
 * Fill these with your actual role IDs or use env vars.
 */
export const ROLE_IDS = {
  MINECRAFT: process.env.ROLE_MINECRAFT_ID,
  PHASMO:    process.env.ROLE_PHASMO_ID,
};

/**
 * Channels that should auto-ping their paired role (optional, for your announcer logic)
 */
export const CHANNEL_IDS = {
  MINECRAFT: process.env.MINECRAFT_CHANNEL_ID,
  PHASMO:    process.env.PHASMO_CHANNEL_ID,
};

export const USER_IDS = {
  MINECRAFT: process.env.MINECRAFT_ANNOUNCER_ID,
  PHASMO: process.env.PHASMO_ANNOUNCER_ID,
};

/**
 * Webhook (if you use one in the announcer path)
 */
export const ANNOUNCER_WEBHOOK_ID = process.env.ANNOUNCER_WEBHOOK_ID || null;

/**
 * Derived structures
 */
export const ALLOWED_ROLE_IDS = new Set(Object.values(ROLE_IDS));

export const ROLE_CHOICES = Object.entries(ROLE_IDS)
  .map(([key, id]) => ({
    // 'name' is what users see in the slash option; adjust labels if you want pretty casing
    name: key.toLowerCase(), // e.g. "minecraft"
    value: id,               // the actual role ID your handler will receive
  }));

// Map of channelId -> roleId for your messageCreate announcer behavior

export const CHANNEL_RULES = new Map(
  [
    [CHANNEL_IDS.MINECRAFT, { roleId: ROLE_IDS.MINECRAFT, announcerId: USER_IDS.MINECRAFT }],
    [CHANNEL_IDS.PHASMO,    { roleId: ROLE_IDS.PHASMO,    announcerId: USER_IDS.PHASMO }],
  ].filter(([channelId]) => Boolean(channelId))
);

/**
 * Optional: quick validation to fail fast on missing critical config
 */
export function ensureConfig() {
  const missing = [];
  if (!process.env.DISCORD_TOKEN) missing.push('DISCORD_TOKEN');
  if (!process.env.CLIENT_ID)     missing.push('CLIENT_ID');
  if (!process.env.GUILD_ID)      missing.push('GUILD_ID');

  for (const [k, v] of Object.entries(ROLE_IDS)) if (!v || v.startsWith('0000')) missing.push(`ROLE_${k}_ID`);

  if (missing.length) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
}
