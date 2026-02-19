import 'dotenv/config';
import { ROLE_CHOICES, ensureConfig } from './config.js';
import { SlashCommandBuilder, REST, Routes } from 'discord.js';

ensureConfig();

const withRoleStringOption = (sub) =>
  sub.addStringOption(opt =>
    opt
      .setName('role')
      .setDescription('Select a role')
      .setRequired(true)
      .addChoices(...ROLE_CHOICES)
  );

const data = [
  new SlashCommandBuilder()
    .setName('role')
    .setDescription('Manage your roles')
    .addSubcommand(sc =>
      withRoleStringOption(sc.setName('add').setDescription('Add a role'))
    )
    .addSubcommand(sc =>
      withRoleStringOption(sc.setName('remove').setDescription('Remove a role'))
    ),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
await rest.put(
  Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
  { body: data }
);
console.log('Slash commands registered.');
