import 'dotenv/config';
import { ALLOWED_ROLE_IDS, CHANNEL_RULES, ANNOUNCER_WEBHOOK_ID, ensureConfig } from './config.js';
import { Client, GatewayIntentBits, Events, PermissionFlagsBits } from 'discord.js';

ensureConfig();

const client = new Client({
  // MessageContent is optional, but helps Discord populate mentions/content in gateway events.
  // If you enable it in the Developer Portal, it can make mention-dedupe more reliable.
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

async function startupAnnouncerSmokeTest() {
  // On startup ONLY: find the latest message by each announcer in its channel,
  // and reply once with "Suite-Seventeen online" + the paired role mention.
  for (const [channelId, rule] of CHANNEL_RULES.entries()) {
    if (!channelId || !rule?.roleId) continue;

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased?.()) {
        console.log('Startup test: channel not text-based', { channelId });
        continue;
      }

      const messages = await channel.messages.fetch({ limit: 50 });

      const target = rule.announcerId
        ? messages.find(m => m.author?.id === rule.announcerId)
        : messages.first();

      if (!target) {
        console.log('Startup test: no matching announcer message found', {
          channelId,
          announcerId: rule.announcerId || null,
        });
        continue;
      }

      // Don’t duplicate the startup test reply if we already posted it for this message.
      const alreadyReplied = messages.find(m =>
        m.author?.id === client.user?.id &&
        m.reference?.messageId === target.id &&
        (m.content || '').includes('Suite-Seventeen online')
      );

      if (alreadyReplied) {
        console.log('Startup test: already replied, skipping', { channelId, messageId: target.id });
        continue;
      }

      await target.reply({
        content: `Suite-Seventeen online\n<@&${rule.roleId}>`,
        allowedMentions: { roles: [rule.roleId], users: [] },
      });

      console.log('Startup test: replied', {
        channelId,
        messageId: target.id,
        roleId: rule.roleId,
        announcerId: rule.announcerId || null,
      });
    } catch (err) {
      console.error('Startup test failed', { channelId, err });
    }
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`Ready as ${c.user.tag}`);
  await startupAnnouncerSmokeTest();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'role') return;

  const roleId = interaction.options.getString('role', true);

  // Single allowlist check sourced from config
  if (!ALLOWED_ROLE_IDS.has(roleId)) {
    return interaction.reply({ content: 'That role is not allowed here.', ephemeral: true });
  }

  const member = interaction.member; // no extra fetch needed
  const hasRole = member.roles.cache.has(roleId);

  try {
    if (interaction.options.getSubcommand() === 'add') {
      if (hasRole) return interaction.reply({ content: 'You already have that role.', ephemeral: true });
      await member.roles.add(roleId, 'Self-assign role');
      return interaction.reply({ content: 'Role added.', ephemeral: true });
    } else {
      if (!hasRole) return interaction.reply({ content: 'You do not have that role.', ephemeral: true });
      await member.roles.remove(roleId, 'Self-remove role');
      return interaction.reply({ content: 'Role removed.', ephemeral: true });
    }
  } catch (err) {
    console.error(err);
    return interaction.reply({ content: 'Could not update your role (permissions?).', ephemeral: true });
  }
});

// Announcer: deduped into one handler using CHANNEL_TO_ROLE
client.on(Events.MessageCreate, async (message) => {
  // Never respond to ourselves (prevents loops)
  if (message.author?.id === client.user?.id) return;

  const rule = CHANNEL_RULES.get(message.channelId);
  if (!rule) return; // not a watched channel

  // If an announcer ID is configured, ONLY that user/bot should trigger.
  // (Important: announcers like Phasmophobia are bots, so we cannot blanket-ignore bot messages.)
  if (rule.announcerId) {
    if (message.author.id !== rule.announcerId) return;
  } else {
    // If no announcer is configured, ignore other bots by default.
    if (message.author.bot) return;
  }

  const roleId = rule.roleId;
  if (!roleId) return;

  // don’t double-ping if the role is already mentioned
  if (message.mentions.roles.has(roleId)) return;

  try {
    await message.reply({
      content: `<@&${roleId}>`,
      allowedMentions: { roles: [roleId], users: [] },
    });
  } catch (err) {
    console.error('Announcement ping failed', { channelId: message.channelId, roleId, err });
  }
});

await client.login(process.env.DISCORD_TOKEN);
