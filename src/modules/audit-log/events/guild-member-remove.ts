import type { Message, Client, TextChannel } from 'discord.js';
import { GuildMember } from 'discord.js';
import { MessageEmbed } from 'discord.js';
import { capitalizeFirstLetter } from '../../../utils';
import { createAuditLogChannel } from '../utils/create-audit-log-channel';
import * as duration from 'human-duration';

export const guildMemberRemove = async (client: Client, member: GuildMember, newMember: GuildMember) => {
    // This stops if it's not a guild, and we ignore all bots.
    // @todo: add the ability for servers to track specific bots or all bot message deletions
    if (!member.guild || member.user.bot) return;

    // Create named logger with id and name
    const logger = client.logger.createChild({
        prefix: member.guild.id
    }).createChild({
        prefix: member.guild.name
    });

    try {
        // Get guild config
        const guildConfig = client.settings.get(member.guild.id)!;

        // Bail if the module is disabled
        if (!guildConfig.auditLog.enabled) return;

        // Bail if this event is disabled
        if (!guildConfig.auditLog.events.includes('guildMemberRemove')) return;

        // Find the channel
        const auditLog = member.guild.channels.cache.find(channel => channel.name === (guildConfig.auditLog.channel ?? 'audit-log')) as TextChannel;

        // If we can't find the channel then create one called "audit-log"
        if (!auditLog) {
            await createAuditLogChannel(client, member);
        }

        // Log for debugging
        logger.silly(`${member.user.tag} left the server`);

        // Send message to audit log channel
        await auditLog.send(new MessageEmbed({
            author: {
                name: member.user.username,
                iconURL: member.user.displayAvatarURL({ dynamic: true, size: 64 })
            },
            thumbnail: {
                url: member.user.displayAvatarURL({ dynamic: true, size: 128 })
            },
            description: `⛔️ <@${member.user.id}> **left the server**`,
            fields: [{
                name: 'Time spent here',
                value: capitalizeFirstLetter(duration.fmt(new Date().getTime() - (member.joinedTimestamp ?? new Date().getTime())).toString())
            }],
            timestamp: new Date()
        }));
    } catch (error: unknown) {
        logger.error(error as Error);
    }
};

