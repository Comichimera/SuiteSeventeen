import 'dotenv/config';
import { ALLOWED_ROLE_IDS, CHANNEL_RULES, ANNOUNCER_WEBHOOK_ID, ensureConfig } from './config.js';
import { Client, GatewayIntentBits, Events, PermissionFlagsBits } from 'discord.js';

ensureConfig();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once(Events.ClientReady, c => console.log(`Ready as ${c.user.tag}`));

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
  if (message.author.bot) return;

  const rule = CHANNEL_RULES.get(message.channelId);
  if (!rule) return; // not a watched channel

  if (rule.announcerId && message.author.id !== rule.announcerId) return; // only the announcer can trigger

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
