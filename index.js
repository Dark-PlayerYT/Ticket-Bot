const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// === SIZIN GUNCEL BILGILERINIZ ===
const TOKEN = 'MTU1OTI1MTUzNjQ3Mzg4MjY3NA.GAgbE4.HdowwQkQWTT9lsBSZL_vfwQc9nECaZcx0A8jEY';
const KATEGORI_ID = '1559257267155509289';
const DEST_KANAL_ID = '1559256170311716885';
const YETKILI_ROL_ID = '1559259462923976744';

let ticketCounter = 1;

client.once('clientReady', () => {
    console.log(`BlueBull Pro Aktif: ${client.user.tag}`);
});

// 1. ADIM: DESTEK PANELINI KURMA KOMUTU (!setup-ticket)
client.on('messageCreate', async (message) => {
    if (message.content === '!setup-ticket' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const embed = new EmbedBuilder()
            .setTitle('\ud83d\udccc BlueBull Destek & Iletisim')
            .setDescription('Yetkililerimiz ile iletisime gecmek veya yardim almak icin asagidaki uygun butona tiklayarak ozel destek kanali acabilirsiniz.\n\n' +
                '\ud83d\udccc **Destek Kategorileri**\n' +
                '\ud83d\udce9 **Genel Destek** - Genel sorulariniz\n' +
                '\ud83d\udc8e **Erisim / Yetki** - Uygulama rol ve erisim talepleri\n' +
                '\u2753 **Teknik Yardim** - Kurulum ve hata destekleri\n' +
                '\ud83d\udcdd **Sikayet / Rapor** - Bildirim ve raporlamalar')
            .setColor(0x0099ff)
            .setFooter({ text: 'BlueBull Destek Sistemi', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_genel').setLabel('Genel Destek').setEmoji('\ud83d\udce9').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_yetki').setLabel('Erisim / Yetki').setEmoji('\ud83d\udc8e').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_teknik').setLabel('Teknik Yardim').setEmoji('\u2753').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_sikayet').setLabel('Sikayet / Rapor').setEmoji('\ud83d\udcdd').setStyle(ButtonStyle.Danger)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        if (message.deletable) await message.delete();
    }
});

// 2. ADIM: BUTON VE TICKET ISLEMLERI
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const { customId, user, guild } = interaction;

    // KATEGORI BUTONLARI (DIREKT TICKET ACMA)
    if (customId.startsWith('btn_')) {
        // Zaman asimini engellemek icin etkilesimi beklemeye aliyoruz
        await interaction.deferReply({ flags: 64 });

        let categoryName = 'Genel Destek';

        if (customId === 'btn_yetki') categoryName = 'Erisim / Yetki';
        if (customId === 'btn_teknik') categoryName = 'Teknik Yardim';
        if (customId === 'btn_sikayet') categoryName = 'Sikayet / Rapor';

        const ticketNum = ticketCounter++;
        const formattedNum = String(ticketNum).padStart(4, '0');
        const channelName = `ticket-${formattedNum}`;

        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: KATEGORI_ID,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles] },
                { id: YETKILI_ROL_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels] }
            ],
        });

        const ticketEmbed = new EmbedBuilder()
            .setTitle(`\ud83d\udce9 Destek Talebi #${formattedNum} - ${categoryName}`)
            .setDescription(`\ud83d\udc64 **Talep Sahibi:** ${user} ( \`${user.id}\` )\n` +
                `\ud83c\udff7\ufe0f **Kategori:** \ud83d\udce9 ${categoryName}\n\n` +
                `\u23f3 **Durum: Yetkilinin talebi ustlenmesi bekleniyor...**\n\n` +
                `\ud83d\udca1 *Lutfen sorununuzu ve talebinizin detaylarini yaziniz. Bir yetkili talebi ustlendiginde size yanit verecektir.*`)
            .setColor(0xF1C40F)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Talep #${formattedNum} • BlueBull Destek`, iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`claim_${formattedNum}`).setLabel('Talebi Ustlen').setEmoji('\ud83c\udfaf').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Talebi Kapat').setEmoji('\ud83d\udd12').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ content: `${user} | <@&${YETKILI_ROL_ID}>`, embeds: [ticketEmbed], components: [row] });
        await interaction.editReply({ content: `Destek talebiniz basariyla olusturuldu: ${ticketChannel}` });
    }

    // TALEBI USTLENME (CLAIM)
    if (customId.startsWith('claim_')) {
        const memberCheck = await interaction.guild.members.fetch(interaction.user.id);
        if (!memberCheck.roles.cache.has(YETKILI_ROL_ID) && !memberCheck.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'Bu talebi yalnizca yetkili ekibi ustlenebilir!', flags: 64 });
        }

        const ticketNum = customId.split('_')[1];

        const updatedRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claimed_disabled').setLabel(`${interaction.user.username} Ustlendi`).setEmoji('\ud83c\udfaf').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Talebi Kapat').setEmoji('\ud83d\udd12').setStyle(ButtonStyle.Danger)
        );

        await interaction.message.edit({ components: [updatedRow] });

        const claimEmbed = new EmbedBuilder()
            .setTitle('\ud83c\udfaf Destek Talebi Ustlenildi')
            .setDescription(`Bu destek talebini **${interaction.user.username}** ( ${interaction.user} ) ustlendi!\n\n` +
                `\ud83d\udcac *Artik talep sahibi ve ustlenen yetkili buradan mesajlasabilir.*`)
            .setColor(0x2ecc71)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Ustlenen Yetkili: ${interaction.user.username} • Talep #${ticketNum}`, iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [claimEmbed] });
    }

    // TALEBI KAPATMAA BASILDIGINDA ONAY SORMA
    if (customId === 'close_ticket') {
        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_close').setLabel('Evet, Kapat').setEmoji('\u2714\ufe0f').setStyle(ButtonStyle.Success), // Yesil renk
            new ButtonBuilder().setCustomId('cancel_close').setLabel('Iptal').setEmoji('\u2716\ufe0f').setStyle(ButtonStyle.Danger) // Kirmizi renk
        );

        await interaction.reply({ content: 'Bu destek talebini kapatmak istediginize emin misiniz?', components: [confirmRow] });
    }

    // ONAYLANIRSA (EVET, KAPAT)
    if (customId === 'confirm_close') {
        await interaction.update({ content: 'Bu destek talebi 5 saniye icerisinde kapatilip silinecektir...', components: [] });
        setTimeout(() => {
            if (interaction.channel) interaction.channel.delete().catch(() => {});
        }, 5000);
    }

    // IPTAL EDILIRSE (IPTAL)
    if (customId === 'cancel_close') {
        await interaction.message.delete().catch(() => {});
    }
});

client.login(TOKEN);